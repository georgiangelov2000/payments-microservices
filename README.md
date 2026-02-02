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


## 🧠 Key Design Patterns (Used in This System)

This system intentionally applies several **well-known design and architectural patterns**, directly reflected in the codebase.

These patterns improve **security, scalability, resilience, and maintainability**.

---

### 🔐 API Gateway Pattern

**Where:**

* `Application Gateway` (Node.js / Express)
* NGINX SaaS Gateway

**How it’s used:**

* All external requests pass through a single entry point
* Authentication, validation, and routing are centralized
* Internal services are never exposed directly

**Why:**

* Decouples clients from internal services
* Enables consistent security and observability
* Allows internal services to evolve independently

---

### 🔁 Reverse Proxy Pattern

**Where:**

* NGINX (`proxy_pass`)
* Express Gateway (`proxy.web`)

**How it’s used:**

* Gateway forwards HTTP traffic to internal services
* Preserves request/response semantics
* No business logic duplication

**Why:**

* Enables transparent routing
* Simplifies service-to-service communication
* Supports zero-downtime migrations

---

### 🧯 Circuit Breaker Pattern

**Where:**

* Redis-based circuit breaker (`cb:payments`)

**How it’s used:**

* Failures are counted in Redis
* After a threshold, the circuit is opened
* Requests are rejected early (fail-fast)
* Circuit resets automatically via TTL

**Why:**

* Prevents cascading failures
* Protects downstream services
* Keeps latency predictable under failure

---

### 🚦 Rate Limiting Pattern

**Where:**

* NGINX `limit_req_zone`

**How it’s used:**

* Requests are limited per client IP
* Burst handling allows short traffic spikes
* Enforced at the edge (before application logic)

**Why:**

* Protects backend services
* Prevents abuse and brute-force attacks
* Reduces unnecessary load

---

### 🛡️ Defense-in-Depth Security Pattern

**Where:**

* NGINX headers & method restrictions
* Express Helmet middleware
* Internal signature verification
* API key hashing

**How it’s used:**

* Security is enforced at multiple layers
* Each layer assumes the previous one may fail

**Why:**

* No single point of failure
* Strong protection against request smuggling, spoofing, and abuse

---

### 🧾 Token-Based Authentication Pattern

**Where:**

* API key authentication with SHA-256 hashing
* Subscription & usage context resolution

**How it’s used:**

* API keys are never stored in plaintext
* Auth context includes:

  * merchant ID
  * subscription
  * token limits & usage

**Why:**

* Secure merchant identification
* Enables quota enforcement
* Scales well across services

---

### 🔄 Stateless Service Pattern

**Where:**

* Gateway
* Workers
* Microservices

**How it’s used:**

* No in-memory user or session state
* All state stored in Redis, PostgreSQL, or events

**Why:**

* Horizontal scalability
* Easy restarts & redeployments
* Cloud-native friendly

---

### 🧵 Middleware Pipeline Pattern

**Where:**

* Express middlewares (`helmet`, `requestId`, `authGet`, `authPost`)

**How it’s used:**

* Each middleware has a single responsibility
* Composable request processing chain

**Why:**

* Clean separation of concerns
* Easy to extend or replace
* Improves testability

---

### 🧩 Database-per-Service Pattern

**Where:**

* Separate PostgreSQL databases per domain

**How it’s used:**

* Each service owns its data
* No shared database schema

**Why:**

* Strong service isolation
* Independent migrations
* Reduced coupling

---

### 📬 Event-Driven Architecture (EDA)

**Where:**

* RabbitMQ
* Payments producers & consumers

**How it’s used:**

* Async communication between services
* Background processing decoupled from API requests

**Why:**

* Improves throughput
* Reduces request latency
* Enables scalable workflows

---

### 🔍 Request Tracing Pattern

**Where:**

* `requestId` middleware

**How it’s used:**

* Each request gets a unique ID
* Propagated across services

**Why:**

* Simplifies debugging
* Enables distributed tracing
* Improves observability

---

### 🧪 Health Check Pattern

**Where:**

* `/health` endpoints
* Docker healthchecks

**How it’s used:**

* Services expose liveness/readiness status
* Containers depend on healthy dependencies

**Why:**

* Safer startup sequencing
* Better monitoring & orchestration


## 🧠 Additional Design Patterns (Async & Reliability)

The async workers and messaging layer introduce additional **robustness and reliability patterns**, critical for distributed payment systems.

---

### 📬 Message Queue Pattern

**Where:**

* RabbitMQ (topic exchange `payments`)
* `payments-producer`
* `payments-consumer`

**How it’s used:**

* Events are published to a durable topic exchange
* Consumers subscribe using routing keys (`payment.*`)
* Messages are persisted (`DeliveryMode.PERSISTENT`)

**Why:**

* Decouples producers from consumers
* Allows independent scaling
* Prevents data loss during restarts

---

### 🔁 Producer–Consumer Pattern

**Where:**

* Producer: timeline / log-driven publisher
* Consumer: merchant notification worker

**How it’s used:**

* Producer scans DB and publishes eligible events
* Consumer processes events asynchronously
* Workload is distributed across consumers

**Why:**

* Improves throughput
* Keeps API requests fast
* Enables background retries and batching

---

### 🧾 Transactional Outbox Pattern (Log-Based)

**Where:**

* `PaymentLog` table
* Producer atomic `UPDATE … RETURNING`

**How it’s used:**

* Events are written to DB first
* Producer atomically claims pending rows
* Claimed rows are published to RabbitMQ

**Why:**

* Guarantees events are not lost
* Safe with multiple producers
* Eliminates race conditions

---

### 🔐 Atomic Claim / Work Stealing Pattern

**Where:**

* SQLAlchemy `UPDATE … RETURNING`

**How it’s used:**

* Multiple workers safely claim work
* Rows are transitioned to `PROCESSING`
* No locks or in-memory coordination needed

**Why:**

* Horizontal scaling of workers
* No duplicate processing
* Database acts as coordination point

---

### ♻️ Retry with Backoff Pattern

**Where:**

* Producer & consumer retry logic

**How it’s used:**

* Retry counters stored in DB
* `next_retry_at` schedules future attempts
* Delay increases deterministically
* Fail after configurable threshold

**Why:**

* Handles transient failures
* Prevents retry storms
* Keeps system stable under partial outages

---

### ❌ Dead-Letter / Terminal Failure Pattern

**Where:**

* `LOG_FAILED` status

**How it’s used:**

* After N failed attempts, event is marked failed
* No infinite retry loops
* Failure is explicitly recorded

**Why:**

* Prevents poison messages
* Enables manual inspection & recovery
* Improves operational visibility

---

### 🔂 Idempotency Pattern

**Where:**

* Merchant notification consumer

**How it’s used:**

* Success status is checked before processing
* Duplicate messages are ignored safely

**Why:**

* Safe message re-delivery
* Exactly-once *effect* over at-least-once delivery
* Critical for financial systems

---

### 🕒 Time-Based Scheduling Pattern

**Where:**

* `next_retry_at` logic

**How it’s used:**

* Events become eligible only after a timestamp
* Producer polls and selects ready items

**Why:**

* Simple scheduling without cron
* Fully database-driven
* Predictable retry behavior

---

### 🧠 Compensating Workflow Pattern

**Where:**

* Merchant notification flow

**How it’s used:**

* Failures are retried asynchronously
* Final failure is explicitly tracked
* No blocking of upstream flows

**Why:**

* Payments remain consistent
* External system failures are isolated
* Improves system resilience

---

### 🧪 At-Least-Once Delivery Semantics

**Where:**

* RabbitMQ + manual ACK handling

**How it’s used:**

* Messages are acknowledged only after processing
* Redelivery is possible on crashes

**Why:**

* Stronger reliability guarantees
* Required for financial event processing
