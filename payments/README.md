# Payments Service

FastAPI service for the real local sandbox payment workflow.

## Responsibilities

- Create payment records.
- Validate provider aliases from the reference `providers` table.
- Enforce active merchant subscriptions.
- Create real sandbox checkout sessions/orders with Stripe and PayPal.
- Persist provider references and checkout URLs.
- Handle local provider return/cancel redirects.
- Record payment timeline logs in the logs database.

## Environment

```env
LOGS_DB_URL=postgresql://webhook_api:strong_rw_password@payments-logs-db:5432/logs
PAYMENTS_DB_URL=postgresql://payments_api:strong_rw_password@payments-db:5432/payments

RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
EXCHANGE_NAME=payments
QUEUE_NAME=payments.merchant

REDIS_URL=redis://redis:6379/0
PAYMENT_RETURN_BASE_URL=http://localhost:8080/api/v1/payments

STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key

PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
```

## Endpoints

- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `GET /api/v1/payments/{payment_id}/show`
- `GET /api/v1/payments/{payment_id}/tracking`
- `GET /api/v1/payments/provider-return/stripe`
- `GET /api/v1/payments/provider-return/stripe/cancel`
- `GET /api/v1/payments/provider-return/paypal`
- `GET /api/v1/payments/provider-return/paypal/cancel`
- `GET /api/v1/payments/ping`

## Seeding

```bash
python -m seeders.seeders
```

The seeder creates reference subscription plans and provider rows only.
Merchants and API keys are created by the SaaS onboarding flow.
