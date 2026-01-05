#!/usr/bin/env bash
set -e

echo "Starting docker compose..."
docker compose up -d --build

echo "Waiting for containers..."
sleep 5

# -------------------------
# PAYMENTS
# -------------------------
echo "Payments: upgrading DB..."
docker compose exec payments alembic upgrade head

echo "Payments: generating Alembic revision..."
docker compose exec payments alembic revision --autogenerate -m "create core tables" || true

echo "Payments: upgrading DB..."
docker compose exec payments alembic upgrade head

echo "Payments: seeding base data..."
docker compose exec payments python -m app.seeders.seed_base_data

# -------------------------
# MERCHANTS
# -------------------------
echo "Merchants: upgrading DB..."
docker compose exec merchants alembic upgrade head

echo "Merchants: generating Alembic revision..."
docker compose exec merchants alembic revision --autogenerate -m "create products and orders tables" || true

echo "Merchants: upgrading DB..."
docker compose exec merchants alembic upgrade head

echo "Merchants: seeding products..."
docker compose exec merchants python -m seeders.seed_products

echo "All services are up, migrated, and seeded!"

# -------------------------
# PROVIDERS
# -------------------------
echo "Providers: upgrading DB..."
docker compose exec provider alembic upgrade head

echo "Providers: generating Alembic revision..."
docker compose exec provider alembic revision --autogenerate -m "create provider payments table" || true

echo "Providers: upgrading DB..."
docker compose exec provider alembic upgrade head

echo "All services are up, migrated, and seeded!"