#!/usr/bin/env bash
set -e

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.dev.yml"

echo "STOPPING AND REMOVING CONTAINERS + VOLUMES"
$COMPOSE down -v

echo "REMOVING ALEMBIC VERSIONS (local files)"
rm -rf payments/alembic/versions/*
rm -rf merchants/alembic/versions/*
rm -rf providers/alembic/versions/*

echo "STARTING DOCKER COMPOSE"
$COMPOSE up -d --build

echo "WAITING FOR DATABASES..."
sleep 10

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
echo "================ PAYMENTS ================"
run_if_exists payments python -m seeders.seed_base_data

# =================================================
# MERCHANTS
# =================================================
echo "================ MERCHANTS ================"

run_if_exists merchants alembic stamp head
run_if_exists merchants alembic revision --autogenerate -m "initial merchants schema"
run_if_exists merchants alembic upgrade head
run_if_exists merchants python -m seeders.seed_products

# =================================================
# PROVIDERS
# =================================================
echo "================ PROVIDERS ================"

run_if_exists provider alembic stamp head
run_if_exists provider alembic revision --autogenerate -m "initial providers schema"
run_if_exists provider alembic upgrade head

# =================================================
# LARAVEL
# =================================================
echo "================ LARAVEL ================"

docker compose exec saas-laravel php artisan migrate:fresh
docker compose exec saas-laravel php artisan optimize:clear
docker compose exec saas-laravel npm run dev
# =================================================
# WORKERS INFO
# =================================================
echo ""
echo "Payments worker:"
echo "  - RabbitMQ consumer"
echo "  - listens to token.used / payment.* events"
echo ""
echo "To run worker manually:"
echo "  docker compose exec payments-worker python -m app.workers.payment_events"

echo ""
echo "DONE: clean rebuild, fresh schema, seeded databases."
