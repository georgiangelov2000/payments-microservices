# Payments Microservices – Seeders Guide

This project uses Docker Compose and multiple services.  
Some base data (providers, merchants, API keys, products) must be seeded manually.

---

## Prerequisites

- Docker
- Docker Compose

Make sure all containers are running:

```bash
docker compose up -d
docker exec -it merchants alembic revision --autogenerate -m "create products and orders tables"
docker exec -it merchants alembic upgrade head
docker exec -it payments alembic revision --autogenerate -m "create core tables"
docker exec -it payments alembic upgrade head
docker exec -it payments python app/seeders/seed_base_data.py
docker exec -it merchants python seeders/seed_products.py
docker exec -it payments-db psql -U payments -d payments
SELECT * FROM providers;
SELECT * FROM merchants;
SELECT * FROM merchant_api_keys;
SELECT * FROM payments;
\q
docker exec -it merchants-db psql -U merchants -d merchants
SELECT * FROM products;
SELECT * FROM orders;
\q
