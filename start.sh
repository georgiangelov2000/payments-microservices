#!/usr/bin/env bash
set -e

COMPOSE="docker compose"

# =================================================
# ENV FILES
# =================================================
echo "ENSURING .env FILES EXIST"

find . -name ".env.example" | while read -r example; do
  env_file="$(dirname "$example")/.env"

  if [ ! -f "$env_file" ]; then
    echo "  → Creating $env_file"
    cp "$example" "$env_file"
  else
    echo "  ✓ $env_file already exists, skipping"
  fi
done

echo ""
# =================================================
# STOP & CLEAN
# =================================================
echo "STOPPING AND REMOVING CONTAINERS + VOLUMES"
$COMPOSE down -v

echo ""
# =================================================
# CLEAN ALEMBIC
# =================================================
echo "REMOVING ALEMBIC VERSIONS (local files)"
rm -rf payments/alembic/versions/*
rm -rf merchants/alembic/versions/*
rm -rf providers/alembic/versions/*

echo ""
# =================================================
# START DOCKER
# =================================================
echo "STARTING DOCKER COMPOSE"
$COMPOSE up -d --build

echo ""
# =================================================
# WAIT
# =================================================
echo "WAITING FOR DATABASES..."
sleep 10

# =================================================
# HELPERS
# =================================================
run_if_exists () {
  SERVICE=$1
  shift

  if docker compose ps --services --status running | grep -q "^${SERVICE}$"; then
    echo "Running on $SERVICE: $*"
    docker compose exec "$SERVICE" "$@" || true
  else
    echo "Service $SERVICE not running, skipping..."
  fi
}

# =================================================
# PAYMENTS
# =================================================
echo ""
echo "================ PAYMENTS ================"
run_if_exists payments python -m seeders.seeders

# =================================================
# MERCHANTS
# =================================================
echo ""
echo "================ MERCHANTS ================"
run_if_exists merchants python -m seeders.seeders

# =================================================
# PROVIDERS
# =================================================
echo ""
echo "================ PROVIDERS ================"

run_if_exists providers alembic stamp head
run_if_exists providers alembic revision --autogenerate -m "initial providers schema"
run_if_exists providers alembic upgrade head

# =================================================
# LARAVEL
# =================================================
echo ""
echo "================ LARAVEL ================"

if docker compose ps --services --status running | grep -q "^saas-laravel$"; then
  docker compose exec saas-laravel composer install --no-interaction
  docker compose exec saas-laravel php artisan key:generate --no-interaction
  docker compose exec saas-laravel npm install
  docker compose exec saas-laravel npm run build
  docker compose exec saas-laravel php artisan optimize:clear
else
  echo "Service saas-laravel not running, skipping..."
fi

# =================================================
# CREDENTIALS FILE
# =================================================
echo ""
echo "================ CREDENTIALS ================"

CREDS_SRC="payments/credentials.txt"

if [ -f "$CREDS_SRC" ]; then
  cp "$CREDS_SRC" ./credentials.txt
  echo ""
  echo "Saved to: $(pwd)/credentials.txt"
  echo ""
  cat ./credentials.txt
  echo ""
  # Populate merchant-demo API key automatically
  FIRST_KEY=$(grep "API Key" ./credentials.txt | head -1 | awk -F': ' '{print $2}')
  if [ -n "$FIRST_KEY" ]; then
    sed -i.bak "s|^MERCHANT_API_KEY=.*|MERCHANT_API_KEY=$FIRST_KEY|" merchant-demo/.env
    rm -f merchant-demo/.env.bak
    echo "merchant-demo/.env updated with API key: $FIRST_KEY"
    echo "Recreating merchant-demo to apply new API key..."
    $COMPOSE up -d --force-recreate --no-deps merchant-demo
  fi
else
  echo "No new credentials generated (merchants already existed or seeder skipped)."
fi

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
