#!/usr/bin/env bash
set -e

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.dev.yml"

echo "Starting docker compose..."
$COMPOSE up -d --build

echo "Waiting for containers to be ready..."
sleep 8

run_if_exists () {
  SERVICE=$1
  shift
  if docker compose ps --services | grep -q "^${SERVICE}$"; then
    echo "Running on $SERVICE: $*"
    docker compose exec "$SERVICE" "$@" || true
  else
    echo "Service $SERVICE not running, skipping..."
  fi
}

# =================================================
# PAYMENTS
# =================================================
echo "PAYMENTS"

run_if_exists payments alembic upgrade head
run_if_exists payments alembic revision --autogenerate -m "payments core tables"
run_if_exists payments alembic upgrade head
run_if_exists payments python -m seeders.seed_base_data

# =================================================
# MERCHANTS
# =================================================
echo "MERCHANTS"

run_if_exists merchants alembic upgrade head
run_if_exists merchants alembic revision --autogenerate -m "merchant products and orders"
run_if_exists merchants alembic upgrade head
run_if_exists merchants python -m seeders.seed_products

# =================================================
# PROVIDERS
# =================================================
echo "PROVIDERS"

run_if_exists provider alembic upgrade head
run_if_exists provider alembic revision --autogenerate -m "provider payments table"
run_if_exists provider alembic upgrade head

# =================================================
# WORKERS (INFO)
# =================================================
echo "Payments worker:"
echo "   - RabbitMQ consumer"
echo "   - listens to payment.* events"
echo "   - forwards updates to merchants service"
echo ""
echo "   To run worker manually:"
echo "   docker compose exec payments-worker python -m app.workers.payment_events"

echo "Done. Environment is up, migrated, and seeded."
