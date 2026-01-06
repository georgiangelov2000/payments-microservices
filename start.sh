#!/usr/bin/env bash
set -e

echo "🚀 Starting docker compose..."
docker compose up -d --build

echo "⏳ Waiting for containers to be ready..."
sleep 8

# =================================================
# PAYMENTS
# =================================================
echo "🧾 Payments: upgrading DB..."
docker compose exec payments alembic upgrade head

echo "🧾 Payments: generating Alembic revision (if needed)..."
docker compose exec payments alembic revision --autogenerate -m "payments core tables" || true

echo "🧾 Payments: upgrading DB again..."
docker compose exec payments alembic upgrade head

echo "🌱 Payments: seeding base data..."
docker compose exec payments python -m seeders.seed_base_data

# =================================================
# MERCHANTS
# =================================================
echo "🧾 Merchants: upgrading DB..."
docker compose exec merchants alembic upgrade head

echo "🧾 Merchants: generating Alembic revision (if needed)..."
docker compose exec merchants alembic revision --autogenerate -m "merchant products and orders" || true

echo "🧾 Merchants: upgrading DB again..."
docker compose exec merchants alembic upgrade head

echo "🌱 Merchants: seeding products..."
docker compose exec merchants python -m seeders.seed_products

# =================================================
# PROVIDERS
# =================================================
echo "🧾 Providers: upgrading DB..."
docker compose exec provider alembic upgrade head

echo "🧾 Providers: generating Alembic revision (if needed)..."
docker compose exec provider alembic revision --autogenerate -m "provider payments table" || true

echo "🧾 Providers: upgrading DB again..."
docker compose exec provider alembic upgrade head

# =================================================
# WORKERS (INFO ONLY)
# =================================================
echo "⚙️ Payments worker:"
echo "   - RabbitMQ consumer"
echo "   - listens to payment.* events"
echo "   - forwards updates to merchants service"
echo ""
echo "   To run worker manually:"
echo "   docker compose exec payments-worker python -m app.workers.payment_events"

echo "✅ All services are up, migrated, and seeded successfully!"
