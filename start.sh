#!/usr/bin/env bash
set -e

COMPOSE="docker compose"
CLEAN=false

for arg in "$@"; do
  case $arg in
    --clean) CLEAN=true ;;
  esac
done

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
if [ "$CLEAN" = true ]; then
  echo "STOPPING AND REMOVING CONTAINERS + VOLUMES (--clean flag)"
  $COMPOSE down -v
  echo ""
  echo "REMOVING ALEMBIC VERSIONS (local files)"
  rm -rf payments/alembic/versions/*
else
  echo "STOPPING CONTAINERS (volumes preserved — use --clean to wipe data)"
  $COMPOSE down
fi

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

echo ""
echo "================ ADMIN LARAVEL ================"

if docker compose ps --services --status running | grep -q "^admin-laravel$"; then
  docker compose exec admin-laravel composer install --no-interaction
  docker compose exec admin-laravel php artisan key:generate --no-interaction
  docker compose exec admin-laravel php artisan db:seed --no-interaction
  docker compose exec admin-laravel npm install
  docker compose exec admin-laravel npm run build
  docker compose exec admin-laravel php artisan optimize:clear
else
  echo "Service admin-laravel not running, skipping..."
fi

echo ""
echo "DONE: clean rebuild, reference providers/plans seeded."
echo "Next: SaaS runs on http://localhost and admin runs on http://localhost:8083."
