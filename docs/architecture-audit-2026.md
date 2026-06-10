# PayFlow Payments Microservices — Architecture Report

**Date:** 2026-06-09
**Scope:** Full-stack audit covering saas-laravel, admin-laravel, Python payments service, frontend surfaces, database schema, and infrastructure/gateway layer.

---

## 1. System Overview

### Business Context

PayFlow is a multi-tenant SaaS payments orchestration platform. Merchants integrate via API to create payments routed intelligently across Stripe and PayPal. The platform provides: multi-strategy provider routing (priority, weighted, conditional rules), circuit-breaker-backed provider health monitoring, per-merchant webhook delivery, API key lifecycle management, subscription billing tiers, and an admin back-office for platform operators.

### Service Map

```
External Client (x-api-key)
        │
        ▼
┌──────────────────────────────────────────────────────┐
│  nginx gateway (port 8080)                           │
│  Rate limiting: 20r/s burst 40                       │
│  Security headers, method restriction                │
└──────────────────┬───────────────────────────────────┘
                   │ /api/
                   ▼
┌──────────────────────────────────────────────────────┐
│  gateway-verification (Node.js/Express, port 3000)   │
│  HMAC-SHA256 API key auth                            │
│  Redis cache (15-min TTL) → PostgreSQL fallback      │
│  Route + provider allowlist enforcement              │
│  Circuit breaker (Redis, 5-failure / 30s window)     │
│  Injects x-merchant-id + subscription_id             │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  Python FastAPI payments service (port 8000)         │
│  Payment creation, routing engine, failover          │
│  Provider integrations: Stripe, PayPal               │
│  Webhook dispatch, provider callbacks                │
│  Writes: payments-db, payments-logs-db               │
│  Reads: merchant_webhooks, routing config (shared DB)│
└──────────────────────────────────────────────────────┘

┌─────────────────────────────┐   ┌────────────────────────────┐
│  saas-gateway (nginx, :80)  │   │  admin-gateway (nginx, :8083│
│  → saas-laravel:9000        │   │  → admin-laravel:9000       │
│  Merchant SaaS dashboard    │   │  Admin back-office          │
└─────────────────────────────┘   └────────────────────────────┘

┌─────────────────────────────┐   ┌────────────────────────────┐
│  payments-db (PostgreSQL 15)│   │  payments-logs-db (PG 15)  │
│  Main operational data      │   │  payment_logs only         │
└─────────────────────────────┘   └────────────────────────────┘

┌─────────────────────────────┐   ┌────────────────────────────┐
│  Redis                      │   │  RabbitMQ (port 15672)     │
│  Gateway auth cache         │   │  Connected but unused      │
│  Circuit breaker state      │   │                            │
│  Laravel sessions/queues    │   │                            │
└─────────────────────────────┘   └────────────────────────────┘

┌─────────────────────────────┐   ┌────────────────────────────┐
│  public-site (nginx, :8082) │   │  merchant-demo (nginx,:3001│
│  Static marketing/login     │   │  Demo React frontend        │
└─────────────────────────────┘   └────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| API Gateway | nginx:alpine + Node.js/Express |
| Payments Service | Python 3.12, FastAPI, SQLAlchemy, uvicorn |
| SaaS Dashboard | Laravel 12, PHP-FPM, Inertia.js v2 + React 18 |
| Admin Back-office | Laravel 12, PHP-FPM, Inertia.js v2 + React 18 |
| Frontend Build | Vite, Tailwind CSS v3, @xyflow/react |
| Databases | PostgreSQL 15 (payments-db + payments-logs-db) |
| Cache/Queue | Redis |
| Messaging | RabbitMQ (declared, not used) |
| Container | Docker Compose |

---

## 2. Current Architecture Assessment

### What Is Working Well

**Strong patterns to preserve:**

1. **Thin controller pattern (saas-laravel PaymentController, ApiKeyController)** — Final classes with single injected service, FormRequest validation, 10–20 lines per action. This is the gold standard for the entire codebase.

2. **Service → Repository → Builder query composition** — The ApiKey and Payment domains in saas-laravel demonstrate this correctly. The Builder classes (ApiKeysBuilder, PaymentsBuilder) compose fluent queries cleanly.

3. **Repository contracts (Interfaces)** — PaymentRepositoryInterface, ApiKeyRepositoryInterface, SubscriptionRepositoryInterface are bound in AppServiceProvider. Dependency inversion is in place where it has been applied.

4. **Multi-strategy routing engine (Python)** — The routing engine is well-structured: priority chain, weighted distribution (deterministic hash), and condition-based rules are clearly separated. Circuit-breaker integration is present.

5. **DomainException boundary at controllers** — admin-laravel RoutingController.publishWorkflow() catches `\DomainException` from the service layer and converts to HTTP response. This pattern correctly decouples domain errors from transport.

6. **Async job dispatch (saas-laravel PaymentController.export())** — Dispatches a queued job and returns 202 immediately. Correct pattern.

7. **UUIDv7 primary keys** — Consistent across all tables in both services. Correct for distributed systems.

8. **Idempotency guard in payment creation** — order_id UNIQUE constraint + SELECT-before-INSERT + IntegrityError catch provides adequate idempotency protection.

### Critical Issues

| Severity | Issue | Location |
|---|---|---|
| **CRITICAL** | Webhook signature verification unimplemented — Stripe and PayPal webhook receivers accept any POST | `payments/app/routes/webhooks.py` |
| **CRITICAL** | `hmac.new()` incorrect call — will raise AttributeError at runtime on every webhook dispatch | `payments/app/services/webhook_dispatcher.py _sign()` |
| **HIGH** | No authentication on payments service routes — `x-merchant-id` header trusted without validation, FastAPI reachable on port 8000 directly | `payments/app/main.py` |
| **HIGH** | Provider return callbacks (Stripe/PayPal) are unauthenticated — any caller with a payment_id can trigger status transitions | `payments/app/routes/__init__.py` |
| **HIGH** | Usage counter incremented before provider attempt — failed payments permanently inflate quota counters | `payments/app/services/payment_creation.py:164-171` |
| **HIGH** | Gateway access profile cache (15-min TTL) not invalidated on key revocation or merchant suspension | `gateway-verification/app/services/gatewayAccess.js` |
| **HIGH** | Admin gateway (port 8083) has no nginx-level auth or IP restriction | `admin-gateway/nginx.conf` |
| **HIGH** | No SSL/TLS anywhere — all traffic is plain HTTP | All nginx configs |
| **HIGH** | Synchronous webhook dispatch in payment request path — 10s timeout blocks PHP-FPM workers and FastAPI request threads | `WebhookController.test()`, `payments/app/services/webhook_dispatcher.py` |
| **HIGH** | Webhook retry not implemented — `next_retry_at` column exists but no retry worker exists | `webhook_deliveries` table |
| **HIGH** | `subscription_id` injected by gateway trusted without re-validation in payments service | `payments/app/services/payment_creation.py` |
| **HIGH** | Dual-database dual-commit (payments_db + logs_db) with no outbox — crash between commits leaves payment without audit log | `payment_creation.py`, `provider_callback.py` |
| **MEDIUM** | RabbitMQ connected but no events published — infrastructure overhead with no benefit | `payments/app/classes/rabbitmq.py` |
| **MEDIUM** | No database-level foreign key constraints anywhere — orphan rows undetectable at DB level | All tables |
| **MEDIUM** | `start.sh` runs `docker compose down -v` destroying all volumes — data loss on every restart | `start.sh` |
| **MEDIUM** | Adminer (port 8084) and RabbitMQ management (port 15672) exposed with no auth gate | `docker-compose.yml` |
| **MEDIUM** | `Subscription.user()` defined as `belongsTo(User)` in both Laravel apps — semantically inverted | `saas-laravel/app/app/Models/Subscription.php`, `admin-laravel/app/app/Models/Subscription.php` |

### Technical Debt Inventory

- **Dual routing paradigm:** Legacy `ProviderRoutingConfiguration` + `ProviderRoutingRule` tables coexist alongside new `RoutingWorkflow` + `RoutingWorkflowVersion` graph model. No deprecation signal or migration path documented.
- **Shared database as integration layer:** Python service reads tables owned by Laravel migrations. Any schema change in Laravel can silently break the Python service.
- **No events or listeners in either Laravel app:** Domain events are absent. All cross-service side effects happen synchronously and inline.
- **saas-gateway hardcodes `localhost:8082` for login/register redirects** — breaks in any non-localhost environment.
- **No alembic migrations** visible in the payments service — DB schema is managed externally with no migration history.
- **maatwebsite/excel declared in admin-laravel composer.json** but no export classes exist — incomplete or abandoned feature.
- **saas-laravel and admin-laravel have byte-for-byte identical `package.json`** but are maintained independently.

---

## 3. Database & Data Layer

### Schema Assessment

The schema is broadly sound: UUIDv7 PKs, clear table naming, and a sensible split between operational (payments-db) and audit (payments-logs-db) data. However, several structural issues exist.

**Critical schema concerns:**

1. **No foreign key constraints** on any table. All referential integrity is application-enforced. A direct DB insert or a bug in application code can create orphan `payment_routing_attempts`, `webhook_deliveries`, or `PaymentLog` rows with no DB-level safeguard.

2. **Text vs JSONB type mismatch for queryable fields:**

| Table | Column | Python Type | Laravel Cast | Impact |
|---|---|---|---|---|
| `provider_routing_configurations` | `priority_chain`, `failover_chain`, `weighted_distribution` | `Text` | `array` | No GIN index possible |
| `provider_routing_rules` | `conditions` | `Text` | `array` | No DB-side rule matching |
| `provider_health_statuses` | `metadata` | `Text` | `array` | No JSON operators |
| `payment_routing_attempts` | `routing_snapshot` | `Text` | `array` | No JSON operators |

3. **`merchant_provider_credentials.secret_value` stored as plain TEXT** — no column-level encryption indicator. A misconfigured application layer exposes all credentials.

4. **`provider_health_statuses.merchant_id` is nullable** — the UNIQUE constraint on `(merchant_id, provider_alias, environment)` with nullable `merchant_id` can produce duplicate "global" rows in PostgreSQL because `NULL != NULL` in unique constraints.

5. **`payment_routing_attempts.payment_id` is nullable** — complicates joins and may produce orphan attempt rows.

6. **`user_subscriptions` has no `billing_period_start`/`billing_period_end`** — `current_period_transactions` and `current_period_volume` exist with no temporal boundary. Impossible to determine what time window these counters cover.

7. **`payments` table has grown to 20+ columns via 4 additive migrations** — mixing payment core data, provider checkout info, routing decisions, and request context in a single wide table.

### Missing Indexes

| Table | Index to Add | Reason |
|---|---|---|
| `payments` | `(merchant_id, created_at DESC)` | Most common analytics pattern — time-range per merchant |
| `payments` | `(merchant_id, environment, created_at DESC)` | Analytics always filters on environment too |
| `payment_logs` | `(payment_id, event_type, created_at)` | Timeline lookups filtered by event type |
| `gateway_access_profiles` | `api_key_hash` | Primary lookup key for auth — currently full table scan on DB fallback |
| `gateway_access_profiles` | `merchant_api_key_id` | Used in bulk-invalidate sync operations |
| `merchant_api_keys` | `(merchant_id, status)` | GatewayAccessProfileService filters by both |
| `provider_routing_rules` | `conditions` GIN | DB-side JSON containment queries for rule matching |
| `user_subscriptions` | `(user_id, status)` | Gateway subscription validation — needs covering index |
| `payment_routing_attempts` | `(merchant_id, provider_alias, created_at)` | Analytics aggregation by provider within merchant |
| `webhook_deliveries` | `(status, next_retry_at)` | Retry queue polling — composite prevents full status-scan |

**Migration template for the two most critical indexes:**

```sql
-- payments analytics composite index
CREATE INDEX CONCURRENTLY idx_payments_merchant_env_created
  ON payments (merchant_id, environment, created_at DESC);

-- gateway auth fallback lookup
CREATE UNIQUE INDEX CONCURRENTLY idx_gateway_profiles_api_key_hash
  ON gateway_access_profiles (api_key_hash);
```

### N+1 Risks and Over-fetching

**High risk:**

- `admin-laravel MerchantService::serialize()` — accesses `$merchant->providerCredentials->map()` and inside each calls `$credential->provider?->name`. Called after `MerchantRepository::find()` which does NOT eager-load `providerCredentials.provider`. Every call to serialize after create/update fires one query per credential. **Fix:** Always load credentials with provider in `find()`.

- `saas-laravel GatewayAccessProfileService::syncAll()` — chunks MerchantApiKey with `->with('merchant')`, then inside the loop calls `UserSubscription::query()->where('user_id', ...)` per key. One subscription query per API key. **Fix:** Load all subscriptions keyed by merchant_id before the loop.

**Medium risk:**

- `admin-laravel PaymentController::index()` — eager-loads `logs` (cross-connection pgsql_logs) and `routingAttempts` for every payment in the paginated list. The list view should not load full logs — defer logs to the detail view only.

- `MerchantRepository::allForSelect()` — fetches ALL merchants with providerCredentials.provider eager-loaded, unbounded. Will OOM with 1000+ merchants. Replace with a paginated or search-limited query.

- Python `RoutingEngine::_matching_rule()` — fetches ALL enabled rules for merchant+environment, then iterates in Python. No early DB-side exit. At scale, a merchant with 50 rules loads all 50 rows plus their JSONB conditions on every payment.

**Over-fetching locations:**

- `PaymentService::fetchAll()` loads ALL log columns including `payload` (large JSONB) for list view — only `event_type` and `status` are displayed.
- Python `RoutingEngine::_configuration()` loads the full ORM model including all chain arrays when only `strategy` and `enabled` are checked first.

### Model Relationship Gaps

| Model | Missing Relationship | Impact |
|---|---|---|
| `saas-laravel/Provider` | `hasMany(MerchantProviderCredential)`, `hasMany(Payment)` | Dead-end node in ORM graph |
| `saas-laravel/Subscription` | Incorrect `belongsTo(User)` — should be `hasMany(UserSubscription)` | Misleading navigation, query errors |
| `saas-laravel/MerchantApiKey` | Missing fields in `$fillable`: `key_prefix`, `name`, `environment`, `scopes`, `last_rotated_at`, `revoked_at` | Silent mass-assignment drops fields |
| `saas-laravel/MerchantWebhook` | Missing `merchant(): BelongsTo` | Cannot navigate webhook → merchant |
| `saas-laravel/WebhookDelivery` | Missing `payment(): BelongsTo`, no `scopePending()/scopeFailed()` | No ORM retry queue access |
| `admin-laravel/RoutingAuditLog` | Missing `actor(): BelongsTo`, `merchant(): BelongsTo` | Orphan read-model in ORM layer |
| Both apps/`GatewayAccessProfile` | Missing `merchantApiKey(): BelongsTo`, `merchant(): BelongsTo` | No navigation back to source records |
| Both apps/`PaymentLog` | `payment(): BelongsTo` defined but cross-connection join is impossible | Will query wrong DB connection at runtime |
| `Python/MerchantAPIKey` | Missing: `key_prefix`, `name`, `environment`, `scopes`, `last_rotated_at`, `revoked_at` | Silent column omission |

---

## 4. Backend Architecture (Laravel Services)

### Current Controller Structure Issues

The codebase is architecturally split: roughly half the controllers follow the correct thin-controller pattern; the other half contain direct Eloquent access, inline validation, and presentation logic. The divergence is most acute in three places:

1. **`saas-laravel/RoutingController::index()`** — 169 lines firing 6 direct model queries with inline `map()` closures for presentation. No service or repository layer.
2. **`saas-laravel/WebhookController`** — inline `$request->validate()`, synchronous HTTP call with 10s timeout, direct model mutations, hardcoded EVENTS constant.
3. **`admin-laravel/PaymentController::index()`** — 86-line inline Eloquent query chain with cross-connection eager loading and no resilience for `pgsql_logs` unavailability.

### Recommended Controller → Service → Repository → Contract Pattern

The target pattern (already demonstrated in `ApiKeyController`):

```php
// TARGET PATTERN — ApiKeyController is the reference implementation
final class RoutingController extends Controller
{
    public function __construct(
        private readonly RoutingServiceInterface $routingService
    ) {}

    public function index(Request $request): Response
    {
        $data = $this->routingService->getDashboardData(Auth::id());
        return Inertia::render('Routing/Index', $data->toArray());
    }
}

// Service encapsulates all query orchestration
final class RoutingService implements RoutingServiceInterface
{
    public function __construct(
        private readonly RoutingRepositoryInterface $repo
    ) {}

    public function getDashboardData(string $merchantId): RoutingDashboardDTO
    {
        return new RoutingDashboardDTO(
            workflows: $this->repo->getWorkflows($merchantId),
            healthStatuses: $this->repo->getHealthStatuses($merchantId),
            trafficSplit: $this->repo->getTrafficSplit($merchantId),
            summary: $this->repo->getSummary($merchantId),
        );
    }
}

// Repository holds all Eloquent queries
final class RoutingRepository implements RoutingRepositoryInterface
{
    public function getWorkflows(string $merchantId): Collection
    {
        return RoutingWorkflow::query()
            ->where('merchant_id', $merchantId)
            ->with('versions:id,routing_workflow_id,version_number,created_at')
            ->latest()
            ->get();
    }
    // ... one method per query
}
```

### Specific Files to Refactor (Ordered by Priority)

**Priority 1 — Critical (production risk):**

| File | Problem | Change |
|---|---|---|
| `saas-laravel/app/Http/Controllers/WebhookController.php` | Synchronous 10s HTTP call blocks PHP-FPM workers | Create `WebhookTestPingJob`, dispatch async, return 202. Create `WebhookStoreRequest` FormRequest. Move query logic to `WebhookRepository`. |
| `saas-laravel/app/Http/Controllers/RoutingController.php` | 169-line fat action, 6 direct model queries | Create `RoutingService`, `RoutingRepository`, `RoutingRepositoryInterface`. Collapse `index()` to ~15 lines. |
| `admin-laravel/app/Http/Controllers/Admin/PaymentController.php` | Cross-connection eager load with no resilience | Create `Admin\PaymentRepository` and `Admin\PaymentService`. Wrap `pgsql_logs` load in try/catch. Remove logs from list view. |

**Priority 2 — Consistency:**

| File | Problem | Change |
|---|---|---|
| `saas-laravel/app/Http/Controllers/PaymentController.php (show)` | Bypasses `PaymentService` | Add `PaymentService::fetchOne(string $id, string $merchantId)` |
| `admin-laravel/app/Http/Controllers/Admin/MerchantController.php` | Inline validate in `index()`, repeated `abort_unless` guards | Create `Admin\MerchantIndexRequest`, enforce `isMerchant()` via route model binding scope |
| `admin-laravel/app/Http/Controllers/Admin/RoutingController.php` | Inline validate in `simulateWorkflow()`, credential query in controller | Create `Admin\SimulateWorkflowRequest`, extract credential query to `RoutingRepository` |
| `admin-laravel/app/Http/Controllers/Admin/SubscriptionController.php` | Direct `Subscription::query()` in controller | Create `SubscriptionRepository::list()` |

**Priority 3 — Missing contracts:**

| Missing Interface | Bind in |
|---|---|
| `DashboardRepositoryInterface` (both apps) | `AppServiceProvider` |
| `AnalyticsRepositoryInterface` (both apps) | `AppServiceProvider` |
| `RoutingRepositoryInterface` (saas-laravel) | `AppServiceProvider` |
| `WebhookRepositoryInterface` (saas-laravel) | `AppServiceProvider` |

### Validation Improvements

**FormRequest classes needed:**

| Controller Action | Missing FormRequest |
|---|---|
| `saas-laravel WebhookController::store()` | `Requests/WebhookStoreRequest` |
| `admin-laravel MerchantController::index()` (filter) | `Requests/Admin/MerchantIndexRequest` |
| `admin-laravel PaymentController::index()` (filter) | `Requests/Admin/PaymentIndexRequest` |
| `admin-laravel RoutingController::simulateWorkflow()` | `Requests/Admin/SimulateWorkflowRequest` |

### Additional Code Fixes Required

**`saas-laravel/app/app/Models/Subscription.php`** — Remove incorrect relationship:
```php
// REMOVE this:
public function user(): BelongsTo
{
    return $this->belongsTo(User::class);
}

// ADD this:
public function userSubscriptions(): HasMany
{
    return $this->hasMany(UserSubscription::class);
}
```

**`saas-laravel/app/app/Repositories/AnalyticsRepository.php getLatencyBuckets()`** — Collapse 5 COUNT queries into one:
```php
// REPLACE: 5 separate COUNT queries in a loop
// WITH: single CASE WHEN aggregate
$result = DB::select("
    SELECT
        COUNT(CASE WHEN latency_ms < 500 THEN 1 END) AS fast,
        COUNT(CASE WHEN latency_ms BETWEEN 500 AND 1000 THEN 1 END) AS medium,
        COUNT(CASE WHEN latency_ms BETWEEN 1001 AND 3000 THEN 1 END) AS slow,
        COUNT(CASE WHEN latency_ms BETWEEN 3001 AND 10000 THEN 1 END) AS very_slow,
        COUNT(CASE WHEN latency_ms > 10000 THEN 1 END) AS critical
    FROM payment_routing_attempts
    WHERE merchant_id = ? AND environment = ?
", [$merchantId, $environment]);
```

**`saas-laravel/app/app/Services/GatewayAccessProfileService.php`** — Rate limit and permissions must be configurable per subscription:
```php
// REPLACE hardcoded values:
'rate_limit_per_minute' => 120,
'permissions' => ['payments:create', 'payments:read', ...],

// WITH subscription-plan-driven values:
'rate_limit_per_minute' => $subscription->rate_limit_per_minute,
'permissions' => $subscription->getAllowedPermissions(),
```

---

## 5. Python Payments Service

### Current Structure Assessment

The FastAPI service is logically structured into routes, services, routing engine, providers, and models. The routing engine is the strongest part of the codebase. The main weaknesses are: no authentication enforcement, incomplete provider webhook verification, abandoned RabbitMQ infrastructure, and distributed consistency gaps.

### Payment Flow Description

1. `POST /api/v1/payments` arrives with `x-merchant-id` (injected by gateway-verification).
2. `PaymentCreationService.create()` checks idempotency (order_id UNIQUE), then calls `PaymentRoutingEngine.plan()`.
3. Routing engine: queries healthy providers (circuit-breaker filtered) → applies condition rules → weighted hash → priority chain → returns `RoutingPlan`.
4. Payment row inserted; subscription usage counters incremented in same `payments_db` transaction. PaymentLog written to separate `logs_db` transaction (consistency gap here).
5. Failover loop: for each candidate → re-check circuit breaker → resolve credentials → call provider (Stripe checkout session / PayPal order create) → classify failure as hard or soft → record `payment_routing_attempts` → update provider health.
6. On success: update `payments.provider_checkout_url`, dispatch webhook synchronously, return checkout URL to caller.
7. Customer redirected to provider checkout. On completion: `GET /provider-return/{provider}` triggers `ProviderCallbackService`, which verifies session with provider, updates payment status, writes terminal log, dispatches webhook.

### Distributed Consistency Risks

| Risk | Location | Severity |
|---|---|---|
| **Dual-DB dual-commit** — crash between `payments_db.commit()` and `logs_db.commit()` leaves payment without audit log | `payment_creation.py`, `provider_callback.py` | High |
| **Usage counter before provider attempt** — failed payments permanently inflate quota | `payment_creation.py:164-171` | High |
| **Payment_routing_attempts committed in separate session from payment status** — crashed mid-failover leaves "succeeded" attempts for a PENDING payment | `payment_creation.py` (per-attempt commits) | Medium |
| **Webhook delivery not transactional with status update** — status committed, then dispatch; crash between leaves merchant unnotified with no retry | `provider_callback.py` + `webhook_dispatcher.py` | High |
| **Circuit breaker split-brain** — Redis flush makes all providers appear healthy regardless of PostgreSQL `disabled_until` state | `routing/health.py is_available()` | Medium |
| **Race condition: logs_db may commit for an order_id that gets IntegrityError rolled back** | `payment_creation.py` | Medium |

### Recommended Improvements

**1. Fix the critical hmac bug immediately:**
```python
# BROKEN (current):
sig = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()

# CORRECT:
sig = hmac.new(key=secret.encode(), msg=msg, digestmod=hashlib.sha256).hexdigest()
```

**2. Implement provider webhook signature verification:**
```python
# payments/app/routes/webhooks.py
@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        stripe.WebhookSignature.verify_header(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    # ... process event
```

**3. Move usage counter increment after provider success:**
```python
# MOVE from before the failover loop:
# subscription.current_period_transactions += 1

# TO: inside the success branch after provider checkout creation
async def _increment_usage(self, payment: Payment, session: Session):
    # Only called when a provider checkout is successfully created
    UserSubscription.increment_usage(payment.merchant_id, payment.price, session)
```

**4. Implement outbox pattern for audit logs:**

Instead of dual-commit, write a pending `PaymentLog` row in the same `payments_db` transaction, then have a background worker flush it to `logs_db`. This eliminates the split-brain between the two databases.

**5. Implement webhook retry worker:**
```python
# New background task: payments/app/workers/webhook_retry.py
async def retry_failed_webhooks():
    pending = session.query(WebhookDelivery).filter(
        WebhookDelivery.status == "pending",
        WebhookDelivery.next_retry_at <= datetime.now(timezone.utc)
    ).all()
    for delivery in pending:
        await dispatcher.redeliver(delivery)
```

**6. Fix datetime inconsistency:**
```python
# REPLACE in routing/health.py:
datetime.utcnow()  # deprecated Python 3.12+

# WITH:
datetime.now(timezone.utc)
```

**7. Network-isolate the payments service** — ensure port 8000 is not externally reachable; only gateway-verification should be able to reach it. In docker-compose this means not publishing port 8000.

**8. Sign provider return URLs:**
```python
# In payment creation, sign the return URL:
token = hmac.new(
    key=SECRET.encode(),
    msg=f"{payment_id}:{order_id}".encode(),
    digestmod=hashlib.sha256
).hexdigest()
return_url = f"{BASE_URL}/provider-return/stripe?payment_id={payment_id}&token={token}"

# In callback handler, verify before processing:
expected = compute_token(payment_id, order_id)
if not hmac.compare_digest(expected, request_token):
    raise HTTPException(status_code=403)
```

---

## 6. Frontend Architecture

### Current Structure Issues

The frontend consists of two nearly identical React/Inertia apps (saas-laravel and admin-laravel) that share zero code despite byte-for-byte identical `package.json` files. Both apps contain significant inline duplication of ReactFlow node components, Badge variants, formatter functions, and stat card components.

**Largest files (need decomposition):**

| File | Lines | Main Issues |
|---|---|---|
| `saas-laravel/resources/js/Pages/Routing/Index.jsx` | 1,104 | 10+ inline components, full ReactFlow node library, layout algorithm |
| `admin-laravel/resources/js/Pages/Admin/Routing/Builder.jsx` | 943 | 7 inline node components, 6 editor panels, simulation engine, edge utilities |
| `saas-laravel/resources/js/Pages/Payments/Index.jsx` | 398 | raw `fetch()` for export, filter state, inline formatter definitions |
| `admin-laravel/resources/js/Pages/Admin/Payments/Index.jsx` | 428 | Badge and formatter duplication |
| `saas-laravel/resources/js/Pages/Analytics.jsx` | 519 | inline chart components, locally-defined formatters |

### Component Organization Recommendations

**1. Extract ReactFlow node library (shared across both apps):**

```
saas-laravel/resources/js/Components/FlowNodes/
  StartNode.jsx
  ProviderNode.jsx
  ConditionNode.jsx
  WeightedNode.jsx
  FailoverNode.jsx
  TerminalNode.jsx        (accepts variant="success"|"failure")
  index.js                (re-exports nodeTypes map)

saas-laravel/resources/js/Components/FlowCanvas/
  WorkflowCanvas.jsx      (wraps ReactFlow with layout + normalization)
  layoutWorkflowNodes.js  (pure function — auto-layout algorithm)
```

The 6 custom node types are structurally identical between the two apps — same props, same Tailwind classes, same Handle positions. The only meaningful differences are that Builder nodes accept a `selected` prop for ring focus and have interactive Handle styling. A `selectable` boolean prop covers this.

**2. Consolidate Badge:**

`admin-laravel/Components/Badge.jsx` already exists but is never imported by any page. Merge all 5 inline Badge color maps (union of all keys: payment status + routing status + environment + health) into this file, then delete all 5 inline definitions:

```jsx
// Components/Badge.jsx — single source of truth
const VARIANTS = {
  // Payment statuses
  pending: 'bg-yellow-100 text-yellow-800',
  finished: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  // Routing workflow statuses
  published: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-200 text-gray-600',
  // Provider health
  healthy: 'bg-green-100 text-green-800',
  degraded: 'bg-yellow-100 text-yellow-800',
  unhealthy: 'bg-red-100 text-red-800',
  // Environments
  live: 'bg-blue-100 text-blue-800',
  test: 'bg-purple-100 text-purple-800',
  // ... union of all maps
};

export default function Badge({ value, className = '' }) {
  return (
    <span className={`inline-flex ... ${VARIANTS[value] ?? VARIANTS.default} ${className}`}>
      {value}
    </span>
  );
}
```

**3. Create `utils/format.js` per app:**

```js
// resources/js/utils/format.js
export const fmt = (n, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n ?? 0);

export const fmtCurrency = (n, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n ?? 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtMs = (ms) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
```

Replace all 6 inline definitions with `import { fmt, fmtCurrency, fmtDate } from '@/utils/format'`.

**4. Decompose Builder.jsx:**

```
Pages/Admin/Routing/
  Builder.jsx                (orchestration only, ~150 lines after extraction)
  components/
    NodePalette.jsx
    ConfigPanel.jsx
    ConditionEditor.jsx
    WeightedEditor.jsx
    FailoverEditor.jsx
    SimulationPanel.jsx
  utils/
    validateEdgeConnection.js
    edgeHelpers.js
```

### State Management Recommendations

**1. WorkflowBuilder reducer (admin Builder.jsx):**

Replace 7 interdependent `useState` calls with a `useReducer`:
```js
const initialState = { nodes: [], edges: [], selectedNodeId: null, name: '', saving: false };

function workflowReducer(state, action) {
  switch (action.type) {
    case 'SET_NODES': return { ...state, nodes: action.payload };
    case 'SELECT_NODE': return { ...state, selectedNodeId: action.payload };
    // ...
  }
}

// Derive selectedNode — never sync it:
const selectedNode = useMemo(
  () => state.nodes.find(n => n.id === state.selectedNodeId) ?? null,
  [state.nodes, state.selectedNodeId]
);
```

**2. Fix stale selectedNode sync (Builder.jsx lines 727-731):**

The current `useEffect` that syncs `selectedNode` from `nodes` on every nodes change is a source of stale-closure bugs. Replace with the derived value above.

**3. Extract `useCart()` hook (merchant-demo):**
```js
// src/hooks/useCart.js
function useCart() {
  const [cart, setCart] = useLocalStorage('cart', []);
  const addItem = (product) => { /* ... */ };
  const removeItem = (id) => { /* ... */ };
  const updateQuantity = (id, qty) => { /* ... */ };
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { cart, addItem, removeItem, updateQuantity, total };
}
```

### API Call Centralization

**Fix the raw `fetch()` in `saas-laravel/Pages/Payments/Index.jsx`:**

```js
// REPLACE raw fetch (lines 72-120) with Inertia:
const handleExport = () => {
  router.post(route('payments.exports'), filters, {
    onSuccess: () => toast.success('Export started — check your email'),
    onError: () => toast.error('Export failed'),
  });
};
```

---

## 7. Integration & Service Boundaries

### Current Integration Points

| Interface | Mechanism | Owner |
|---|---|---|
| Merchant auth | HMAC-SHA256 API key → `gateway_access_profiles` (Redis/PG) | gateway-verification reads, saas-laravel writes |
| Payment creation | HTTP POST through gateway chain | External client → gateway → gateway-verification → FastAPI |
| Provider routing config | Direct shared DB reads | Python reads `provider_routing_configurations`, `provider_routing_rules` |
| Merchant credentials | Direct shared DB reads | Python reads `merchant_provider_credentials` |
| Webhook config | Direct shared DB reads | Python reads `merchant_webhooks` |
| Subscription validation | `gateway_access_profiles` (denormalized) | gateway-verification reads gateway, Python re-queries |
| Audit logging | Python writes `payment_routing_attempts`, `PaymentLog` | Python only — no Laravel routing decisions audited |

### Issues with Service Boundaries

**1. Shared database as the integration contract** — This is the root architectural problem. Python reads 5 tables owned and migrated by Laravel. Any column rename, type change, or schema evolution in Laravel immediately breaks the Python service with no compile-time signal. At minimum, Python should read via an internal API endpoint rather than direct DB access for tables it does not own.

**2. `subscription_id` trusted from gateway header** — The gateway injects `subscription_id` into the request body; the Python service trusts it without re-validating ownership. Direct calls to port 8000 (bypassing the gateway) can supply any subscription_id. The Python service must validate that `subscription_id` belongs to `merchant_id` before using it.

**3. No contract for `gateway_access_profiles` sync** — Two services (saas-laravel writes, gateway-verification reads) share this denormalized table with no documented sync protocol. Any new gateway enforcement rule requires coordinated changes to both services.

**4. Admin gateway exposed with no auth layer** — port 8083 relies entirely on Laravel session auth. Add nginx-level IP allowlisting or basic auth as a defense-in-depth layer.

### Duplicated Logic to Consolidate

| Logic | Locations | Recommendation |
|---|---|---|
| `PaymentStatus` enum values (integers 1–9) | `payments/app/enums.py` + `saas-laravel/app/Enums/PaymentStatus.php` | Add a comment block in both files explicitly cross-referencing each other. Long-term: emit a shared JSON schema. |
| `PaymentLogEvent` types | `payments/app/enums.py` + `saas-laravel/app/Enums/PaymentLogEventType.php` | Same as above |
| Active subscription check | gateway-verification (`subscription_status=1`) + Python `UserSubscription` query | Document the gateway check as the fast-path; Python re-validation is the authoritative check. Accept the duplication with documentation. |
| Provider credential resolution | `payments/app/providers/credential_resolver.py` + direct Laravel queries | Keep in Python service only. If Laravel needs to validate credentials, call an internal API. |
| Subscription status integer mapping | Python `SmallInteger server_default='1'` + Laravel `SubscriptionStatus` enum | Add explicit integer value documentation to the Laravel enum: `case ACTIVE = 1;` with comment. Verify Python constant matches. |

### Error Handling Gaps

1. **`pgsql_logs` connection failure is silent** — both Laravel apps load PaymentLog relations without wrapping in try/catch. If `payments-logs-db` is unavailable, eager loads return empty collections with no error logged.

2. **Provider credential not found** — `CredentialResolver` in Python returns `None` if no credential exists for a provider. The calling routing engine needs to handle this as a circuit-break case, not an unhandled None dereference.

3. **Webhook delivery failure not surfaced to merchant** — failed deliveries are written to `webhook_deliveries` but no retry worker exists. Merchants have no visibility into persistent delivery failures.

4. **Circuit breaker Redis unavailability degrades to always-closed** — when Redis is down, `is_available()` catches the exception and returns `True`, disabling circuit-breaker protection entirely. Add a secondary in-process fallback with a short TTL.

---

## 8. Prioritized Refactoring Roadmap

### Phase 1 — Critical Fixes (Week 1–2)

These items are production security vulnerabilities or data correctness bugs.

---

**1.1 Fix webhook HMAC signing bug**
- **File:** `payments/app/services/webhook_dispatcher.py`
- **Change:** Verify and correct `hmac.new()` call signature. Add a unit test that exercises `_sign()` end-to-end.
- **Why:** Every outgoing webhook delivery will raise `AttributeError` at runtime if the current call is wrong. Zero webhook delivery at scale.
- **Risk:** Low — isolated function change with simple test.

---

**1.2 Implement Stripe and PayPal webhook signature verification**
- **File:** `payments/app/routes/webhooks.py`
- **Change:** Add `stripe.WebhookSignature.verify_header()` and PayPal certificate-based verification before processing any webhook event.
- **Why:** Currently any HTTP client can POST fake payment completion events and the service will process them as real provider confirmations.
- **Risk:** Low — additive security check that rejects invalid requests.

---

**1.3 Sign and verify provider return callback URLs**
- **Files:** `payments/app/services/payment_creation.py` (sign), `payments/app/services/provider_callback.py` (verify)
- **Change:** Embed HMAC token in `success_url`/`cancel_url`; verify token before processing in `handle_stripe_return` / `handle_paypal_return`. Verify Stripe session `client_reference_id` matches `payment_id` before updating any record.
- **Why:** A customer can craft a return URL with a different `payment_id` to update an arbitrary payment record.
- **Risk:** Medium — requires Stripe/PayPal URL format change; test against sandbox.

---

**1.4 Move usage counter increment after provider checkout success**
- **File:** `payments/app/services/payment_creation.py:164-171`
- **Change:** Move `UserSubscription` increment out of the pre-failover block into the post-provider-success branch. Add a compensating decrement path if all providers fail.
- **Why:** Failed payments permanently inflate merchant quota counters, causing billing disputes.
- **Risk:** Low — logic move within the same function, does not change DB schema.

---

**1.5 Implement explicit cache invalidation for `gateway_access_profiles`**
- **Files:** `saas-laravel/app/app/Services/GatewayAccessProfileService.php` (add invalidation), create `app/Observers/ApiKeyObserver.php`, `app/Observers/UserObserver.php`
- **Change:** On `MerchantApiKey` status change and `User` status change, dispatch a job that calls `Redis::del("gateway:profile:{$hash}")` for all affected keys.
- **Why:** Revoked API keys remain valid for up to 15 minutes. A suspended merchant can continue creating payments.
- **Risk:** Low — additive Observer pattern; no schema change.

---

**1.6 IP-restrict admin gateway at nginx level**
- **File:** `admin-gateway/nginx.conf`
- **Change:** Add `allow 10.0.0.0/8; deny all;` (or office IP range) inside the `server` block, or add HTTP Basic Auth as a second factor.
- **Why:** Admin panel at port 8083 is publicly accessible with no infrastructure-level protection.
- **Risk:** Low — nginx config change.

---

**1.7 Fix `Subscription.user()` incorrect relationship**
- **Files:** `saas-laravel/app/app/Models/Subscription.php`, `admin-laravel/app/app/Models/Subscription.php`
- **Change:** Remove `belongsTo(User::class)`, add `hasMany(UserSubscription::class)`.
- **Why:** The current relationship silently returns wrong data and is semantically inverted.
- **Risk:** Low — verify no existing code calls `$subscription->user`.

---

**1.8 Fix `MerchantApiKey.$fillable` in saas-laravel**
- **File:** `saas-laravel/app/app/Models/MerchantApiKey.php`
- **Change:** Add `key_prefix`, `name`, `environment`, `scopes`, `last_rotated_at`, `revoked_at` to `$fillable`.
- **Why:** Mass-assignment silently drops these fields on every create/update via this model.
- **Risk:** Low.

---

**1.9 Remove cross-connection `payment(): BelongsTo` from both `PaymentLog` models**
- **Files:** `saas-laravel/app/app/Models/PaymentLog.php`, `admin-laravel/app/app/Models/PaymentLog.php`
- **Change:** Remove the `payment()` relationship or replace it with a documented note explaining why it cannot be used. Add a static helper `PaymentLog::forPayments(array $ids)` that queries the `pgsql_logs` connection correctly.
- **Why:** Calling `$log->payment` queries the wrong DB connection and returns null silently.
- **Risk:** Low — verify no code path calls `$log->payment`.

---

**1.10 Fix `start.sh` data-destructive volume wipe**
- **File:** `start.sh`
- **Change:** Replace `docker compose down -v` with `docker compose down` (no `-v`). Add a separate explicit `down-clean` target only for full resets.
- **Why:** Every developer rebuild destroys all database data.
- **Risk:** Low.

---

### Phase 2 — Backend Architecture Refactoring (Week 3–4)

---

**2.1 Extract `RoutingService` and `RoutingRepository` (saas-laravel)**
- **Files to create:** `app/Services/RoutingService.php`, `app/Repositories/RoutingRepository.php`, `app/Contracts/Routing/RoutingRepositoryInterface.php`
- **File to change:** `app/Http/Controllers/RoutingController.php` (collapse `index()` from 169 lines to ~15)
- **Change:** Move all 6 direct model queries into named repository methods. Move `trafficSplit` aggregation and summary computation into `RoutingService`. Bind interface in `AppServiceProvider`.
- **Why:** Current fat action makes routing data impossible to test without HTTP, and any new metric requires modifying the controller.
- **Risk:** Medium — significant refactor; requires feature tests covering the routing dashboard response.

---

**2.2 Async webhook test ping (saas-laravel)**
- **Files to create:** `app/Jobs/WebhookTestPingJob.php`
- **File to change:** `app/Http/Controllers/WebhookController.php`
- **Change:** Replace synchronous `Http::post(10s)` in `test()` with `WebhookTestPingJob::dispatch($webhook)`. Return `202 Accepted`. Create `WebhookStoreRequest` FormRequest. Move `index()`/`logs()` query logic into `WebhookRepository`.
- **Why:** 10-second blocking HTTP call starves PHP-FPM worker pool under any real network conditions.
- **Risk:** Medium — changes the test ping response from synchronous delivery result to queued acknowledgement; update frontend to poll or use a toast indicating async dispatch.

---

**2.3 Create `Admin\PaymentRepository` and `Admin\PaymentService` (admin-laravel)**
- **Files to create:** `app/Repositories/PaymentRepository.php`, `app/Services/PaymentService.php`, `app/Http/Requests/Admin/PaymentIndexRequest.php`
- **File to change:** `app/Http/Controllers/Admin/PaymentController.php`
- **Change:** Move inline 86-line query into repository. Wrap `pgsql_logs` eager load in try/catch with logged warning on failure. Remove logs from list view (load only in show/detail view).
- **Why:** Cross-connection failure is currently unhandled; list view loads 300+ log rows per page unnecessarily.
- **Risk:** Low — straightforward extraction.

---

**2.4 Add `PaymentService::fetchOne()` (saas-laravel)**
- **File to change:** `app/Http/Controllers/PaymentController.php (show)`, `app/Services/PaymentService.php`
- **Change:** Add `fetchOne(string $id, string $merchantId): PaymentDTO` to `PaymentService`. Update `show()` to delegate to it.
- **Why:** `show()` bypasses the service layer while `index()` uses it — inconsistency leads to duplicated logic in both locations.
- **Risk:** Low.

---

**2.5 Collapse `AnalyticsRepository::getLatencyBuckets()` to single query**
- **File:** `saas-laravel/app/app/Repositories/AnalyticsRepository.php`
- **Change:** Replace 5-query loop with single `CASE WHEN` aggregate SQL as shown in Section 4.
- **Why:** 5 round-trip queries for a single metric in an already-slow analytics page.
- **Risk:** Low — pure refactor of query logic, same output shape.

---

**2.6 Make gateway rate limits and permissions subscription-driven**
- **File:** `saas-laravel/app/app/Services/GatewayAccessProfileService.php`
- **Change:** Remove hardcoded `rate_limit_per_minute=120` and permissions array. Add `rate_limit_per_minute` and `allowed_permissions` columns to `subscriptions` table (migration). Read them in sync.
- **Why:** All merchants get the same rate limit regardless of plan. Premium plans cannot be differentiated at the gateway level.
- **Risk:** Medium — requires DB migration and coordination with gateway-verification to read the new field.

---

**2.7 Add missing Repository contracts (both apps)**
- **Files to create:** `app/Contracts/Dashboard/DashboardRepositoryInterface.php`, `app/Contracts/Analytics/AnalyticsRepositoryInterface.php` (both apps)
- **Change:** Define interfaces, bind in `AppServiceProvider`. This completes the interface coverage started by `PaymentRepositoryInterface`, `ApiKeyRepositoryInterface`, `SubscriptionRepositoryInterface`.
- **Why:** Inconsistent — half the repositories have interfaces, half do not. Interface-less repos cannot be mocked in tests.
- **Risk:** Low.

---

**2.8 Implement webhook retry worker (Python)**
- **File to create:** `payments/app/workers/webhook_retry.py`
- **Change:** Background task polling `webhook_deliveries WHERE status='pending' AND next_retry_at <= NOW()` with exponential backoff (populate `next_retry_at` on initial failure). Register as a FastAPI `BackgroundTask` or standalone worker.
- **Why:** Failed webhook deliveries are permanently lost. `next_retry_at` column exists with no consumer.
- **Risk:** Low — additive worker, no schema change needed.

---

### Phase 3 — Frontend Cleanup (Week 5–6)

---

**3.1 Extract ReactFlow node library**
- **Files to create:** `saas-laravel/resources/js/Components/FlowNodes/{StartNode,ProviderNode,ConditionNode,WeightedNode,FailoverNode,TerminalNode}.jsx`
- **Files to change:** `Pages/Routing/Index.jsx` (import), `admin-laravel Pages/Admin/Routing/Builder.jsx` (import or symlink)
- **Change:** Extract 6 node components from both files. Add `selectable` boolean prop to handle Builder's ring-focus variant. Reduce both files by ~400 lines combined.
- **Why:** 6 of 7 node types are byte-for-byte duplicated. A visual change to a node (e.g., icon update) currently requires edits in two places.
- **Risk:** Low — pure extraction refactor with no behavioral change.

---

**3.2 Consolidate Badge component**
- **Files to change:** `admin-laravel/resources/js/Components/Badge.jsx` (expand), delete inline Badge definitions in `Dashboard.jsx`, `Payments/Index.jsx`, `Routing/Index.jsx` (admin), `Routing/Index.jsx` (saas), `Webhooks/Index.jsx` (saas)
- **Change:** Merge all color map keys into `Components/Badge.jsx`. Replace 5 inline definitions with `import Badge from '@/Components/Badge'`.
- **Why:** 5 separate Badge definitions diverge over time. Admin `Components/Badge.jsx` already exists and is unused.
- **Risk:** Low — verify color key naming consistency across all 5 maps before merging.

---

**3.3 Create `utils/format.js` in both apps**
- **Files to create:** `saas-laravel/resources/js/utils/format.js`, `admin-laravel/resources/js/utils/format.js`
- **Files to change:** All 6 pages with inline `fmt`/`fmtCurrency`/`fmtDate` definitions
- **Change:** Extract with consistent signature (include `decimals` param from Analytics version). Replace inline definitions with imports.
- **Why:** Minor signature differences between copies cause subtle display bugs (e.g., missing decimal places on one page vs another).
- **Risk:** Low — verify all call sites pass compatible arguments.

---

**3.4 Decompose Builder.jsx**
- **Files to create:** `admin-laravel/resources/js/Pages/Admin/Routing/components/{NodePalette,ConfigPanel,ConditionEditor,WeightedEditor,FailoverEditor,SimulationPanel}.jsx`, `utils/{validateEdgeConnection,edgeHelpers}.js`
- **File to change:** `Builder.jsx` (import extracted components)
- **Change:** Extract the 6 editor/panel components and 7 node types (already covered in 3.1) from Builder.jsx. Extract `validateEdgeConnection` (pure logic) to utils. Builder.jsx should be ~150 lines of orchestration after extraction.
- **Why:** 943-line single file makes any feature addition require navigating the entire file. SimulationPanel in particular is a self-contained feature.
- **Risk:** Medium — significant JSX reorganization; ensure React state for `ConfigPanel` is lifted correctly to the parent.

---

**3.5 Fix Payments export to use Inertia**
- **File:** `saas-laravel/resources/js/Pages/Payments/Index.jsx`
- **Change:** Replace raw `fetch()` (lines 72–120) with `router.post(route('payments.exports'), filters, { onSuccess, onError })`.
- **Why:** Raw fetch manually manages CSRF token and has ad-hoc error handling inconsistent with every other mutation in the app.
- **Risk:** Low.

---

**3.6 Fix `selectedNode` stale state in Builder.jsx**
- **File:** `admin-laravel/resources/js/Pages/Admin/Routing/Builder.jsx`
- **Change:** Remove `selectedNode` useState + sync `useEffect` (lines 710, 727–731). Replace with `const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId])`.
- **Why:** Sync effect on every `nodes` change creates a one-render lag and stale-closure risk when nodes are modified during edit.
- **Risk:** Low.

---

**3.7 Extract CartDrawer from merchant-demo App.jsx**
- **File to create:** `merchant-demo/src/components/CartDrawer.jsx`
- **File to change:** `merchant-demo/src/App.jsx`
- **Change:** Extract lines 209–269 to `CartDrawer` component. Extract cart state to `useCart()` hook with `useLocalStorage` inside.
- **Why:** App.jsx currently owns cart UI, order UI, header, product grid, and checkout orchestration — too many responsibilities for testability and readability.
- **Risk:** Low.

---

### Phase 4 — Performance and Integration Improvements (Week 7–8)

---

**4.1 Add missing composite database indexes**
- **Files:** New migration in `saas-laravel/database/migrations/`
- **Change:** Add the 10 indexes listed in Section 3 using `CREATE INDEX CONCURRENTLY` to avoid locking.
- **Why:** Analytics queries, gateway auth fallback, and retry queue polling are doing full or near-full table scans on tables that will grow large.
- **Risk:** Low — CONCURRENTLY flag prevents table locks; run during low-traffic window.

---

**4.2 Add foreign key constraints to critical tables**
- **Files:** New migration
- **Change:** Add FK constraints minimum on: `payments.merchant_id → users.id`, `payments.provider_id → providers.id`, `payment_routing_attempts.payment_id → payments.id`, `webhook_deliveries.webhook_id → merchant_webhooks.id`, `merchant_api_keys.merchant_id → users.id`.
- **Why:** No referential integrity at the DB level. Orphan rows accumulate silently.
- **Risk:** Medium — run `NOT VALID` constraint first, then `VALIDATE CONSTRAINT` separately to avoid full table scan lock.

---

**4.3 Migrate JSON Text columns to JSONB (Python-owned tables)**
- **Files:** New migration + update Python SQLAlchemy models
- **Change:** `ALTER TABLE provider_routing_configurations ALTER COLUMN priority_chain TYPE JSONB USING priority_chain::jsonb` (and `failover_chain`, `weighted_distribution`). Same for `provider_routing_rules.conditions`, `provider_health_statuses.metadata`, `payment_routing_attempts.routing_snapshot`. Update Python models from `Text` to `JSON` type.
- **Why:** Text columns cannot have GIN indexes, cannot use JSON operators, and silently accept malformed JSON. DB-side rule condition matching becomes possible after this change.
- **Risk:** High — requires coordinated migration + Python deploy. Run against a backup first. Verify all existing values are valid JSON before migration.

---

**4.4 Implement outbox pattern for payment audit logs**
- **Files:** New table migration `payment_log_outbox`, new background worker in Python
- **Change:** Write `PaymentLog` entries to an `outbox` table in `payments_db` within the same transaction as the payment write. A background worker reads from outbox and writes to `payments-logs-db`, then marks entries as delivered. Eliminates the dual-commit consistency gap.
- **Why:** Current dual-commit can leave payments without audit logs on process crash between commits.
- **Risk:** High — requires schema addition and new worker component. Outbox table adds ~5% write overhead.

---

**4.5 Implement event publishing over RabbitMQ**
- **Files:** `payments/app/services/payment_creation.py`, `payments/app/services/provider_callback.py`, `payments/app/classes/rabbitmq.py`
- **Change:** Wire `publish_payment_event()` into `_dispatch_event()` calls. Publish `payment.created`, `payment.succeeded`, `payment.failed` events. If RabbitMQ is not the right choice, remove the dependency entirely and document the decision.
- **Why:** RabbitMQ connection consumes resources and creates a false impression of event-driven architecture. Either use it or remove it.
- **Risk:** Medium — if publishing, add circuit-breaker for AMQP failures so a RabbitMQ outage does not fail payment creation.

---

**4.6 Paginate or search-gate `MerchantRepository::allForSelect()`**
- **File:** `admin-laravel/app/app/Repositories/MerchantRepository.php`
- **Change:** Replace unbounded `get()` with a search-driven query limited to 50 results. Add a dedicated `GET /admin/merchants/search?q=` endpoint consumed by an autocomplete component.
- **Why:** Fetching all merchants with provider credentials will OOM at 1000+ merchants.
- **Risk:** Low — requires frontend autocomplete component to replace the current full list.

---

**4.7 Migrate saas-gateway hardcoded localhost URL to environment config**
- **File:** `saas-gateway/default.conf`
- **Change:** Replace `localhost:8082` in login/register redirects with an environment variable `$AUTH_SITE_URL` set via nginx `env` directive or Docker environment substitution.
- **Why:** Hardcoded localhost breaks every non-local deployment.
- **Risk:** Low — nginx config change with env variable injection.

---

**4.8 Add SSL termination**
- **Files:** `gateway/nginx.conf`, `saas-gateway/nginx.conf`, `admin-gateway/nginx.conf`
- **Change:** Add TLS certificate configuration (Let's Encrypt or internal CA). Redirect HTTP → HTTPS. Update `PAYMENT_RETURN_BASE_URL` to `https://`.
- **Why:** All traffic including API keys, payment data, and admin credentials is currently unencrypted. Stripe will not send webhooks to plain HTTP endpoints in production.
- **Risk:** Medium — requires certificate management infrastructure; use cert-manager or Let's Encrypt with nginx-proxy.

---

*End of Architecture Report*