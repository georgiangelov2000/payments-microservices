# Payments Service ✅

FastAPI service responsible for payment lifecycle: creating payment rows, calling providers to generate payment links, maintaining subscription usage, and writing timeline/outbox logs for merchant notifications.

---

## 🔧 Features

- Create payments with subscription token enforcement and idempotency.
- Provider integration (synchronous POST to provider to obtain payment link).
- Outbox-style logging to `payment_logs` with a producer/consumer for merchant notifications via RabbitMQ.
- Pagination, show, and tracking endpoints for payments.
- Database schema managed with Alembic and seeding utilities for demo data.

---

## 🚀 Quick start

1. Copy environment variables into a `.env` or your orchestration system (see `.env.example`):

```env
LOGS_DB_URL=postgresql://webhook_api:strong_rw_password@payments-logs-db:5432/logs
PAYMENTS_DB_URL=postgresql://payments_api:strong_rw_password@payments-db:5432/payments

RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
EXCHANGE_NAME=payments
QUEUE_NAME=payments.merchant

PROVIDER_URL=http://providers:8000
MERCHANT_CALLBACK_URL=http://merchants:8000/api/v1/payments/update

REDIS_URL=redis://redis:6379/0
```

2. Install & run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# run migrations (example)
alembic upgrade head
# seed demo data
python seeders/seeders.py
# run service
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. Run with Docker

```bash
docker build -t payments-service .
docker run -e LOGS_DB_URL=... -e PAYMENTS_DB_URL=... -e RABBITMQ_URL=... -p 8000:8000 payments-service
```

---

## 📡 HTTP API

Base path: `/api/v1/payments`

- POST /api/v1/payments
  - Create a payment and call provider to generate a payment link.
  - Headers: `X-Merchant-Id: <merchant_id>` (required)
  - Body: JSON matching `CreatePaymentRequest` (order_id, amount, price, alias, subscription_id, event_id)
  - Responses:
    - Success: `{ payment_id, status: "PAYMENT_PENDING", payment_url }
    - 400 errors: provider not found / subscription not found / idempotency (already exists)
    - 502: provider unreachable or provider URL generation failed

- GET /api/v1/payments?page=&limit=
  - Returns paginated list for merchant (requires `X-Merchant-Id`).

- GET /api/v1/payments/{payment_id}/show
  - Returns payment details (requires `X-Merchant-Id` if used via gateway but route itself is public on this service).

- GET /api/v1/payments/{payment_id}/tracking
  - Returns timeline of events from `payment_logs` for the payment.

- GET /api/v1/payments/ping
  - Health / basic connectivity check (returns `{ "ok": true }`).

---

## 🧩 Background workers

- Producer: `app.workers.payments_producer:start_producer`
  - Scans `payment_logs` for events with `EVENT_MERCHANT_NOTIFICATION_SENT` and status `pending/retrying`, claims them, and publishes to RabbitMQ.

- Consumer: `app.workers.payments_consumer:main`
  - Consumes from the queue, calls `MERCHANT_CALLBACK_URL` with the payment DTO, and updates log statuses (success, retry, failed) with retry/backoff.

Run locally as:

```bash
python app/workers/payments_producer.py
python app/workers/payments_consumer.py
```

In production, run workers as separate long-running processes or containers.

---

## 🧪 Seeding & Migrations

- Migrations: use Alembic with `alembic upgrade head` (set `sqlalchemy.url` via env or `alembic.ini`).
- Seed demo data: `python seeders/seeders.py` — creates demo merchants, API keys, subscriptions, providers, and user subscriptions.

---

## ⚙️ Implementation notes

- DB models: `app.models.payments` and `app.models.logs`.
- Enums and constants in `app.enums`/`app.constants` define statuses and event types.
- Producer/Consumer implement an outbox pattern to ensure reliable delivery to merchants.
- Provider is called after DB commit; on provider errors the payment is marked failed (safe failure transition).

---

## 🐞 Troubleshooting

- Provider errors (502): verify `PROVIDER_URL` and provider health.
- Auth / tokens: the gateway applies API key checks and token decrement; confirm `UserSubscription` rows and tokens.
- RabbitMQ: ensure `RABBITMQ_URL`, `EXCHANGE_NAME`, and `QUEUE_NAME` match across services.
- Logs DB & Payments DB connectivity: check `LOGS_DB_URL` and `PAYMENTS_DB_URL` env vars.
- If messages are not delivered: check producer claims, `payment_logs` statuses, and RabbitMQ bindings.

---

## ✅ Contributing & tests

- Follow existing patterns (Pydantic schemas, SQLAlchemy sessions, idempotency checks).
- Add unit tests for `app.classes.payments.Payment` behavior (idempotency, subscription token handling, provider failure transitions).

---

## 📄 License

This module follows the repository license (see top-level `LICENSE`).

---

If you'd like, I can add example curl requests and a Postman collection for the main endpoints. 💡
