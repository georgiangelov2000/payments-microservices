# Payments Microservices – Setup & Seeders Guide

This project consists of multiple microservices orchestrated using **Docker Compose**.  
Some **base data** (providers, merchants, API keys, products) must be seeded manually after the infrastructure is running.

---

## Prerequisites

Make sure you have the following installed:

- Docker
- Docker Compose

---

## Start the Infrastructure

Start all services:

```bash
./start.sh
```

Verify that all containers are running:

```bash
docker ps
```

---

## Database Migrations

### Merchants Service

Generate and apply migrations:

```bash
docker compose exec -it merchants python -m seeders.seeders
```

---

### Payments Service

Generate and apply migrations:

```bash
docker compose exec -it payments python -m seeders.seeders
```

---

### Provider Service

Generate and apply migrations:

```bash
docker compose exec -it providers python -m seeders.seeders
```

---


## Seed Base Data

### Payments Service Seeders

Seeds:
- Providers
- Merchants
- API keys

```bash
docker compose exec -it payments python -m seeders.seeders
```

---

### Merchants Service Seeders

Seeds:
- Products

```bash
docker compose exec -it merchants python -m seeders.seeders
```


## Verify Seeded Data

### Payments Database

```bash
docker compose exec -it payments-db psql -U payments -d payments
```

```sql
SELECT * FROM providers;
SELECT * FROM merchants;
SELECT * FROM merchant_api_keys;
SELECT * FROM payments;
```

Exit:
```sql
\q
```

---

### Merchants Database

```bash
docker compose exec -it merchants-db psql -U merchants -d merchants
```

```sql
SELECT * FROM products;
SELECT * FROM orders;
```

Exit:
```sql
\q
```

---

## RabbitMQ

### Management UI
```
http://localhost:15672
```

**Credentials**
```
username: guest
password: guest
```

### AMQP Connection
```
amqp://guest:guest@rabbitmq:5672/
```

### Ports

| Port  | Purpose |
|------|--------|
| 5672 | AMQP |
| 15672 | Management UI |

---

## Service Endpoints

| Service | URL |
|------|----|
| Payments API | http://localhost:8000 |
| Merchants API | http://localhost:8001 |

---

## Internal Docker Network (Reference)

| Service | Hostname | Port |
|------|---------|------|
| Payments | `payments` | 8000 |
| Merchants | `merchants` | 8000 |
| RabbitMQ | `rabbitmq` | 5672 |

---

## Useful Commands

Stop all services:
```bash
docker compose down
```

Rebuild containers:
```bash
docker compose up -d --build
```

---

## Notes

- Migrations must be executed **before** seeders
- Seeders are **idempotent** (safe to re-run)
- Internal service communication uses **Docker service names**, not `localhost`

---

Merchant: Demo Merchant | Email: demo@example.com | Password: ChangeMe123!
Merchant: Test Merchant | Email: test@example.com | Password: ChangeMe123!
Merchant: Sample Merchant | Email: sample@example.com | Password: ChangeMe123! | API key: 3:1767972565
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
docker compose \
  -f docker-compose.dev.yml \
  -f docker-compose.yml \
  up -d --build payments


for i in {1..100}; do
  curl -s -X POST http://localhost:8001/api/v1/orders \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: 1:1769015904" \
    -d '{
      "product_id": 1,
      "amount": 1,
      "alias": "paypal"
    }' > /dev/null
done
