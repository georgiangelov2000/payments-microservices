# 💳 Payments Microservices – Setup & Seeders Guide

This project consists of multiple microservices orchestrated using **Docker Compose**.  
Some **base data** (providers, merchants, API keys, products) must be seeded manually after the infrastructure is running.

---

## 📦 Prerequisites

Make sure you have the following installed:

- Docker
- Docker Compose

---

## 🚀 Start the Infrastructure

Start all services:

```bash
docker compose up -d
```

Verify that all containers are running:

```bash
docker ps
```

---

## 🗄️ Database Migrations

### Merchants Service

Generate and apply migrations:

```bash
docker exec -it merchants alembic revision --autogenerate -m "create products and orders tables"
docker exec -it merchants alembic upgrade head
```

---

### Payments Service

Generate and apply migrations:

```bash
docker exec -it payments alembic revision --autogenerate -m "create core tables"
docker exec -it payments alembic upgrade head
```

---

## 🌱 Seed Base Data

### Payments Service Seeders

Seeds:
- Providers
- Merchants
- API keys

```bash
docker exec -it payments python app/seeders/seed_base_data.py
```

---

### Merchants Service Seeders

Seeds:
- Products

```bash
docker exec -it merchants python seeders/seed_products.py
```

---

## 🔍 Verify Seeded Data

### Payments Database

```bash
docker exec -it payments-db psql -U payments -d payments
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
docker exec -it merchants-db psql -U merchants -d merchants
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

## 🐰 RabbitMQ

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

## 🌐 Service Endpoints

| Service | URL |
|------|----|
| Payments API | http://localhost:8000 |
| Merchants API | http://localhost:8001 |

---

## 🔗 Internal Docker Network (Reference)

| Service | Hostname | Port |
|------|---------|------|
| Payments | `payments` | 8000 |
| Merchants | `merchants` | 8000 |
| RabbitMQ | `rabbitmq` | 5672 |

---

## 🧹 Useful Commands

Stop all services:
```bash
docker compose down
```

Rebuild containers:
```bash
docker compose up -d --build
```

---

## 📌 Notes

- Migrations must be executed **before** seeders
- Seeders are **idempotent** (safe to re-run)
- Internal service communication uses **Docker service names**, not `localhost`

---
