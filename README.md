# Payments Microservices

Local sandbox payment gateway for SaaS merchant onboarding and real Stripe/PayPal sandbox checkout.

## Active Local Stack

- `saas-laravel` — merchant registration, login, onboarding, API key generation, admin views.
- `saas-gateway` — nginx front for the SaaS app at `http://localhost`.
- `gateway` — public API nginx at `http://localhost:8080`.
- `gateway-verification` — API key auth, active merchant subscription checks, request context injection, proxy to payments.
- `payments` — FastAPI payment service with Stripe and PayPal sandbox connectors.
- `merchant-demo` — TechShop frontend at `http://localhost:3001`.
- `payments-db` — Postgres database for users, subscriptions, API keys, providers, payments, API request audit.
- `payments-logs-db` — Postgres database for payment timeline logs.
- `redis` — API key cache and circuit breaker state.
- `rabbitmq` — local message broker kept for gateway/payment event evolution.

## Removed Legacy Flow

The old mock provider and merchant simulation stack has been removed. Real local testing now uses hosted Stripe Checkout and PayPal Sandbox approval URLs.

## Main Flow

1. Open `http://localhost/register`.
2. Register a merchant.
3. Complete onboarding at `http://localhost/onboarding`.
4. Generate a gateway API key.
5. Create a Stripe or PayPal sandbox checkout.
6. Complete checkout on the provider sandbox page.
7. Provider redirects back to `http://localhost:8080/api/v1/payments/provider-return/...`.
8. The payments service marks the payment finished or failed.

## Public Payment API

```http
POST http://localhost:8080/api/v1/payments
X-Api-Key: <merchant_gateway_api_key>
Content-Type: application/json
```

```json
{
  "order_id": 123,
  "amount": 1,
  "price": "10.00",
  "alias": "stripe"
}
```

Use `"paypal"` for PayPal.

## Useful URLs

- SaaS app: `http://localhost`
- SaaS onboarding: `http://localhost/onboarding`
- TechShop demo: `http://localhost:3001`
- Payment API: `http://localhost:8080/api/v1/payments`
- RabbitMQ management: `http://localhost:15672`

## Rebuild

```bash
./start.sh
```

The rebuild seeds only reference subscription plans and provider rows. Merchants and API keys are created through the SaaS onboarding flow.
