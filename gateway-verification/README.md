# Gateway Verification ✅

Lightweight API gateway used for authentication, proxying requests to Payments, and verifying internal webhooks.

---

## 🔧 Features

- API key-based authentication for GET/POST requests (via `x-api-key`).
- Rate/quota enforcement (tokens) and Redis caching for API keys.
- Proxies client requests to the Payments service (`PAYMENTS_URL`).
- Internal webhook endpoint with HMAC SHA256 signature verification (`x-internal-signature`).
- Circuit breaker for payment creation availability.
- Health endpoint checks Redis and Postgres connectivity.

---

## 🚀 Quick start

1. Copy and fill environment variables (use your preferred method — `.env`, Docker compose, etc):

```env
PORT=3000
PAYMENTS_URL=https://payments.example
WEBHOOK_URL=https://webhook-receiver.example
INTERNAL_WEBHOOK_SECRET=your_secret_here
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://host:6379
```

> Note: The repository contains `.env.example` (empty here) — populate it with the variables above.

2. Run locally

```bash
cd gateway-verification/app
npm install
npm run dev    # development with nodemon
# or
npm start      # run node index.js
```

3. Or build/run with Docker

```bash
# from gateway-verification root
docker build -t gateway-verification -f Dockerfile .
docker run -e PORT=3000 -e PAYMENTS_URL=... -e REDIS_URL=... -e DATABASE_URL=... -p 3000:3000 gateway-verification
```

> The provided Dockerfile uses `node:20-alpine` and runs `npm run dev` by default.

---

## 📡 Endpoints

Base path: `/api/v1/payments`

- POST /api/v1/payments
  - Purpose: Create payment (proxied to `${PAYMENTS_URL}/api/v1/payments`).
  - Headers: `x-api-key: <api-key>` (required), `Content-Type: application/json`.
  - Middleware: `authPost` (validates API key, decrements tokens, injects `x-merchant-id`, adds `subscription_id` and `event_id` to body).
  - Circuit breaker: may return 503 `payments_unavailable` when downstream is unhealthy.

- GET /api/v1/payments?page=&limit=
  - Purpose: List payments (paginated). Requires `x-api-key`.

- GET /api/v1/payments/:id/show
  - Purpose: Show payment details. Requires `x-api-key`.

- GET /api/v1/payments/:id/tracking
  - Purpose: Payment timeline tracking. Requires `x-api-key`.

- POST /api/v1/payments/webhook
  - Purpose: Forward internal webhooks to `WEBHOOK_URL`.
  - Security: validates `x-internal-signature` header. If missing or invalid → 403 `{ error: "invalid_signature" }`.
  - Signature: HMAC SHA-256 of the raw request body (hex) using `INTERNAL_WEBHOOK_SECRET`.

- GET /health
  - Returns `200` when Redis and Postgres are reachable, otherwise `503`.

---

## 🔐 Authentication & headers

- `x-api-key` — required for the client-facing endpoints. Validated against Postgres and cached in Redis.
- `x-merchant-id` — injected by the gateway after successful auth.
- `x-internal-signature` — required for internal webhook requests (HMAC SHA256 hex of raw body with `INTERNAL_WEBHOOK_SECRET`).
- `X-Request-ID` — generated per-request and set in responses for tracing.

---

## ⚠️ Common responses / errors

The gateway forwards or returns structured errors. Important ones:

- 503 `{ error: "payments_unavailable" }` — circuit open (payment service temporarily unavailable)
- 502 `{ error: "payments_unreachable" }` — proxy failure to payments service
- 401 `{ error: "unauthorized" }` / 401 `{ error: "invalid api key" }` — auth failures
- 429 `{ error: "quota_exceeded" }` — no tokens left for subscription
- 403 `{ error: "invalid_signature" }` — webhook signature invalid

---

## 🧰 Implementation notes

- Proxy: uses `http-proxy` and forwards JSON bodies for POST requests.
- Auth: `apiAuth` queries Postgres (merchant_api_keys + user_subscriptions + subscriptions), calculates API key SHA256 hash for lookup, and returns subscription context.
- Caching: API key results and token counters stored in Redis with TTLs.
- Webhook verification: `verifyInternalSignature` uses `crypto.timingSafeEqual` to compare HMACs safely.

---

## 🐞 Troubleshooting

- Health check failing:
  - Verify `REDIS_URL` and `DATABASE_URL` are correct and reachable from the container.
- Auth failures (401/429):
  - Confirm API key exists in DB and that `subscriptions.tokens` is sufficient.
  - Check Redis keyspace for `api_key:<key>` and `sub:<id>:tokens` values.
- Webhook 403:
  - Ensure `INTERNAL_WEBHOOK_SECRET` matches the sender and that the sender computes HMAC over the raw body (hex encoded).
- Check logs (stdout) — the app prints auth and gateway errors.

---

## 🧩 Contributing

- Follow existing patterns: ES modules, small focused middleware, and clear error responses.
- Run `npm run dev` while developing to reload on file changes.

---

## 📄 License

This module follows the repository license (see top-level `LICENSE`).

---

If you'd like, I can also add example curl commands or Postman collection snippets for all endpoints. 💡
