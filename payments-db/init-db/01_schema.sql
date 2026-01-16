CREATE TYPE payment_status AS ENUM ('pending', 'finished', 'failed');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive');
CREATE TYPE merchant_api_key_status AS ENUM ('active', 'inactive');
CREATE TYPE user_role AS ENUM ('admin', 'merchant');
CREATE TYPE user_status AS ENUM ('active', 'inactive');


CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    email_verified_at TIMESTAMPTZ,
    remember_token VARCHAR(100),

    status user_status NOT NULL DEFAULT 'active',
    role user_role NOT NULL DEFAULT 'merchant',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_status ON users(status);
CREATE INDEX ix_users_role ON users(role);

CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    tokens BIGINT NOT NULL
);

CREATE INDEX ix_subscriptions_name ON subscriptions(name);

CREATE TABLE merchant_api_keys (
    id BIGSERIAL PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,

    merchant_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status merchant_api_key_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_merchant_api_keys_hash ON merchant_api_keys(hash);
CREATE INDEX ix_merchant_api_keys_status ON merchant_api_keys(status);
CREATE INDEX ix_merchant_api_keys_merchant_id ON merchant_api_keys(merchant_id);

CREATE TABLE providers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    alias VARCHAR(255) NOT NULL UNIQUE,
    url VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_providers_alias ON providers(alias);
CREATE INDEX ix_providers_name ON providers(name);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,

    price NUMERIC(10,8) NOT NULL,
    amount NUMERIC(10,8) NOT NULL,

    merchant_id BIGINT NOT NULL REFERENCES users(id),
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    order_id BIGINT NOT NULL UNIQUE,

    status payment_status NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_payments_order_id ON payments(order_id);
CREATE INDEX ix_payments_merchant_id ON payments(merchant_id);
CREATE INDEX ix_payments_provider_id ON payments(provider_id);
CREATE INDEX ix_payments_status ON payments(status);
CREATE INDEX ix_payments_merchant_status ON payments(merchant_id, status);
CREATE INDEX ix_payments_created_at ON payments(created_at);

CREATE TABLE user_subscriptions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id BIGINT NOT NULL REFERENCES subscriptions(id),
    used_tokens BIGINT NOT NULL DEFAULT 0,

    status subscription_status NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_subscription UNIQUE (user_id, subscription_id)
);

CREATE INDEX ix_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX ix_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);

CREATE TABLE api_requests (
    id BIGSERIAL PRIMARY KEY,

    event_id VARCHAR(255) NOT NULL,

    payment_id BIGINT NOT NULL,
    subscription_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    amount NUMERIC(10,8) NOT NULL,
    source VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX idx_api_requests_user_id
    ON api_requests(user_id);

CREATE INDEX idx_api_requests_subscription_id
    ON api_requests(subscription_id);

CREATE UNIQUE INDEX idx_api_requests_event_id
    ON api_requests(event_id);

CREATE INDEX idx_api_requests_payment_id
    ON api_requests(payment_id);

CREATE INDEX idx_api_requests_created_at
    ON api_requests(created_at DESC);
