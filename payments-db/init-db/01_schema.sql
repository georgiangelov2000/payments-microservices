-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
    name   VARCHAR(255) NOT NULL UNIQUE,
    price  NUMERIC(10,2) NOT NULL,
    tokens BIGINT NOT NULL CHECK (tokens >= 0)
);

CREATE INDEX ix_subscriptions_name ON subscriptions(name);

-- =========================
-- MERCHANT API KEYS
-- =========================
CREATE TABLE merchant_api_keys (
    id BIGSERIAL PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,

    merchant_id BIGINT NOT NULL CHECK (merchant_id >= 0),

    status SMALLINT NOT NULL DEFAULT 1 CHECK (status >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_merchant_api_keys_hash        ON merchant_api_keys(hash);
CREATE INDEX ix_merchant_api_keys_status      ON merchant_api_keys(status);
CREATE INDEX ix_merchant_api_keys_merchant_id ON merchant_api_keys(merchant_id);

-- =========================
-- PROVIDERS
-- =========================
CREATE TABLE providers (
    id BIGSERIAL PRIMARY KEY,
    name  VARCHAR(255) NOT NULL,
    alias VARCHAR(255) NOT NULL UNIQUE,
    url   VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_providers_alias ON providers(alias);
CREATE INDEX ix_providers_name  ON providers(name);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,

    price  NUMERIC(10,8) NOT NULL,
    amount NUMERIC(10,8) NOT NULL,

    merchant_id BIGINT NOT NULL CHECK (merchant_id >= 0),
    provider_id BIGINT NOT NULL CHECK (provider_id >= 0),
    order_id    BIGINT NOT NULL UNIQUE CHECK (order_id >= 0),

    status SMALLINT NOT NULL DEFAULT 1, -- 1=pending,2=finished,3=failed

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_payments_order_id        ON payments(order_id);
CREATE INDEX ix_payments_merchant_id     ON payments(merchant_id);
CREATE INDEX ix_payments_provider_id     ON payments(provider_id);
CREATE INDEX ix_payments_status          ON payments(status);
CREATE INDEX ix_payments_merchant_status ON payments(merchant_id, status);
CREATE INDEX ix_payments_created_at      ON payments(created_at);

-- =========================
-- USER SUBSCRIPTIONS
-- =========================
CREATE TABLE user_subscriptions (
    id BIGSERIAL PRIMARY KEY,

    user_id         BIGINT NOT NULL CHECK (user_id >= 0),
    subscription_id BIGINT NOT NULL CHECK (subscription_id >= 0),
    used_tokens     BIGINT NOT NULL DEFAULT 0 CHECK (used_tokens >= 0),

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
    id BIGSERIAL PRIMARY KEY,

    event_id VARCHAR(255) NOT NULL UNIQUE,

    payment_id      BIGINT NOT NULL CHECK (payment_id >= 0),
    subscription_id BIGINT NOT NULL CHECK (subscription_id >= 0),
    user_id         BIGINT NOT NULL CHECK (user_id >= 0),

    amount NUMERIC(10,8) NOT NULL CHECK (amount >= 0),
    source VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_api_requests_user_id         ON api_requests(user_id);
CREATE INDEX ix_api_requests_subscription_id ON api_requests(subscription_id);
CREATE INDEX ix_api_requests_payment_id      ON api_requests(payment_id);
CREATE INDEX ix_api_requests_created_at      ON api_requests(created_at DESC);