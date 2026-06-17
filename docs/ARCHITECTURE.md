# PayFlow — Platform Architecture Reference

> **Version:** 1.0 · **Status:** Living Document  
> **Audience:** Engineers, Architects, Product Managers, Stakeholders

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [Container & Service Map](#3-container--service-map)
4. [Payment Flow Lifecycle](#4-payment-flow-lifecycle)
5. [Routing Engine](#5-routing-engine)
6. [Provider Architecture](#6-provider-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Applications & Responsibilities](#9-applications--responsibilities)
10. [UI/UX Workflow Documentation](#10-uiux-workflow-documentation)
11. [Infrastructure & Scalability](#11-infrastructure--scalability)
12. [Future Improvements](#12-future-improvements)

---

## 1. Platform Overview

PayFlow is a **multi-tenant payment orchestration platform** that enables merchants to route customer payments dynamically across multiple payment providers (Stripe, PayPal, and future adapters) with zero downtime failover, weighted traffic distribution, and rule-based conditional routing.

### Ecosystem Components

| Component | Technology | Port | Responsibility |
|---|---|---|---|
| **public-site** | Static HTML/Nginx | 8082 | Marketing website, contact sales |
| **saas-laravel** | Laravel 11 + Inertia + React | 80 | Merchant self-service dashboard |
| **admin-laravel** | Laravel 11 + Inertia + React | 8083 | Platform administration |
| **payments** | Python FastAPI | 8080 (via gateway) | Payment creation, routing, callbacks |
| **gateway** | Nginx | 8080 | Public API reverse proxy |
| **saas-gateway** | Nginx | 80 | SaaS app reverse proxy |
| **admin-gateway** | Nginx | 8083 | Admin app reverse proxy |
| **gateway-verification** | Node.js | internal | API key auth, rate-limiting middleware |
| **payments-db** | PostgreSQL 15 | internal | Payments, routing, credentials |
| **payments-logs-db** | PostgreSQL 15 | internal | Payment event logs (separate schema) |
| **redis** | Redis latest | internal | Health state cache, routing cache |
| **rabbitmq** | RabbitMQ 3 | 15672 (mgmt) | Async messaging, queue workers |
| **merchant-demo** | Static | 3001 | Reference merchant integration |

### Key Design Principles

- **Multi-tenancy**: Every credential, routing rule, and health signal is scoped to `merchant_id + environment`.
- **Provider-agnostic**: All providers implement a single `PaymentProviderAdapter` protocol. Adding a new provider requires one new file.
- **Credential isolation**: No shared provider keys. Each merchant connects their own Stripe/PayPal account.
- **Environment separation**: `test` and `live` environments are fully isolated at every layer.
- **Idempotency-first**: Every payment and provider call carries an idempotency key to prevent duplicate charges.
- **Shared database**: Laravel and FastAPI share the same PostgreSQL instance with no direct HTTP calls between them.

---

## 2. System Architecture

### Overall System Architecture

```mermaid
graph TB
    subgraph "Public Internet"
        Browser["Customer Browser"]
        MerchantApp["Merchant Application"]
        AdminUser["Platform Admin"]
    end

    subgraph "Edge / Reverse Proxies"
        PublicNginx["public-site :8082<br/>Marketing Site (Nginx)"]
        SaaSNginx["saas-gateway :80<br/>Merchant Portal (Nginx)"]
        AdminNginx["admin-gateway :8083<br/>Admin Panel (Nginx)"]
        GatewayNginx["gateway :8080<br/>Payments API (Nginx)"]
    end

    subgraph "Application Layer"
        SaaSApp["saas-laravel<br/>Laravel 11 + Inertia/React<br/>Merchant Dashboard"]
        AdminApp["admin-laravel<br/>Laravel 11 + Inertia/React<br/>Admin Console"]
        PaymentsAPI["payments<br/>Python FastAPI<br/>Orchestration Engine"]
        GatewayVerify["gateway-verification<br/>Node.js<br/>Auth + Rate Limiting"]
    end

    subgraph "Messaging & Cache"
        Redis["Redis<br/>Health Cache<br/>Routing Cache"]
        RabbitMQ["RabbitMQ<br/>Async Queues<br/>Retry Workers"]
    end

    subgraph "Data Layer"
        PaymentsDB[("payments-db<br/>PostgreSQL 15<br/>Primary Store")]
        LogsDB[("payments-logs-db<br/>PostgreSQL 15<br/>Event Logs")]
    end

    subgraph "Payment Providers"
        Stripe["Stripe API<br/>api.stripe.com"]
        PayPal["PayPal API<br/>api-m.paypal.com"]
        FutureProvider["Future Provider<br/>(adapter interface)"]
    end

    Browser --> PublicNginx
    Browser --> SaaSNginx --> SaaSApp
    AdminUser --> AdminNginx --> AdminApp
    MerchantApp --> GatewayNginx --> GatewayVerify --> PaymentsAPI

    SaaSApp --> PaymentsDB
    AdminApp --> PaymentsDB
    AdminApp --> LogsDB
    SaaSApp --> LogsDB

    PaymentsAPI --> PaymentsDB
    PaymentsAPI --> LogsDB
    PaymentsAPI --> Redis
    PaymentsAPI --> RabbitMQ

    PaymentsAPI --> Stripe
    PaymentsAPI --> PayPal
    PaymentsAPI -.-> FutureProvider

    GatewayVerify --> Redis
    GatewayVerify --> PaymentsDB

    style PaymentsAPI fill:#4f46e5,color:#fff
    style PaymentsDB fill:#0f766e,color:#fff
    style LogsDB fill:#0f766e,color:#fff
    style Redis fill:#dc2626,color:#fff
    style RabbitMQ fill:#ea580c,color:#fff
```

### Multi-Tenant Architecture

```mermaid
graph LR
    subgraph "Merchant A"
        A_Creds["Stripe Key A\nPayPal Key A"]
        A_Rules["Routing Rules A\nWeighted: Stripe 70%\nPayPal 30%"]
        A_Health["Health State A\nper-provider"]
    end

    subgraph "Merchant B"
        B_Creds["Stripe Key B\nOnly Stripe"]
        B_Rules["Routing Rules B\nPriority: Stripe → PayPal"]
        B_Health["Health State B\nper-provider"]
    end

    subgraph "Shared Infrastructure"
        DB[("PostgreSQL\nAll data keyed by\nmerchant_id")]
        Redis["Redis\nAll keys namespaced\nrouting:health:{merchant_id}:{env}:{alias}"]
        Engine["Routing Engine\nResolves per-merchant\nconfiguration at runtime"]
    end

    A_Creds --> DB
    A_Rules --> DB
    A_Health --> Redis
    B_Creds --> DB
    B_Rules --> DB
    B_Health --> Redis

    Engine --> DB
    Engine --> Redis

    style DB fill:#0f766e,color:#fff
    style Redis fill:#dc2626,color:#fff
    style Engine fill:#4f46e5,color:#fff
```

---

## 3. Container & Service Map

### Network Topology

```mermaid
graph TB
    subgraph "External Ports"
        P80[":80 — Merchant Portal"]
        P8082[":8082 — Marketing Site"]
        P8083[":8083 — Admin Panel"]
        P8080[":8080 — Payments API"]
        P3001[":3001 — Demo Merchant"]
        P15672[":15672 — RabbitMQ UI"]
    end

    subgraph "Docker Compose Network"
        SaasGW["saas-gateway (Nginx)"]
        AdminGW["admin-gateway (Nginx)"]
        GW["gateway (Nginx)"]
        GWV["gateway-verification (Node.js)"]

        SaasL["saas-laravel (PHP-FPM)"]
        AdminL["admin-laravel (PHP-FPM)"]
        Payments["payments (Uvicorn)"]

        PDB[("payments-db\nPostgres 15")]
        LDB[("payments-logs-db\nPostgres 15")]
        RD["redis"]
        RMQ["rabbitmq"]
    end

    P80 --> SaasGW --> SaasL --> PDB & LDB
    P8083 --> AdminGW --> AdminL --> PDB & LDB
    P8080 --> GW --> GWV --> Payments
    P3001 --> DemoApp["merchant-demo"]
    P8082 --> PubSite["public-site"]
    P15672 --> RMQ

    Payments --> PDB & LDB & RD & RMQ

    DemoApp --> GW
```

### Service Startup Order

```
rabbitmq, redis, payments-db, payments-logs-db  (infrastructure)
          ↓
       payments  (waits for all four to be healthy)
          ↓
  gateway, gateway-verification  (waits for payments healthy)
          ↓
  saas-laravel, admin-laravel  (waits for DBs healthy)
          ↓
  saas-gateway, admin-gateway  (waits for respective Laravel)
          ↓
  public-site, merchant-demo  (waits for gateway/saas-gateway)
```

---

## 4. Payment Flow Lifecycle

### Full End-to-End Payment Flow

```mermaid
sequenceDiagram
    actor Customer
    participant Store as Merchant Store
    participant GW as Gateway (Nginx)
    participant GWV as gateway-verification (Node.js)
    participant API as payments (FastAPI)
    participant Engine as Routing Engine
    participant DB as payments-db
    participant Logs as payments-logs-db
    participant Redis as Redis
    participant Stripe as Stripe API

    Customer->>Store: Clicks "Pay"
    Store->>GW: POST /api/v1/payments<br/>Authorization: Bearer pk_test_xxx
    GW->>GWV: Forward request for auth

    GWV->>Redis: Check gateway_access_profiles cache
    Redis-->>GWV: Cache miss
    GWV->>DB: SELECT * FROM gateway_access_profiles<br/>WHERE api_key_hash = ?
    DB-->>GWV: Profile found (merchant_id, scopes, rate_limit)
    GWV->>Redis: Cache profile (TTL: 5m)
    GWV-->>GW: Auth OK → forward to payments

    GW->>API: POST /api/v1/payments (with merchant context)

    API->>DB: SELECT * FROM payments WHERE order_id = ?<br/>(idempotency check)
    DB-->>API: No existing payment

    API->>Engine: plan(merchant_id, request)
    Engine->>DB: SELECT connected providers for merchant
    Engine->>Redis: Check health state for each provider
    Engine->>DB: SELECT routing rules (priority order)
    Engine-->>API: RoutingPlan{strategy: "priority", candidates: [stripe, paypal]}

    API->>DB: INSERT INTO payments (status=PENDING)
    API->>Logs: INSERT INTO payment_logs (EVENT_PAYMENT_CREATED)
    API->>DB: COMMIT

    Note over API: Provider failover loop begins

    API->>DB: Resolve merchant Stripe credentials<br/>SELECT * FROM merchant_provider_credentials
    DB-->>API: {secret_key: "sk_test_..."}

    API->>Stripe: POST /v1/checkout/sessions<br/>Idempotency-Key: {key}:{stripe}
    Stripe-->>API: {id: "cs_xxx", url: "https://checkout.stripe.com/..."}

    API->>DB: UPDATE payments SET provider_reference, checkout_url
    API->>Logs: UPDATE payment_logs (success)
    API->>Redis: record_success → delete health quarantine key

    API-->>GW: {payment_id, payment_url, status: "PAYMENT_PENDING"}
    GW-->>Store: 200 OK
    Store-->>Customer: Redirect to Stripe checkout page

    Customer->>Stripe: Completes payment
    Stripe->>API: GET /api/v1/payments/provider-return/stripe?payment_id=&session_id=

    API->>DB: Fetch payment (get merchant_id + environment)
    API->>DB: Resolve Stripe credentials for merchant
    API->>Stripe: GET /v1/checkout/sessions/{session_id}
    Stripe-->>API: {payment_status: "paid"}

    API->>DB: UPDATE payments SET status=PAYMENT_FINISHED
    API->>Logs: INSERT payment_log (EVENT_PROVIDER_PAYMENT_ACCEPTED)

    Customer-->>Store: Success page shown
```

### Payment Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PAYMENT_PENDING: POST /api/v1/payments\nPayment record created

    PAYMENT_PENDING --> PAYMENT_PROCESSING: Customer submits\nat provider checkout
    PAYMENT_PENDING --> PAYMENT_CANCELLED: Customer clicks cancel\n(provider-return/cancel)
    PAYMENT_PENDING --> PAYMENT_FAILED: All providers fail\nor provider HTTP error
    PAYMENT_PENDING --> PAYMENT_EXPIRED: Checkout session\nexpires without action

    PAYMENT_PROCESSING --> PAYMENT_FINISHED: Provider confirms\npayment_status = paid
    PAYMENT_PROCESSING --> PAYMENT_FAILED: Provider declines

    PAYMENT_FINISHED --> PAYMENT_REFUNDED: Full refund issued
    PAYMENT_FINISHED --> PAYMENT_PARTIALLY_REFUNDED: Partial refund
    PAYMENT_FINISHED --> PAYMENT_DISPUTED: Chargeback initiated

    PAYMENT_REFUNDED --> [*]
    PAYMENT_PARTIALLY_REFUNDED --> [*]
    PAYMENT_FAILED --> [*]
    PAYMENT_CANCELLED --> [*]
    PAYMENT_EXPIRED --> [*]
    PAYMENT_DISPUTED --> [*]
```

| Status Code | Name | Description |
|---|---|---|
| 1 | `PAYMENT_PENDING` | Created, awaiting provider checkout |
| 2 | `PAYMENT_FINISHED` | Successfully completed and captured |
| 3 | `PAYMENT_FAILED` | Provider declined or all providers failed |
| 4 | `PAYMENT_PROCESSING` | Customer submitted, awaiting provider confirmation |
| 5 | `PAYMENT_CANCELLED` | Cancelled by customer before capture |
| 6 | `PAYMENT_REFUNDED` | Full refund issued |
| 7 | `PAYMENT_PARTIALLY_REFUNDED` | Partial refund issued |
| 8 | `PAYMENT_DISPUTED` | Chargeback or dispute initiated |
| 9 | `PAYMENT_EXPIRED` | Session expired without action |

---

## 5. Routing Engine

### Routing Decision Waterfall

```mermaid
flowchart TD
    Start([Payment Request\n merchant_id + environment]) --> A

    A["1. Load connected providers\nSELECT FROM merchant_provider_credentials\nWHERE status IN active, validated, pending"]

    A --> B{Any providers\nconfigured?}
    B -- No --> Z1["Return: unavailable\n503 No providers configured"]
    B -- Yes --> C

    C["2. Apply alias override\nIf request.alias is set\nfilter to that provider only"]

    C --> D{Any candidates\nremain?}
    D -- No --> Z2["Return: unavailable\n503 Requested provider not connected"]
    D -- Yes --> E

    E["3. Health check filter\nFor each candidate:\nRedis GET routing:health:{merchant}:{env}:{alias}\nIf disabled → skip"]

    E --> F{Any healthy\ncandidates?}
    F -- No --> Z3["Return: health_blocked\n503 All providers quarantined"]
    F -- Yes --> G

    G["4. Conditional rule matching\nSELECT FROM provider_routing_rules\nWHERE merchant_id = ? AND enabled = true\nORDER BY priority ASC\nFirst matching rule wins"]

    G --> H{Rule matched?}
    H -- Yes --> I["Strategy: conditional\nPut matched provider first\nAppend failover chain"]
    H -- No --> J

    J["5. Load routing configuration\nSELECT FROM provider_routing_configurations\nWHERE merchant_id = ? AND environment = ?"]

    J --> K{Config exists\nand enabled?}
    K -- No --> L["Strategy: priority\nDefault order: stripe → paypal"]
    K -- Yes --> M

    M{config.strategy?}
    M -- weighted --> N["Weighted distribution\nSHA-256 hash bucket\nhash(event_id:order_id) % total_weight\nDeterministic per-transaction"]
    M -- priority/other --> O["Priority chain\nOrder by config.priority_chain"]

    N --> P["Append failover chain\nfailover_chain from config"]
    O --> P
    I --> Q[Return RoutingPlan]
    L --> Q
    P --> Q

    Q([RoutingPlan\nstrategy, candidates ordered,\nfailover chain, snapshot])

    style Z1 fill:#dc2626,color:#fff
    style Z2 fill:#dc2626,color:#fff
    style Z3 fill:#dc2626,color:#fff
    style Q fill:#059669,color:#fff
```

### Provider Failover Flow

```mermaid
sequenceDiagram
    participant Service as PaymentCreationService
    participant Redis as Redis
    participant DB as payments-db
    participant Resolver as CredentialResolver
    participant Stripe as StripeConnector
    participant PayPal as PayPalConnector
    participant Health as ProviderHealthMonitor

    Note over Service: routing_plan.candidates = [stripe, paypal]

    loop For each candidate in order
        Service->>Redis: is_available(merchant, env, stripe)?
        Redis-->>Service: not quarantined ✓

        Service->>Resolver: resolve(merchant_id, "stripe", "test")
        Resolver->>DB: SELECT merchant_provider_credentials<br/>WHERE provider=stripe AND status=active
        DB-->>Resolver: {secret_key: "sk_test_..."}
        Resolver-->>Service: ProviderCredentials

        Service->>Stripe: create_checkout(request, credentials)

        alt Stripe succeeds
            Stripe-->>Service: CheckoutSession{url, reference}
            Service->>Health: record_success(stripe)
            Health->>Redis: DELETE quarantine key
            Health->>DB: UPDATE status=healthy, failures=0
            Note over Service: Break loop — success
        else Stripe fails (HTTP 4xx/5xx)
            Stripe-->>Service: HTTPException(502)
            Service->>Health: record_failure(stripe, timed_out=false)
            Health->>DB: consecutive_failures++
            Health->>Redis: If failures >= 3: SET quarantine key TTL=300s
            Note over Service: Continue to next candidate
        else Stripe times out
            Stripe-->>Service: httpx.TimeoutException
            Service->>Health: record_failure(stripe, timed_out=true)
            Health->>DB: timeout_count++
            Health->>Redis: Set quarantine if threshold reached
            Note over Service: Continue to PayPal
        end

        Service->>Redis: is_available(merchant, env, paypal)?
        Redis-->>Service: not quarantined ✓

        Service->>Resolver: resolve(merchant_id, "paypal", "test")
        DB-->>Resolver: {client_id: "...", client_secret: "..."}

        Service->>PayPal: create_checkout(request, credentials)
        PayPal-->>Service: CheckoutSession{url, reference}
        Service->>Health: record_success(paypal)
        Note over Service: Break loop — success
    end

    alt All candidates exhausted
        Service->>DB: UPDATE payments SET status=FAILED
        Service-->>Service: Raise HTTPException(502)
    end
```

### Weighted Distribution Algorithm

```mermaid
flowchart LR
    subgraph "Inputs"
        T["Transaction\nevent_id: 'evt_123'\norder_id: 9876"]
        W["Weights\nStripe: 70\nPayPal: 30"]
    end

    subgraph "Deterministic Hashing"
        H["SHA-256\nhash('evt_123:9876:')"]
        B["Bucket\nhex_to_int(hash) % 100\ne.g. bucket = 47"]
    end

    subgraph "Provider Selection"
        C1["cursor = 0\nStripe weight = 70\n0 + 70 = 70\nbucket 47 < 70 → SELECT STRIPE"]
    end

    subgraph "Result"
        R["RoutingPlan\nPrimary: Stripe\nFallback: PayPal"]
    end

    T --> H
    W --> H
    H --> B
    B --> C1
    C1 --> R

    style R fill:#059669,color:#fff
```

> **Key property:** The same `event_id + order_id` always routes to the same provider within a billing cycle. This ensures idempotent retries do not charge two providers.

### Conditional Rule Execution Order

```mermaid
flowchart TD
    Rules["Rules loaded from DB\nORDER BY priority ASC\ne.g. priority 10, 50, 100, 999"] --> R1

    R1{Rule priority=10\ncurrency='EUR'?}
    R1 -- request.currency != EUR --> R2
    R1 -- request.currency = EUR --> WIN1["Route to Stripe\n(EU provider)"]

    R2{Rule priority=50\nrecurring=true?}
    R2 -- not recurring --> R3
    R2 -- recurring=true --> WIN2["Route to Stripe\n(subscription provider)"]

    R3{Rule priority=100\nmin_amount=500?}
    R3 -- amount < 500 --> R4
    R3 -- amount >= 500 --> WIN3["Route to Stripe\n(high-value)"]

    R4{Rule priority=999\n(catch-all)?}
    R4 -- no match → falls through --> FALL["No conditional match\nFalls through to\nweighted / priority config"]
    R4 -- matches --> WIN4["Default provider"]

    style WIN1 fill:#059669,color:#fff
    style WIN2 fill:#059669,color:#fff
    style WIN3 fill:#059669,color:#fff
    style WIN4 fill:#059669,color:#fff
```

**Rule condition fields:**

| Field | Type | Example |
|---|---|---|
| `country` | string or list | `"US"` or `["US","CA"]` |
| `billing_country` | string or list | `"DE"` |
| `currency` | string or list | `"EUR"` |
| `card_type` | string or list | `"visa"` |
| `payment_method` | string | `"card"` |
| `recurring` | boolean | `true` |
| `min_amount` | decimal | `"100.00"` |
| `max_amount` | decimal | `"999.99"` |
| `channel` | string | `"web"` or `"mobile"` |
| `min_risk_score` | int 0–100 | `75` |
| `max_risk_score` | int 0–100 | `30` |

### Provider Health Monitoring

```mermaid
flowchart TD
    Call["Provider API call\nStripe / PayPal"] --> Result

    Result{Outcome}

    Result -- Success --> S1["record_success()"]
    S1 --> S2["Redis: DELETE quarantine key"]
    S2 --> S3["DB: status=healthy\nconsecutive_failures=0\nfailure_rate=0"]

    Result -- HTTP failure --> F1["record_failure(timed_out=false)"]
    Result -- Timeout --> F2["record_failure(timed_out=true)"]

    F1 --> F3["DB: consecutive_failures++\nlast_error saved"]
    F2 --> F3
    F3 --> F4{failures >= threshold\ndefault: 3}

    F4 -- No --> F5["DB: status=degraded"]
    F4 -- Yes --> F6["DB: status=unhealthy\ndisabled_until = now + 300s"]
    F6 --> F7["Redis: SET routing:health:{merchant}:{env}:{alias}\n= 'disabled' EXPIRY 300s"]

    subgraph "Next Payment Request"
        CHK1["is_available() called"]
        CHK1 --> CHK2["Redis GET key"]
        CHK2 -- 'disabled' --> SKIP["Provider skipped\nby routing engine"]
        CHK2 -- not found --> CHK3["DB check: disabled_until > now?"]
        CHK3 -- Yes --> SKIP
        CHK3 -- No --> OK["Provider available"]
    end

    style SKIP fill:#dc2626,color:#fff
    style OK fill:#059669,color:#fff
```

**Configuration:**

| Parameter | Env Var | Default |
|---|---|---|
| Failure threshold | `ROUTING_FAILURE_THRESHOLD` | `3` |
| Quarantine duration | `ROUTING_PROVIDER_QUARANTINE_SECONDS` | `300s` |
| Redis key pattern | — | `routing:health:{merchant_id}:{env}:{alias}` |

### Idempotency Flow

```mermaid
flowchart TD
    Req["POST /api/v1/payments\norder_id: 9876"] --> IC

    IC["Idempotency check\nSELECT FROM payments\nWHERE order_id = 9876"]

    IC -- Found --> RT["Return existing payment\n{payment_id, status, checkout_url}\nHTTP 200"]
    IC -- Not found --> CR["Create new payment\nand process normally"]

    CR --> PK["Build idempotency key\nrequest.idempotency_key\nOR '{merchant}:{event_id}:{order_id}'"]

    PK --> Loop["Provider failover loop\nPer-attempt key:\n'{base_key}:{provider_alias}'"]

    Loop --> Stripe["Attempt: Stripe\nIdempotency-Key: base:stripe\n→ Stripe deduplicates this"]

    Stripe -- Fails --> PayPal["Attempt: PayPal\nIdempotency-Key: base:paypal\nPayPal-Request-Id: base:paypal\n→ PayPal deduplicates this"]

    style RT fill:#059669,color:#fff
```

---

## 6. Provider Architecture

### Provider Adapter Pattern

```mermaid
classDiagram
    class PaymentProviderAdapter {
        <<Protocol>>
        +alias: str
        +create_checkout(request: CheckoutRequest) CheckoutSession
    }

    class ProviderCredentials {
        +secret_key: str | None
        +client_id: str | None
        +client_secret: str | None
        +base_url: str | None
        +extra: dict
    }

    class CheckoutRequest {
        +payment_id: str
        +merchant_id: str
        +order_id: int
        +amount: Decimal
        +currency: str
        +description: str
        +idempotency_key: str
        +environment: str
        +credentials: ProviderCredentials | None
    }

    class CheckoutSession {
        +provider_reference: str
        +payment_url: str
        +raw_status: str
    }

    class StripeConnector {
        +alias = "stripe"
        -_credentials: ProviderCredentials
        +create_checkout(request) CheckoutSession
        +retrieve_checkout_session(session_id) dict
        -_secret_key() str
    }

    class PayPalConnector {
        +alias = "paypal"
        -_credentials: ProviderCredentials
        +create_checkout(request) CheckoutSession
        +capture_order(order_id, environment) dict
        -_client_id() str
        -_client_secret() str
        -_base_url(environment) str
        -_access_token(base_url) str
    }

    class CredentialResolver {
        +resolve(db, merchant_id, alias, environment) ProviderCredentials
        -_parse(secret_value) ProviderCredentials
    }

    PaymentProviderAdapter <|.. StripeConnector : implements
    PaymentProviderAdapter <|.. PayPalConnector : implements
    StripeConnector ..> ProviderCredentials : uses
    PayPalConnector ..> ProviderCredentials : uses
    CredentialResolver ..> ProviderCredentials : produces
    CheckoutRequest ..> ProviderCredentials : carries
```

### Provider Registry

```python
# payments/app/providers/registry.py
_REGISTRY: dict[str, Type] = {
    "stripe": StripeConnector,
    "paypal": PayPalConnector,
    # "new_provider": NewProviderConnector  ← adding a provider = one line
}

def provider_connector(alias: str, credentials: ProviderCredentials | None = None):
    return _REGISTRY[alias.lower()](credentials=credentials)
```

**To add a new provider:**
1. Create `payments/app/providers/new_provider.py` implementing `PaymentProviderAdapter`
2. Add one entry to `_REGISTRY` in `registry.py`
3. Add return URL handling in `routes/webhooks.py`
4. Register the provider in the `providers` DB table

### Credential Resolution Flow

```mermaid
sequenceDiagram
    participant Service as PaymentCreationService
    participant Resolver as CredentialResolver
    participant DB as payments-db
    participant Connector as StripeConnector

    Note over Service: Before each provider attempt in failover loop

    Service->>Resolver: resolve(db, merchant_id, "stripe", "test")

    Resolver->>DB: SELECT mpc.*<br/>FROM merchant_provider_credentials mpc<br/>JOIN providers p ON p.id = mpc.provider_id<br/>WHERE mpc.merchant_id = {uuid}<br/>AND p.alias = 'stripe'<br/>AND mpc.environment = 'test'<br/>AND mpc.status IN ('active', 'validated')

    alt Credentials found
        DB-->>Resolver: {secret_value: "sk_test_..."}
        Resolver->>Resolver: _parse(secret_value)<br/>JSON → ProviderCredentials<br/>plain string → {secret_key: value}
        Resolver-->>Service: ProviderCredentials{secret_key: "sk_test_..."}
        Service->>Connector: StripeConnector(credentials=creds)
        Connector->>Connector: _secret_key() → creds.secret_key
        Connector-->>Service: OK — will use merchant's own key
    else No credentials / status not active
        DB-->>Resolver: null
        Resolver-->>Service: HTTPException(422, "No active credentials")
        Service->>Service: Log skipped attempt, try next candidate
    end
```

### Sandbox vs Live Separation

| Layer | Test Mode | Live Mode |
|---|---|---|
| API Key | `environment = 'test'` | `environment = 'live'` |
| Credentials | Separate row in `merchant_provider_credentials` | Separate row |
| PayPal URL | `api-m.sandbox.paypal.com` | `api-m.paypal.com` |
| Stripe | Uses test API keys (`sk_test_...`) | Uses live keys (`sk_live_...`) |
| Health state | Namespaced: `routing:health:{id}:test:{alias}` | `routing:health:{id}:live:{alias}` |
| Routing rules | `WHERE environment = 'test'` | `WHERE environment = 'live'` |
| Dashboard filter | Toggle between Test/Live views | |

---

## 7. Database Architecture

### Entity Relationship Overview

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        SMALLINT status "1=active 2=inactive"
        SMALLINT role "1=admin 2=merchant"
    }

    subscriptions {
        UUID id PK
        VARCHAR name UK
        VARCHAR code UK
        NUMERIC monthly_fee
        NUMERIC transaction_fee_percent
        NUMERIC transaction_fee_fixed
        BIGINT included_transactions
    }

    user_subscriptions {
        UUID id PK
        UUID user_id FK
        UUID subscription_id FK
        BIGINT current_period_transactions
        NUMERIC current_period_volume
        SMALLINT status "1=active 2=inactive"
    }

    merchant_api_keys {
        UUID id PK
        VARCHAR hash UK
        VARCHAR key_prefix
        UUID merchant_id FK
        VARCHAR name
        VARCHAR environment "test|live"
        SMALLINT status
        JSONB scopes
        TIMESTAMPTZ last_rotated_at
        TIMESTAMPTZ revoked_at
    }

    gateway_access_profiles {
        UUID id PK
        VARCHAR api_key_hash UK
        UUID merchant_id FK
        VARCHAR merchant_name
        SMALLINT merchant_status
        SMALLINT api_key_status
        UUID subscription_id FK
        JSONB permissions
        JSONB allowed_routes
        JSONB allowed_providers
        INTEGER rate_limit_per_minute
    }

    providers {
        UUID id PK
        VARCHAR name
        VARCHAR alias UK "stripe|paypal"
        VARCHAR url
    }

    merchant_provider_credentials {
        UUID id PK
        UUID merchant_id FK
        UUID provider_id FK
        VARCHAR environment "test|live"
        VARCHAR display_name
        VARCHAR public_key
        TEXT secret_value "JSON or plain key"
        VARCHAR status "pending|active|validated|disabled"
        TIMESTAMPTZ last_validated_at
        TIMESTAMPTZ last_rotated_at
    }

    payments {
        UUID id PK
        UUID merchant_id FK
        UUID provider_id FK
        BIGINT order_id UK
        NUMERIC price
        NUMERIC amount
        VARCHAR provider_reference
        VARCHAR provider_checkout_url
        VARCHAR environment
        VARCHAR routing_strategy
        VARCHAR idempotency_key
        JSONB routing_metadata
        SMALLINT status
    }

    provider_routing_configurations {
        UUID id PK
        UUID merchant_id FK
        VARCHAR environment
        VARCHAR strategy "priority|weighted"
        BOOLEAN enabled
        JSONB priority_chain
        JSONB failover_chain
        JSONB weighted_distribution
    }

    provider_routing_rules {
        UUID id PK
        UUID merchant_id FK
        VARCHAR name
        VARCHAR environment
        VARCHAR provider_alias
        SMALLINT priority
        BOOLEAN enabled
        JSONB conditions
    }

    provider_health_statuses {
        UUID id PK
        UUID merchant_id FK
        UUID provider_id FK
        VARCHAR provider_alias
        VARCHAR environment
        VARCHAR status "healthy|degraded|unhealthy"
        INTEGER consecutive_failures
        INTEGER timeout_count
        TIMESTAMPTZ disabled_until
        TEXT last_error
    }

    payment_routing_attempts {
        UUID id PK
        UUID payment_id FK
        UUID merchant_id FK
        VARCHAR provider_alias
        VARCHAR strategy
        SMALLINT attempt_number
        VARCHAR status "succeeded|failed|timeout|skipped"
        INTEGER latency_ms
        TEXT error_code
        TEXT error_message
        JSONB routing_snapshot
    }

    routing_workflows {
        UUID id PK
        UUID merchant_id FK
        VARCHAR name
        VARCHAR environment
        VARCHAR status "draft|published"
        INTEGER current_version
        JSONB nodes
        JSONB edges
        JSONB validation_errors
    }

    routing_workflow_versions {
        UUID id PK
        UUID workflow_id FK
        INTEGER version
        VARCHAR status
        JSONB nodes
        JSONB edges
        TIMESTAMPTZ published_at
    }

    routing_audit_logs {
        UUID id PK
        UUID actor_id FK
        UUID merchant_id FK
        VARCHAR actor_type
        VARCHAR action
        JSONB before
        JSONB after
    }

    api_requests {
        UUID id PK
        VARCHAR event_id UK
        UUID payment_id FK
        UUID subscription_id FK
        UUID user_id FK
        NUMERIC amount
        VARCHAR source
    }

    users ||--o{ user_subscriptions : "has"
    subscriptions ||--o{ user_subscriptions : "belongs to"
    users ||--o{ merchant_api_keys : "owns"
    merchant_api_keys ||--|| gateway_access_profiles : "synced to"
    users ||--o{ merchant_provider_credentials : "configures"
    providers ||--o{ merchant_provider_credentials : "used in"
    users ||--o{ payments : "creates"
    providers ||--o{ payments : "processes"
    users ||--o{ provider_routing_configurations : "configures"
    users ||--o{ provider_routing_rules : "defines"
    providers ||--o{ provider_health_statuses : "tracked in"
    payments ||--o{ payment_routing_attempts : "generates"
    users ||--o{ routing_workflows : "owns"
    routing_workflows ||--o{ routing_workflow_versions : "versioned as"
    payments ||--o{ api_requests : "audited in"
```

### Separate Logs Database Schema

The `payments-logs-db` contains the `payment_logs` table, isolated for operational scalability:

```sql
CREATE TABLE payment_logs (
    id          UUID PRIMARY KEY,
    payment_id  UUID NOT NULL,
    event_type  SMALLINT NOT NULL,   -- PaymentLogEvent enum
    status      SMALLINT NOT NULL,   -- LogStatus enum
    message     TEXT,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Event types:**

| Code | Event | Meaning |
|---|---|---|
| 1 | `EVENT_PAYMENT_CREATED` | Payment record created |
| 2 | `EVENT_PROVIDER_REQUEST_SENT` | Request dispatched to provider |
| 3 | `EVENT_PROVIDER_PAYMENT_ACCEPTED` | Provider webhook/return received |
| 4 | `EVENT_MERCHANT_NOTIFICATION_SENT` | Outbox message published |
| 5 | `EVENT_PAYMENT_CANCELLED` | Customer cancelled |
| 6 | `EVENT_PAYMENT_REFUNDED` | Refund issued |
| 7 | `EVENT_PAYMENT_EXPIRED` | Session expired |
| 8 | `EVENT_PAYMENT_DISPUTED` | Chargeback initiated |

---

## 8. Security Architecture

### API Authentication Flow

```mermaid
flowchart LR
    subgraph "Merchant Application"
        Key["API Key\npk_test_bfofGI..."]
    end

    subgraph "gateway-verification (Node.js)"
        H["Hash key\nSHA-256(raw_key)"]
        R["Lookup Redis cache\ngateway_access_profiles"]
        DB2["Lookup DB\ngateway_access_profiles\nWHERE api_key_hash = ?"]
        C["Cache result\nTTL: 5 minutes"]
        S["Scope check\nrequest path ∈ allowed_routes?"]
        RL["Rate limit\nrequest count ≤ rate_limit_per_minute"]
    end

    subgraph "payments (FastAPI)"
        BL["Business logic\nPaymentCreationService"]
    end

    Key -->|"Authorization: Bearer"| H
    H --> R
    R -->|"Cache miss"| DB2
    DB2 --> C
    R -->|"Cache hit"| S
    C --> S
    S -->|"Scope OK"| RL
    RL -->|"Under limit"| BL
    S -->|"Scope denied"| ERR1["403 Forbidden"]
    RL -->|"Over limit"| ERR2["429 Too Many Requests"]
```

### Credential Security Model

```mermaid
flowchart TD
    Admin["Admin UI\nAssigns credentials to merchant"] --> DB

    DB[("merchant_provider_credentials\nsecret_value TEXT\nCurrently: plain or base64\nFuture: AES-256-GCM encrypted")]

    DB --> Resolver["CredentialResolver\nresolve(merchant_id, alias, env)"]
    Resolver --> Parse["_parse(secret_value)\nJSON object → ProviderCredentials\nPlain string → {secret_key: value}"]
    Parse --> Connector["Provider Connector\nCredentials used in-memory\nduring HTTP call only"]
    Connector --> Provider["Stripe / PayPal API"]

    Connector -.->|"NEVER"| Log["Logs / DB / Cache"]
    Connector -.->|"NEVER"| ENV["Environment variables\n(removed in P0 fix)"]

    style Log fill:#dc2626,color:#fff
    style ENV fill:#dc2626,color:#fff
    style DB fill:#0f766e,color:#fff
```

### Scope-Based Authorization

| Scope | FastAPI Endpoint | What it grants |
|---|---|---|
| `payments:create` | `POST /api/v1/payments` | Create checkout sessions |
| `payments:read` | `GET /api/v1/payments` | List and retrieve payments |
| `refunds:create` | `POST /api/v1/refunds` | Issue refunds against payments |
| `customers:read` | `GET /api/v1/customers` | Read customer profiles |
| `routing:test` | Routing validation endpoints | Test routing rules in sandbox |
| `webhooks:manage` | Webhook config endpoints | Register/update webhook URLs |

### Tenant Isolation Guarantees

| Resource | Isolation mechanism |
|---|---|
| Provider credentials | `WHERE merchant_id = ?` on every query |
| Routing configuration | `WHERE merchant_id = ? AND environment = ?` |
| Routing rules | Same — no cross-merchant rule inheritance |
| Health state (Redis) | Key prefix: `routing:health:{merchant_id}:...` |
| Health state (DB) | Unique constraint on `(merchant_id, provider_alias, environment)` |
| Payment records | `WHERE merchant_id = ?` enforced by auth header |
| API keys | Each key is scoped to one merchant, hashed before storage |
| Logs | `payment_id` is globally unique (UUID v7), cannot be guessed |

### Idempotency Design

```
Idempotency key hierarchy:

  Level 1 — Payment level
    key = request.idempotency_key
          OR "{merchant_id}:{event_id}:{order_id}"
    Protected by: UNIQUE constraint on payments.order_id

  Level 2 — Provider attempt level
    key = "{level_1_key}:{provider_alias}"
    Sent as: Idempotency-Key header to Stripe
             PayPal-Request-Id header to PayPal
    Result: provider deduplicates on their side too

  If both the platform AND the provider see the same key,
  the customer is never charged twice.
```

---

## 9. Applications & Responsibilities

### Responsibility Boundaries

```mermaid
graph TB
    subgraph "admin-laravel (Port 8083)"
        A1["Merchant CRUD\nCreate / suspend / edit"]
        A2["Provider management\nAssign Stripe/PayPal per merchant"]
        A3["API key generation\nRotate / revoke / scope"]
        A4["Routing workflow builder\nVisual node editor (React Flow)"]
        A5["Platform-wide analytics\nAll merchants / payments"]
        A6["Provider health monitoring\nGlobal health dashboard"]
        A7["Subscription plan management"]
        A8["Routing audit logs\nWho changed what"]
    end

    subgraph "saas-laravel (Port 80)"
        S1["Self-service dashboard\nMerchant's own data only"]
        S2["Payment history\nExport CSV / XLSX / JSON"]
        S3["Routing configuration\nPriority, weighted, rules"]
        S4["Provider health\nMerchant's providers only"]
        S5["API key management\nView own keys"]
        S6["Subscription management\nView plan, usage"]
        S7["Profile management\nName, email, password"]
    end

    subgraph "payments (Port 8080)"
        P1["Payment creation\nRouting + provider call"]
        P2["Provider callbacks\nStripe return / PayPal capture"]
        P3["Routing engine\nDecision logic"]
        P4["Health monitoring\nRecord + query state"]
        P5["Audit logging\nEvery routing attempt"]
        P6["Idempotency enforcement"]
    end

    subgraph "Shared (PostgreSQL)"
        DB[("payments-db\nAll three read/write same tables\nNo direct inter-service HTTP")]
    end

    A1 & A2 & A3 --> DB
    A4 & A5 & A6 --> DB
    S1 & S2 & S3 --> DB
    S4 & S5 & S6 --> DB
    P1 & P2 & P3 & P4 & P5 & P6 --> DB

    style DB fill:#0f766e,color:#fff
```

### Admin vs Merchant Capabilities

| Feature | Admin | Merchant |
|---|---|---|
| Create/edit merchants | ✓ | — |
| Suspend merchants | ✓ | — |
| Assign provider credentials | ✓ | — (self-service planned) |
| Generate API keys | ✓ | View own only |
| View all merchants' payments | ✓ | Own payments only |
| Configure routing (any merchant) | ✓ | Own routing only |
| Override routing rules | ✓ | — |
| Visual workflow builder | ✓ | Limited |
| Global health dashboard | ✓ | Own providers only |
| Platform analytics | ✓ | Own metrics only |
| Manage subscription plans | ✓ | View plan only |

### Gateway Verification Service

The `gateway-verification` Node.js service sits between Nginx and the FastAPI payments service:

1. **Receives** every inbound API request to `gateway:8080`
2. **Hashes** the `Authorization: Bearer` token (SHA-256)
3. **Checks Redis** for a cached `gateway_access_profiles` record
4. **Falls back to DB** on cache miss and caches the result for 5 minutes
5. **Validates** that the requested route is in `allowed_routes`
6. **Enforces** `rate_limit_per_minute`
7. **Forwards** to FastAPI with enriched headers (merchant context)

The FastAPI service **trusts** headers injected by gateway-verification and focuses purely on business logic.

---

## 10. UI/UX Workflow Documentation

### Merchant Onboarding Flow

```mermaid
flowchart TD
    Start([Admin logs in]) --> M1

    M1["Navigate to Merchants\n/admin/merchants"] --> M2

    M2["Click + Add Merchant"] --> M3

    M3["Fill merchant details\n- Name\n- Email\n- Initial status: pending"] --> M4

    M4["System creates:\n- User record (role=merchant)\n- Hashed password auto-generated"] --> M5

    M5["Navigate to merchant Edit page\nAssign payment providers"] --> M6

    M6["Click Assign Provider\n- Select provider (Stripe/PayPal)\n- Select environment (test/live)\n- Enter public_key and secret_value\n- Set status: pending"] --> M7

    M7["System saves to\nmerchant_provider_credentials"] --> M8

    M8["Generate API Key\n- Select merchant\n- Choose environment\n- Select scopes\n- Click Generate"] --> M9

    M9["API key created and shown once\npk_test_xxx... (copy it now)"] --> M10

    M10["Admin activates merchant\nStatus: pending → active"] --> M11

    M11["Sync gateway access profile\nSaas Laravel Job: SyncGatewayAccessProfileJob"] --> M12

    M12["Merchant can now:\n- Login to SaaS dashboard\n- Configure routing\n- Start processing payments"] --> End([Merchant is live])

    style End fill:#059669,color:#fff
```

### Routing Workflow Builder UX (Admin)

```mermaid
flowchart TD
    Start([Admin opens Routing page]) --> R1

    R1["View existing payment routes\n(RouteCard grid)"] --> R2

    R2["Click + New route\n3-step wizard"] --> R3

    subgraph "Wizard Step 1"
        R3["Select merchant\nWho is this route for?"]
    end

    R3 --> R4

    subgraph "Wizard Step 2"
        R4["Name the route\ne.g. 'Default', 'High Value', 'EU'"]
    end

    R4 --> R5

    subgraph "Wizard Step 3"
        R5["Choose environment\nTest mode vs Live payments"]
    end

    R5 --> R6["Route created as draft\nrouting_workflows record"]

    R6 --> R7{Edit mode?}

    R7 -- Simple Editor --> SE["RouteEditorDrawer opens\n(slide-in panel)"]
    R7 -- Visual Builder --> VB["Click 'Visual Builder'\nOpens React Flow canvas"]

    subgraph "Simple Editor"
        SE --> SE1["Choose mode:\nTry in order vs Split traffic"]
        SE1 --> SE2["Add providers\n(merchant's connected providers only)"]
        SE2 --> SE3["Configure failover toggle\nor weight sliders"]
        SE3 --> SE4["Save as draft OR Make it live"]
    end

    subgraph "Visual Builder (React Flow)"
        VB --> VB1["Drag nodes from palette:\nStart, Provider, Condition\nWeighted, Failover, Success, Failure"]
        VB1 --> VB2["Connect edges\n(drag between handles)"]
        VB2 --> VB3["Configure each node\n(sidebar panel)"]
        VB3 --> VB4["Run simulation\nTest routing decisions"]
        VB4 --> VB5["Publish workflow\nor Save as draft"]
    end

    SE4 --> Published["status = 'published'\nRouting engine reads nodes/edges"]
    VB5 --> Published

    Published --> V["Version snapshot created\nrouting_workflow_versions"]
    V --> Audit["Audit log entry\nrouting_audit_logs"]
```

### Provider Configuration Flow (Merchant Self-Service)

```mermaid
flowchart LR
    subgraph "SaaS Dashboard - Routing Page"
        Env["Select environment\nTest / Live toggle"]
        Health["View provider health cards\nHealthy / Degraded / Unhealthy"]
        Policy["Routing policy form\n- Strategy: Priority / Weighted\n- Priority order\n- Failover chain\n- Weighted distribution sliders"]
        Rules["Conditional rules\n- Name, Provider\n- Conditions (country, currency...)\n- Priority number"]
    end

    subgraph "Resulting DB records"
        Config["provider_routing_configurations\nstrategy, priority_chain\nfailover_chain, weighted_distribution"]
        Rule["provider_routing_rules\npriority, conditions, provider_alias"]
    end

    Env --> Health
    Health --> Policy
    Policy --> Config
    Rules --> Rule

    Config --> Engine["PaymentRoutingEngine\nreads on every payment"]
    Rule --> Engine

    style Engine fill:#4f46e5,color:#fff
```

### CFO / Business User Workflow

```mermaid
flowchart TD
    CFO([CFO logs into SaaS Dashboard]) --> D1

    D1["Dashboard overview\nTotal payments / Volume / Success rate"] --> D2

    D2["Payments page\nFilter by: date range, status, provider"] --> D3

    D3["Export data\nCSV / XLSX / JSON for accounting"] --> D4

    D4["Routing page\nReview which provider handles what %"] --> D5

    D5["Adjust weights based on\n- Provider approval rates\n- Processing fees\n- Success metrics"] --> D6

    D6["Save routing policy\nChanges take effect immediately"] --> D7

    D7["Monitor provider health\nCheck for degraded processors"] --> End([Informed routing decision made])

    style End fill:#059669,color:#fff
```

---

## 11. Infrastructure & Scalability

### Redis Usage Map

| Key Pattern | Purpose | TTL |
|---|---|---|
| `routing:health:{merchant_id}:{env}:{alias}` | Provider quarantine flag | 300s (configurable) |
| `gateway_access_profiles:{hash}` | Auth cache in gateway-verification | 300s |
| *(planned)* `routing:config:{merchant_id}:{env}` | Routing config cache | 60s |
| *(planned)* `circuit:{merchant_id}:{env}:{alias}` | Connector-level circuit breaker | dynamic |

### RabbitMQ Queue Architecture

```mermaid
graph LR
    subgraph "Producers"
        API["FastAPI\npayments service"]
        Laravel["Laravel\njob dispatcher"]
    end

    subgraph "RabbitMQ Exchanges"
        DE["Default Exchange"]
    end

    subgraph "Queues (planned)"
        Q1["payments.retry\nAsync provider retry"]
        Q2["webhooks.outbox\nMerchant webhook delivery"]
        Q3["health.checks\nAsync health verification"]
        Q4["notifications\nEmail / Slack alerts"]
    end

    subgraph "Consumers"
        W1["Retry Worker\nExponential backoff"]
        W2["Webhook Worker\nOutbox pattern consumer"]
        W3["Health Worker\nPeriodic provider ping"]
    end

    API --> DE --> Q1 & Q2 & Q3
    Laravel --> DE --> Q4
    Q1 --> W1
    Q2 --> W2
    Q3 --> W3

    style DE fill:#ea580c,color:#fff
```

> **Current state:** RabbitMQ is connected at startup (lifecycle events in `main.py`). Queue-based async failover is a P1 improvement — currently failover is synchronous within the HTTP request lifecycle.

### Async Processing Roadmap

```mermaid
sequenceDiagram
    participant Merchant as Merchant App
    participant API as payments FastAPI
    participant Queue as RabbitMQ
    participant Worker as Retry Worker
    participant Provider as Stripe / PayPal
    participant DB as payments-db

    Note over API,Worker: Current (sync) — Proposed (async)

    Merchant->>API: POST /api/v1/payments
    API->>DB: INSERT payment status=PENDING
    API->>Queue: PUBLISH payments.process{payment_id}
    API-->>Merchant: 202 Accepted{payment_id}

    Note over Queue,Worker: Worker picks up job
    Worker->>DB: Load payment + routing plan
    Worker->>Provider: create_checkout()

    alt Provider succeeds
        Provider-->>Worker: checkout URL
        Worker->>DB: UPDATE status=PENDING, checkout_url=...
        Worker->>Queue: PUBLISH webhooks.notify{merchant_id, payment_id, checkout_url}
    else Provider fails
        Worker->>Queue: Re-queue with next candidate + exponential backoff
        Note over Worker: Attempt 1 → delay 5s<br/>Attempt 2 → delay 30s<br/>Attempt 3 → delay 2m
    end
```

### Caching Strategy

```mermaid
graph TD
    subgraph "Cache Layers"
        L1["L1: Redis\nIn-memory, O(1) reads\nHealth state: 300s TTL\nGateway auth: 300s TTL"]
        L2["L2: PostgreSQL\nPersistent, source of truth\nIndex-optimized queries\nRead on Redis miss"]
    end

    subgraph "Cache Invalidation"
        I1["Health: record_success()\n→ DELETE Redis key immediately"]
        I2["Health: record_failure() threshold\n→ SET Redis key TTL=quarantine_seconds"]
        I3["Gateway profile: API key rotation\n→ Increment cache_version\n→ Old cache evicted on next request"]
    end

    L1 --> L2
    I1 & I2 --> L1
    I3 --> L1
```

### Health Monitoring Dashboard Flow

```mermaid
flowchart LR
    subgraph "Data Sources"
        DB1["provider_health_statuses\nPersistent health history"]
        Redis1["Redis\nLive quarantine state"]
        DB2["payment_routing_attempts\nAttempt success/fail rates"]
    end

    subgraph "Admin Dashboard"
        Strip["StatusStrip\nSystem status · Live routes · Failed attempts"]
        Cards["ProviderHealthPanel\nPer-merchant health cards\nUnhealthy / Degraded / Healthy"]
        Activity["ActivityFeed\nLast 10 routing events + config changes"]
    end

    DB1 --> Cards
    Redis1 --> Cards
    DB2 --> Strip & Activity

    subgraph "Automated Response"
        Q["ProviderHealthMonitor"]
        Q --> A1["3 consecutive failures\n→ quarantine provider 5 min"]
        Q --> A2["Record success\n→ clear quarantine immediately"]
        Q --> A3["Timeout counted separately\n→ affects failure rate metric"]
    end
```

### Scalability Considerations

| Concern | Current approach | Scaling path |
|---|---|---|
| **Payment throughput** | Single FastAPI process (Uvicorn) | Add Gunicorn workers; scale `payments` container horizontally |
| **DB read load** | Direct queries per request | Add read replica; cache routing config in Redis |
| **DB write load** | Synchronous commits | Write to outbox table; async consumer writes to logs |
| **Provider failover latency** | Synchronous (blocks request 15s per timeout) | Move to async queue; return 202 Accepted immediately |
| **Health check accuracy** | Failure recorded after the call | Add pre-call circuit breaker at connector level |
| **Cache consistency** | Redis TTL-based eviction | Subscribe to DB change events (PostgreSQL LISTEN/NOTIFY) |
| **Multi-region** | Single region (Docker Compose) | Deploy payments API per region; shared DB in primary region |

---

## 12. Future Improvements

### Priority Roadmap

| Priority | Item | Impact |
|---|---|---|
| **P0** ✓ | Per-merchant credential resolution from DB | Security / Multi-tenancy |
| **P0** ✓ | Remove global provider fallback | Security / Correctness |
| **P1** | Async queue-based provider failover | Latency / Reliability |
| **P1** | Webhook outbox consumer (merchant notifications) | Payment status accuracy |
| **P1** | Wire `routing_workflows` graph to routing engine | Feature completeness |
| **P2** | `customer_id`, `billing_country`, `channel`, `risk_score` in request | Routing intelligence |
| **P2** | Full payment lifecycle states in UI (CANCELLED, REFUNDED) | Merchant UX |
| **P2** | Circuit breaker at connector level (pre-call) | Latency during degradation |
| **P3** | Encrypt `secret_value` at rest (AES-256-GCM or KMS) | Credential security |
| **P3** | Admin-controlled provider allowlist per merchant | Operational control |
| **P3** | Webhook retry queue with exponential backoff | Delivery reliability |
| **Future** | Additional provider adapters | Provider diversity |
| **Future** | Automatic reconciliation job (sync DB vs provider) | Data integrity |
| **Future** | Merchant-facing analytics charts (approval rates, latency) | Business intelligence |
| **Future** | A/B testing framework for provider comparison | Optimization |

### Webhook Outbox Pattern (P1)

```mermaid
sequenceDiagram
    participant Provider as Stripe / PayPal
    participant API as payments FastAPI
    participant DB as payments-db
    participant Worker as Outbox Worker
    participant Merchant as Merchant Webhook URL

    Provider->>API: GET /provider-return/stripe?payment_id=&session_id=
    API->>DB: UPDATE payments SET status=FINISHED
    API->>DB: INSERT payment_logs (EVENT_MERCHANT_NOTIFICATION_SENT, status=LOG_PENDING)
    API-->>Provider: 200 OK (redirect customer)

    Note over Worker: Polls LOG_PENDING rows

    Worker->>DB: SELECT * FROM payment_logs<br/>WHERE event_type=4 AND status=LOG_PENDING
    Worker->>Merchant: POST merchant_webhook_url {payment_id, status, amount}

    alt Webhook delivered
        Merchant-->>Worker: 200 OK
        Worker->>DB: UPDATE status=LOG_SUCCESS
    else Webhook fails
        Merchant-->>Worker: 5xx or timeout
        Worker->>DB: UPDATE status=LOG_RETRYING
        Note over Worker: Retry with exponential backoff<br/>Max 5 attempts → LOG_BLOCKED
    end
```

### Adding a New Payment Provider

```
1. Create: payments/app/providers/new_provider.py
   - class NewProviderConnector
   - implements: create_checkout(request) → CheckoutSession
   - reads credentials from request.credentials
   - no global env vars

2. Register: payments/app/providers/registry.py
   - _REGISTRY["new_provider"] = NewProviderConnector

3. Webhook route: payments/app/routes/webhooks.py
   - GET /provider-return/new-provider
   - GET /provider-return/new-provider/cancel

4. DB: Insert into providers table
   - ("new_provider", "New Provider", "https://new-provider.example")

5. Admin UI: Automatically appears in provider assignment
   (reads from providers table, no code change needed)

6. Done — merchant connects credentials → routing engine
   picks it up automatically via merchant_provider_credentials
```

---

## Appendix A: API Reference Summary

### Payment Endpoints

| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments` | `payments:create` | Create payment + route to provider |
| `GET` | `/api/v1/payments` | `payments:read` | List merchant payments (paginated) |
| `GET` | `/api/v1/payments/{id}/show` | `payments:read` | Single payment details |
| `GET` | `/api/v1/payments/{id}/tracking` | `payments:read` | Payment event timeline |
| `GET` | `/api/v1/payments/provider-return/stripe` | — | Stripe success callback |
| `GET` | `/api/v1/payments/provider-return/stripe/cancel` | — | Stripe cancel callback |
| `GET` | `/api/v1/payments/provider-return/paypal` | — | PayPal capture callback |
| `GET` | `/api/v1/payments/provider-return/paypal/cancel` | — | PayPal cancel callback |
| `GET` | `/health` | — | Service health check |

### Payment Request Schema

```json
{
  "order_id": 1780059719540,
  "amount": 1,
  "price": "79.99",
  "currency": "USD",
  "country": "US",
  "billing_country": "US",
  "payment_method": "card",
  "card_type": "visa",
  "recurring": false,
  "environment": "test",
  "alias": null,
  "idempotency_key": "merchant-side-uuid",
  "customer_id": "cust_abc123",
  "channel": "web",
  "locale": "en-US",
  "risk_score": 12,
  "metadata": {
    "product_category": "electronics"
  },
  "subscription_id": "uuid-of-subscription",
  "event_id": "unique-event-identifier"
}
```

---

## Appendix B: Environment Variables

### payments service

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection (payments-db) |
| `LOGS_DATABASE_URL` | — | PostgreSQL connection (payments-logs-db) |
| `REDIS_URL` | — | Redis connection |
| `RABBITMQ_URL` | — | RabbitMQ connection |
| `PAYMENT_RETURN_BASE_URL` | `http://localhost:8080/api/v1/payments` | Stripe/PayPal redirect URLs |
| `ROUTING_FAILURE_THRESHOLD` | `3` | Failures before quarantine |
| `ROUTING_PROVIDER_QUARANTINE_SECONDS` | `300` | Quarantine duration |

> **Removed (P0 fix):** `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` are no longer used by the routing engine. Credentials are resolved per-merchant from the database at runtime.

---

*This document reflects the architecture as of June 2026. Update this file when making structural changes to the platform.*
