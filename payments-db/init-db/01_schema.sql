-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,

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

    merchant_id UUID NOT NULL,

    status SMALLINT NOT NULL DEFAULT 1 CHECK (status >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_merchant_api_keys_hash        ON merchant_api_keys(hash);
CREATE INDEX ix_merchant_api_keys_status      ON merchant_api_keys(status);
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

-- =========================
-- API REQUESTS
-- =========================
CREATE TABLE api_requests (
    id UUID PRIMARY KEY,

    event_id VARCHAR(255) NOT NULL UNIQUE,

    payment_id      UUID NOT NULL,
    subscription_id UUID NOT NULL,
    user_id         UUID NOT NULL,

    amount NUMERIC(18,8) NOT NULL CHECK (amount >= 0),
    source VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_api_requests_user_id         ON api_requests(user_id);
CREATE INDEX ix_api_requests_subscription_id ON api_requests(subscription_id);
CREATE INDEX ix_api_requests_payment_id      ON api_requests(payment_id);
CREATE INDEX ix_api_requests_created_at      ON api_requests(created_at DESC);
