# Gateway Verification

Application gateway for the local sandbox flow.

## Responsibilities

- Validate merchant `x-api-key` values against the payments database.
- Enforce active merchant subscription access.
- Inject merchant context into payment requests.
- Proxy payment API requests to the `payments` service.
- Apply a Redis-backed circuit breaker for payment creation.

## Environment

```env
PORT=3000
PAYMENTS_URL=http://payments:8000
DATABASE_URL=postgresql://payments_api:strong_rw_password@payments-db:5432/payments
REDIS_URL=redis://redis:6379/0
```

## Endpoints

- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `GET /api/v1/payments/:id/show`
- `GET /api/v1/payments/:id/tracking`
- `GET /api/v1/payments/provider-return/stripe`
- `GET /api/v1/payments/provider-return/stripe/cancel`
- `GET /api/v1/payments/provider-return/paypal`
- `GET /api/v1/payments/provider-return/paypal/cancel`
- `GET /health`
