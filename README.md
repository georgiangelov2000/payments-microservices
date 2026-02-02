# 🧩 Payments Microservices – Development Environment

This repository contains a **Docker Compose–based development environment** for a microservices architecture that manages payments, merchants, providers, SaaS platform, gateways, and background workers.

The setup is optimized for **local development**, **clean rebuilds**, and **fast iteration**.

---

## 🏗️ Architecture Overview

```
Clients / Frontend
        |
        v
 ┌────────────────────┐
 │  Merchants         │  (PYTHON)
 └─────────┬──────────┘
           v        
 ┌────────────────────┐
 │  SaaS Gateway      │  (NGINX)
 └─────────┬──────────┘
           v
 ┌────────────────────┐
 │ Application Gateway│  (Node.js / Express)
 └─────────┬──────────┘
           v
 ┌─────────────────────────────────────┐
 │ Microservices                       │
 │  - Payments (FastAPI)               │
 │  - Providers (FastAPI)              │
 │  - Webhook (FastAPI)                │
 └─────────┬──────────┬─────────┬──────┘
           v          v         v
     PostgreSQL   RabbitMQ    Redis

 ┌─────────────────────────────────────┐
 │ Third party service                 │
 │  - Providers (FastAPI)              │
 └─────────┬──────────┬─────────┬──────┘

```

---

## 🧱 Services Breakdown

### 🔌 Third-party Infrastructure

#### RabbitMQ

* Message broker for asynchronous communication
* Used by payments producers & consumers
* Management UI:

  ```
  http://localhost:15672
  ```

#### Redis

* Used for:

  * circuit breaker
  * caching
  * counters / rate-limiting
* Non-persistent (development only)

---

### 🗄️ Databases (PostgreSQL 15)

Each domain has **its own isolated database** (Database-per-Service pattern).

| Domain    | Container          | Purpose            |
| --------- | ------------------ | ------------------ |
| Payments  | `payments-db`      | Payments core data |
| Providers | `providers-db`     | Providers domain   |
| Merchants | `merchants-db`     | Merchants domain   |
| Logs      | `payments-logs-db` | Webhook & logs     |

All databases:

* use `.env` files for credentials
* load initial SQL from `/init-db`
* expose healthchecks via `pg_isready`

---

### 🚪 Gateways

#### Application Gateway

* Node.js / Express
* Implements **API Gateway pattern**
* Responsibilities:

  * authentication (GET / POST separation)
  * request validation
  * circuit breaker (Redis)
  * reverse proxy to internal services
* Exposed on:

  ```
  http://localhost:8080
  ```

#### SaaS Gateway (NGINX)

* Front-facing gateway
* Routes traffic to Laravel SaaS
* Exposed on:

  ```
  http://localhost
  ```

#### Gateway Verification

* Internal verification service
* Used for validating internal requests and webhooks

---

### 🧩 SaaS Platform

#### Laravel SaaS

* Main SaaS application
* Handles UI, users, subscriptions
* Ports:

  * `8000` – Laravel backend
  * `5173` – Vite frontend

---

### ⚙️ Core Microservices

#### Payments Service

* FastAPI
* Core payment processing logic
* Depends on:

  * RabbitMQ
  * Redis
  * Payments database
* Runs with hot reload for development

#### Merchants Service

* FastAPI
* Manages merchants domain
* Uses isolated merchants database

#### Providers Service

* FastAPI
* Integrates external payment providers

#### Webhook Service

* FastAPI
* Receives and validates provider webhooks
* Stores logs in payments-logs database

---

### 🔄 Background Workers

#### Payments Consumer

* Consumes RabbitMQ events
* Processes async payment workflows

#### Payments Producer

* Emits async events
* Used for background operations

Workers are **stateless** and can be scaled horizontally.

---

## 🔐 Environment Variables

Each service uses a local `.env` file.

Example:

```
payments/.env.example → payments/.env
```

A bootstrap script can automatically create missing `.env` files from `.env.example`.

⚠️ **Never commit real secrets to the repository.**

---

## ▶️ Running the Stack

### Start all services

```bash
chmod +x ./start.sh
./start.sh
```

### Stop and clean everything (including volumes)

```bash
chmod +x ./stop.sh
./start.sh
```

---

## 🧪 Useful Commands

### Connect to databases

```bash
docker compose exec merchants-db psql -U merchants merchants
docker compose exec payments-db psql -U payments payments
docker compose exec providers-db psql -U providers providers
```

### List running services

```bash
docker compose ps
```

### View logs

```bash
docker compose logs -f payments
```

---

## 🧠 Design Principles

* Microservices per domain
* Database-per-service
* Stateless services
* API Gateway pattern
* Circuit Breaker (Redis)
* Async messaging (RabbitMQ)

---

## 🚧 Development Notes

* This setup is **for development only**
* Not production-hardened
* Production requires:

  * secrets management
  * TLS
  * monitoring & alerting
  * persistent volumes
  * scaling policies

---

## ✅ Summary

This Docker Compose setup provides a **complete local microservices ecosystem**, allowing you to:

* develop services independently
* test async event flows
* reset databases easily
* iterate fast with minimal setup

---

## 🌐 API Endpoints Overview

All external traffic goes through the **Application Gateway**.
Internal services are **not exposed directly**.

Base URL (local development):

```
http://localhost:8080
```

---

### 🚪 Application Gateway – Public API

#### Payments

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| POST   | `/api/v1/payments`              | Create a new payment            |
| GET    | `/api/v1/payments`              | List payments (paginated)       |
| GET    | `/api/v1/payments/:id/show`     | Get payment details             |
| GET    | `/api/v1/payments/:id/tracking` | Get payment timeline / tracking |

Notes:

* `POST` requests require **authenticated merchant signature**
* `GET` requests use **read-only authentication**
* Circuit breaker is applied on write operations

---

### 🔁 Webhooks (Internal / Providers)

#### Payments Webhook

| Method | Endpoint                   | Description                     |
| ------ | -------------------------- | ------------------------------- |
| POST   | `/api/v1/payments/webhook` | Receive provider payment events |

Security:

* Internal signature verification
* Raw request body validation
* Requests without valid signature are rejected (`403`)

---

### 🧩 Internal Microservices (Private)

> These endpoints are **not exposed publicly** and are accessed only via the gateway.

#### Payments Service

```
/api/v1/payments
```

* Handles payment lifecycle
* Emits async events to RabbitMQ
* Persists payment state in Payments DB

#### Merchants Service

```
/api/v1/merchants
```

* Manages merchants
* API keys & permissions
* Subscription limits

#### Providers Service

```
/api/v1/providers
```

* Provider configurations
* Provider availability
* Provider-specific metadata

#### Webhook Service

```
/api/v1/webhooks
```

* Stores webhook payloads
* Audit & troubleshooting
* Writes to payments-logs database

---

### 🩺 Health Checks

All services expose a health endpoint:

```
GET /health
```

Used for:

* container healthchecks
* readiness probes
* local debugging

---

### 🔐 Authentication Summary

| Type               | Used For                  |
| ------------------ | ------------------------- |
| HMAC / API Key     | Merchant write requests   |
| Internal Signature | Webhooks & internal calls |
| Request ID         | Tracing & observability   |

---

### 🧠 Routing Rule (Simplified)

```
Client
  → SaaS Gateway (NGINX)
    → Application Gateway
      → Internal Service
```

Direct access to microservices is intentionally blocked.
