# TechShop CMS

TechShop CMS is a separate containerized service for managing TechShop content and receiving completed-payment webhook events. It is intentionally independent from the `merchant-demo` storefront and can be run, restarted, or replaced without changing the main demo app.

## Run The CMS

1. Create the service env file:

   ```bash
   cp techshop-cms/.env.example techshop-cms/.env
   ```

2. Update secrets in `techshop-cms/.env`:

   ```env
   CMS_ADMIN_TOKEN=replace-with-local-admin-token
   CMS_WEBHOOK_SECRET=replace-with-provider-shared-secret
   CMS_PUBLIC_URL=http://localhost:3002
   ```

3. Start the service:

   ```bash
   docker compose up -d techshop-cms
   ```

4. Open the CMS:

   ```text
   http://localhost:3002
   ```

The service stores CMS content and received payments in the `techshop-cms-data` Docker volume.

## Environment Variables

| Variable | Description |
| --- | --- |
| `CMS_PORT` | Internal HTTP port. Defaults to `3002`. |
| `CMS_PUBLIC_URL` | Public URL used in docs/UI for callback generation. |
| `CMS_DATA_DIR` | Directory where content and payment events are stored. Defaults to `/data`. |
| `CMS_ADMIN_TOKEN` | Optional token required for admin write APIs via `x-cms-admin-token`. |
| `CMS_WEBHOOK_SECRET` | Shared HMAC secret for payment webhook verification. When set, signatures are required. |
| `WEBHOOK_MAX_SKEW_SECONDS` | Maximum allowed timestamp drift for signed webhook requests. Defaults to `300`. |
| `WEBHOOK_FORWARD_URL` | Optional URL where validated completed-payment events are forwarded. |
| `WEBHOOK_FORWARD_TOKEN` | Optional bearer token used when forwarding validated events. |
| `MERCHANT_DEMO_URL` | Storefront URL for service metadata. |
| `PAYMENT_GATEWAY_URL` | Payment gateway URL for service metadata. |

## Payment Completed Webhook

Configure this endpoint in the merchant/payment provider as the completed-payment webhook URL:

```text
POST http://localhost:3002/webhooks/payments/completed
```

For container-to-container callbacks from another service in this Compose network, use:

```text
http://techshop-cms:3002/webhooks/payments/completed
```

### Required Headers

```text
content-type: application/json
x-techshop-timestamp: <unix timestamp seconds>
x-techshop-signature: sha256=<hmac hex digest>
```

If `CMS_WEBHOOK_SECRET` is empty, signature verification is skipped for local development. Keep `CMS_WEBHOOK_SECRET` set outside local throwaway environments.

### Signature Format

Create the signature using HMAC-SHA256 over:

```text
<x-techshop-timestamp>.<raw JSON request body>
```

Example pseudo-code:

```js
const timestamp = Math.floor(Date.now() / 1000)
const body = JSON.stringify(payload)
const signature = 'sha256=' + hmacSha256(CMS_WEBHOOK_SECRET, `${timestamp}.${body}`)
```

### Expected Payload

The webhook accepts either a flat payment object or an envelope with a `payment` object. The payment must represent a completed payment using one of these statuses:

```text
completed, paid, succeeded, success, finished
```

Required payment fields:

| Field | Description |
| --- | --- |
| `payment_id` | Provider or payment-system payment ID. |
| `order_id` | Merchant order ID. |
| `amount` | Non-negative payment amount. |
| `currency` | Three-letter ISO currency code. |
| `status` | Completed status. |

Recommended fields:

| Field | Description |
| --- | --- |
| `event_id` | Unique provider event ID for traceability. |
| `event_type` | Use `payment.completed`. |
| `merchant_id` | Merchant identifier, defaults to `techshop`. |
| `merchant_name` | Merchant display name, defaults to `TechShop`. |
| `provider` | Provider alias such as `stripe`, `paypal`, or `sandbox`. |
| `completed_at` | ISO timestamp from the provider. |

### Example Request

```bash
body='{"event_id":"evt_1001","event_type":"payment.completed","payment":{"payment_id":"pay_9001","order_id":"TECH-1001","merchant_id":"techshop","merchant_name":"TechShop","amount":149.99,"currency":"USD","status":"completed","provider":"sandbox","completed_at":"2026-06-11T10:30:00Z"}}'
timestamp="$(date +%s)"
signature="sha256=$(printf '%s.%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "$CMS_WEBHOOK_SECRET" -binary | xxd -p -c 256)"

curl -i http://localhost:3002/webhooks/payments/completed \
  -H 'content-type: application/json' \
  -H "x-techshop-timestamp: $timestamp" \
  -H "x-techshop-signature: $signature" \
  --data "$body"
```

Successful responses return `202 Accepted`:

```json
{
  "ok": true,
  "stored": true,
  "forwarded": false,
  "payment_id": "pay_9001"
}
```

## Merchant Configuration

In the merchant or payment provider dashboard:

1. Create or edit the webhook destination.
2. Set the webhook URL to `https://<your-cms-host>/webhooks/payments/completed`.
3. Select only completed payment events when the provider supports event filtering.
4. Set the signing secret to the same value as `CMS_WEBHOOK_SECRET`.
5. Configure the provider to send `x-techshop-timestamp` and `x-techshop-signature`, or map its signature system to the documented HMAC format.
6. Send a test completed-payment event.
7. Confirm the event appears in the CMS dashboard at `https://<your-cms-host>/`.

If a provider uses its own signature header names or signed-payload format, add an adapter in `server.js` before `verifyWebhookSignature` rejects the request.

## PayFlow Webhook Compatibility

The local payment service dispatches merchant webhooks with these headers:

```text
content-type: application/json
x-payflow-event: payment.succeeded
x-payflow-signature: t=<unix timestamp seconds>,v1=<hmac hex digest>
x-payflow-delivery: <delivery uuid>
```

TechShop CMS accepts this format too. Configure the PayFlow merchant webhook URL to the internal Compose URL:

```text
http://techshop-cms:3002/webhooks/payments/completed
```

The `merchant_webhooks.secret` value in PayFlow must match `CMS_WEBHOOK_SECRET`.

## Clean Test Data

Remove the first stored CMS payment record with:

```bash
curl -X DELETE http://localhost:3002/api/payments/first \
  -H 'x-cms-admin-token: local-techshop-admin-token'
```
