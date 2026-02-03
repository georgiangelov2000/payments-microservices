# Webhook Service ✅

Small FastAPI service that receives provider webhooks for Payments, updates payment records, and creates timeline logs for merchant notifications.

---

## 🔧 Features

- Single webhook endpoint: accepts provider notifications for payment status updates.
- Idempotent processing (skips already finished/failed payments).
- Persists changes to the Payments DB and writes logs to the Logs DB (outbox-style entries).
- Validates input using Pydantic schemas.

---

## 🚀 Quick start

1. Create and populate environment variables (see `.env.example`):

```env
LOGS_DB_URL=postgresql://webhook_api:password@host:5432/logs
PAYMENTS_DB_URL=postgresql://payments_api:password@host:5432/payments
```

## 📡 Endpoint

- POST /api/v1/payments/webhook
  - Content-Type: application/json
  - Body schema (`PaymentWebhookRequest`):
    - `payment_id` (int, > 0) — ID of the payment to update
    - `status` (string) — provider status (e.g., `finished`)
  - Optional header: `x-provider-signature` (accepted by the handler; currently not validated by the service)

Behavior:
- Looks up payment by `payment_id`. If not found → returns result: `{"message":"payment not found"}`.
- If payment is already in terminal state (`finished` or `failed`) → returns `{"message":"already processed","status": <status>}`.
- If `status == "finished"` → sets payment status to **finished**; otherwise sets to **failed**.
- Inserts a provider webhook log (event type) and creates one merchant notification log (status `pending`) for downstream processing.
- Returns JSON in the form `{ "status": "ok", "result": <details> }`.

Examples of possible `result` objects:

- Payment updated: `{"message":"payment updated","payment_id":123,"status":2}`
- Not found: `{"message":"payment not found"}`
- Already processed: `{"message":"already processed","status":2}`

---

## 🧩 Implementation notes

- FastAPI + Pydantic for request validation.
- SQLAlchemy sessions: `PaymentsSessionLocal` (payments DB) and `LogsSessionLocal` (logs DB).
- Business logic lives in `app.classes.webhook.Webhook.handle` (idempotency, updates, logs, DTO creation).
- The service creates a `WebhookDTO` object (in `app.dto.webhook`) to represent the merchant notification payload.

---

## 🐞 Troubleshooting

- 500 / DB errors: confirm `PAYMENTS_DB_URL` and `LOGS_DB_URL` are reachable and credentials are correct.
- Payment not found: ensure the payment row exists in the Payments DB and that the `payment_id` was provided and valid (> 0).
- No signature validation: `x-provider-signature` is accepted by the endpoint but is not validated by the service (placeholder) — if you need signature verification, add the verification logic in `Webhook.handle`.
- Check application logs and DB logs for SQL errors or transaction rollbacks.

---

## ✅ Contributing & testing

- Follow existing patterns (Pydantic models, SQLAlchemy sessions).
- Run the service locally with `uvicorn` and write tests for the handler to cover idempotency, success/failure transitions, and DB log creation.

---