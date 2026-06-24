-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    legal_name VARCHAR(255),
    logo_url VARCHAR(2048),
    website VARCHAR(2048),
    phone VARCHAR(50),
    tax_id VARCHAR(100),
    country VARCHAR(2),
    city VARCHAR(255),
    postal_code VARCHAR(30),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),

    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    email_verified_at TIMESTAMPTZ,
    remember_token VARCHAR(100),

    status SMALLINT NOT NULL DEFAULT 1, -- 1=active,2=inactive
    role   SMALLINT NOT NULL DEFAULT 2,   -- 1=admin,2=merchant

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_users_email  ON users(email);
CREATE INDEX ix_users_status ON users(status);
CREATE INDEX ix_users_role   ON users(role);

-- =========================
-- SUBSCRIPTIONS
-- =========================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    name   VARCHAR(255) NOT NULL UNIQUE,
    code   VARCHAR(50) NOT NULL UNIQUE,
    monthly_fee NUMERIC(10,2) NOT NULL,
    transaction_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    transaction_fee_fixed NUMERIC(10,2) NOT NULL DEFAULT 0,
    included_transactions BIGINT NOT NULL DEFAULT 0 CHECK (included_transactions >= 0)
);

CREATE INDEX ix_subscriptions_name ON subscriptions(name);
CREATE INDEX ix_subscriptions_code ON subscriptions(code);

-- =========================
-- MERCHANT API KEYS
-- =========================
CREATE TABLE merchant_api_keys (
    id UUID PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(32),

    merchant_id UUID NOT NULL,
    name VARCHAR(255),
    environment VARCHAR(20) NOT NULL DEFAULT 'test',

    status SMALLINT NOT NULL DEFAULT 1 CHECK (status >= 0),
    scopes JSONB DEFAULT '[]'::jsonb,
    last_rotated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_merchant_api_keys_hash        ON merchant_api_keys(hash);
CREATE INDEX ix_merchant_api_keys_key_prefix  ON merchant_api_keys(key_prefix);
CREATE INDEX ix_merchant_api_keys_status      ON merchant_api_keys(status);
CREATE INDEX ix_merchant_api_keys_environment ON merchant_api_keys(environment);
CREATE INDEX ix_merchant_api_keys_merchant_id ON merchant_api_keys(merchant_id);

-- =========================
-- GATEWAY ACCESS PROFILES
-- Denormalized gateway read model.
-- =========================
CREATE TABLE gateway_access_profiles (
    id UUID PRIMARY KEY,
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    merchant_api_key_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    merchant_email VARCHAR(255) NOT NULL,
    merchant_status SMALLINT NOT NULL DEFAULT 1,
    merchant_role SMALLINT NOT NULL DEFAULT 2,
    api_key_status SMALLINT NOT NULL DEFAULT 1,
    subscription_id UUID,
    subscription_name VARCHAR(255),
    subscription_code VARCHAR(50),
    subscription_status SMALLINT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_routes JSONB NOT NULL DEFAULT '[]'::jsonb,
    allowed_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 120,
    cache_version BIGINT NOT NULL DEFAULT 1,
    synced_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_gateway_access_profiles_hash ON gateway_access_profiles(api_key_hash);
CREATE INDEX ix_gateway_access_profiles_merchant_id ON gateway_access_profiles(merchant_id);
CREATE INDEX ix_gateway_access_profiles_subscription_id ON gateway_access_profiles(subscription_id);
CREATE INDEX ix_gateway_access_profiles_fast_auth
    ON gateway_access_profiles(api_key_hash, api_key_status, merchant_status, subscription_status);

-- =========================
-- PROVIDERS
-- =========================
CREATE TABLE providers (
    id UUID PRIMARY KEY,
    name  VARCHAR(255) NOT NULL,
    alias VARCHAR(255) NOT NULL UNIQUE,
    url   VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_providers_alias ON providers(alias);
CREATE INDEX ix_providers_name  ON providers(name);

INSERT INTO providers (id, name, alias, url)
VALUES
    ('01974252-7000-7000-8000-000000000001', 'Stripe', 'stripe', 'https://stripe.com'),
    ('01974252-7000-7000-8000-000000000002', 'PayPal', 'paypal', 'https://paypal.com')
ON CONFLICT (alias) DO UPDATE SET
    name = EXCLUDED.name,
    url = EXCLUDED.url,
    updated_at = now();

-- =========================
-- MERCHANT PROVIDER CREDENTIALS
-- One active credential set per merchant/provider/environment.
-- =========================
CREATE TABLE merchant_provider_credentials (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'test',
    display_name VARCHAR(255),
    public_key VARCHAR(255),
    secret_value TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    last_validated_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT merchant_provider_credentials_unique UNIQUE (merchant_id, provider_id, environment)
);

CREATE INDEX ix_merchant_provider_credentials_merchant_id ON merchant_provider_credentials(merchant_id);
CREATE INDEX ix_merchant_provider_credentials_provider_id ON merchant_provider_credentials(provider_id);
CREATE INDEX ix_merchant_provider_credentials_status ON merchant_provider_credentials(status);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
    id UUID PRIMARY KEY,

    price  NUMERIC(18,8) NOT NULL,
    amount NUMERIC(18,8) NOT NULL,

    merchant_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    order_id    BIGINT NOT NULL UNIQUE CHECK (order_id >= 0),

    provider_reference    VARCHAR(255),
    provider_checkout_url VARCHAR(2048),
    provider_status       VARCHAR(100),
    environment           VARCHAR(20) NOT NULL DEFAULT 'test',
    currency              VARCHAR(3) NOT NULL DEFAULT 'USD',
    country               VARCHAR(2),
    locale                VARCHAR(20),
    channel               VARCHAR(30),
    routing_strategy      VARCHAR(30),
    idempotency_key       VARCHAR(255),
    routing_metadata      JSONB,

    status SMALLINT NOT NULL DEFAULT 1, -- 1=pending,2=finished,3=failed

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_payments_order_id        ON payments(order_id);
CREATE INDEX ix_payments_merchant_id     ON payments(merchant_id);
CREATE INDEX ix_payments_provider_id     ON payments(provider_id);
CREATE INDEX ix_payments_provider_reference ON payments(provider_reference);
CREATE INDEX ix_payments_status          ON payments(status);
CREATE INDEX ix_payments_merchant_status ON payments(merchant_id, status);
CREATE INDEX ix_payments_created_at      ON payments(created_at);
CREATE INDEX ix_payments_environment     ON payments(environment);
CREATE INDEX ix_payments_currency        ON payments(currency);
CREATE INDEX ix_payments_country         ON payments(country);
CREATE INDEX ix_payments_channel         ON payments(channel);
CREATE INDEX ix_payments_routing_strategy ON payments(routing_strategy);
CREATE INDEX ix_payments_idempotency_key ON payments(idempotency_key);

-- =========================
-- PAYMENT ROUTING CONFIGURATION
-- =========================
CREATE TABLE provider_routing_configurations (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'test',
    strategy VARCHAR(30) NOT NULL DEFAULT 'priority',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
    failover_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
    weighted_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT provider_routing_config_unique UNIQUE (merchant_id, environment)
);

CREATE INDEX ix_provider_routing_configurations_merchant_id ON provider_routing_configurations(merchant_id);
CREATE INDEX ix_provider_routing_configurations_environment ON provider_routing_configurations(environment);
CREATE INDEX ix_provider_routing_configurations_strategy ON provider_routing_configurations(strategy);
CREATE INDEX ix_provider_routing_configurations_enabled ON provider_routing_configurations(enabled);

CREATE TABLE provider_routing_rules (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'test',
    provider_alias VARCHAR(255) NOT NULL,
    priority SMALLINT NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_provider_routing_rules_merchant_id ON provider_routing_rules(merchant_id);
CREATE INDEX ix_provider_routing_rules_environment ON provider_routing_rules(environment);
CREATE INDEX ix_provider_routing_rules_provider_alias ON provider_routing_rules(provider_alias);
CREATE INDEX ix_provider_routing_rules_priority ON provider_routing_rules(priority);
CREATE INDEX ix_provider_routing_rules_enabled ON provider_routing_rules(enabled);
CREATE INDEX provider_routing_rules_lookup ON provider_routing_rules(merchant_id, environment, enabled, priority);

CREATE TABLE routing_workflows (
    id UUID PRIMARY KEY,
    merchant_id UUID,
    name VARCHAR(255) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'test',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    current_version INTEGER NOT NULL DEFAULT 1,
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    updated_by UUID,
    published_by UUID,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_routing_workflows_merchant_id ON routing_workflows(merchant_id);
CREATE INDEX ix_routing_workflows_environment ON routing_workflows(environment);
CREATE INDEX ix_routing_workflows_status ON routing_workflows(status);
CREATE INDEX ix_routing_workflows_created_by ON routing_workflows(created_by);
CREATE INDEX ix_routing_workflows_updated_by ON routing_workflows(updated_by);
CREATE INDEX ix_routing_workflows_published_by ON routing_workflows(published_by);

CREATE TABLE routing_workflow_versions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_routing_workflow_versions_workflow_version UNIQUE (workflow_id, version)
);

CREATE INDEX ix_routing_workflow_versions_workflow_id ON routing_workflow_versions(workflow_id);
CREATE INDEX ix_routing_workflow_versions_created_by ON routing_workflow_versions(created_by);

CREATE TABLE provider_health_statuses (
    id UUID PRIMARY KEY,
    provider_id UUID,
    merchant_id UUID,
    provider_alias VARCHAR(255) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'test',
    status VARCHAR(30) NOT NULL DEFAULT 'healthy',
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    timeout_count INTEGER NOT NULL DEFAULT 0,
    failure_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    disabled_until TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ,
    last_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT provider_health_scope_unique UNIQUE (merchant_id, provider_alias, environment)
);

CREATE INDEX ix_provider_health_statuses_provider_id ON provider_health_statuses(provider_id);
CREATE INDEX ix_provider_health_statuses_merchant_id ON provider_health_statuses(merchant_id);
CREATE INDEX ix_provider_health_statuses_provider_alias ON provider_health_statuses(provider_alias);
CREATE INDEX ix_provider_health_statuses_environment ON provider_health_statuses(environment);
CREATE INDEX ix_provider_health_statuses_status ON provider_health_statuses(status);
CREATE INDEX ix_provider_health_statuses_disabled_until ON provider_health_statuses(disabled_until);
CREATE INDEX provider_health_status_lookup ON provider_health_statuses(provider_alias, environment, status);

CREATE TABLE payment_routing_attempts (
    id UUID PRIMARY KEY,
    payment_id UUID,
    merchant_id UUID NOT NULL,
    provider_id UUID,
    provider_alias VARCHAR(255) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'test',
    strategy VARCHAR(30) NOT NULL,
    attempt_number SMALLINT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL,
    idempotency_key VARCHAR(255),
    latency_ms INTEGER,
    error_code TEXT,
    error_message TEXT,
    routing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_payment_routing_attempts_payment_id ON payment_routing_attempts(payment_id);
CREATE INDEX ix_payment_routing_attempts_merchant_id ON payment_routing_attempts(merchant_id);
CREATE INDEX ix_payment_routing_attempts_provider_id ON payment_routing_attempts(provider_id);
CREATE INDEX ix_payment_routing_attempts_provider_alias ON payment_routing_attempts(provider_alias);
CREATE INDEX ix_payment_routing_attempts_environment ON payment_routing_attempts(environment);
CREATE INDEX ix_payment_routing_attempts_strategy ON payment_routing_attempts(strategy);
CREATE INDEX ix_payment_routing_attempts_status ON payment_routing_attempts(status);
CREATE INDEX ix_payment_routing_attempts_idempotency_key ON payment_routing_attempts(idempotency_key);
CREATE INDEX payment_routing_attempts_merchant_time ON payment_routing_attempts(merchant_id, environment, created_at);
CREATE INDEX payment_routing_attempts_provider_status ON payment_routing_attempts(provider_alias, status, created_at);

CREATE TABLE routing_audit_logs (
    id UUID PRIMARY KEY,
    actor_id UUID,
    merchant_id UUID,
    actor_type VARCHAR(30) NOT NULL DEFAULT 'merchant',
    action VARCHAR(100) NOT NULL,
    subject_type VARCHAR(100),
    subject_id UUID,
    before JSONB,
    after JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_routing_audit_logs_actor_id ON routing_audit_logs(actor_id);
CREATE INDEX ix_routing_audit_logs_merchant_id ON routing_audit_logs(merchant_id);
CREATE INDEX ix_routing_audit_logs_actor_type ON routing_audit_logs(actor_type);
CREATE INDEX ix_routing_audit_logs_action ON routing_audit_logs(action);

-- =========================
-- USER SUBSCRIPTIONS
-- =========================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,

    user_id         UUID NOT NULL,
    subscription_id UUID NOT NULL,
    current_period_transactions BIGINT NOT NULL DEFAULT 0 CHECK (current_period_transactions >= 0),
    current_period_volume NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (current_period_volume >= 0),

    status SMALLINT NOT NULL DEFAULT 1, -- 1=active,2=inactive

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_subscription UNIQUE (user_id, subscription_id)
);

CREATE INDEX ix_user_subscriptions_user_id         ON user_subscriptions(user_id);
CREATE INDEX ix_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);


-- Let the application user run development migrations against objects created
-- by this init script. The user is created in 01-users-and-permissions.sh.
DO $$
DECLARE
    object_name text;
BEGIN
    FOR object_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO payments_api', object_name);
    END LOOP;

    FOR object_name IN
        SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO payments_api', object_name);
    END LOOP;
END
$$;
