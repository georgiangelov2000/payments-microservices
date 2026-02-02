CREATE TABLE provider_payments (
    id SERIAL PRIMARY KEY,

    payment_id INTEGER NOT NULL,
    merchant_id INTEGER NOT NULL,

    provider VARCHAR(50) NOT NULL,

    token VARCHAR(64) NOT NULL UNIQUE,
    payment_url TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_payment_provider UNIQUE (payment_id, provider)
);

-- Indexes
CREATE INDEX ix_provider_payments_payment_id
    ON provider_payments (payment_id);

CREATE INDEX ix_provider_payments_merchant_id
    ON provider_payments (merchant_id);

CREATE INDEX ix_provider_payments_provider
    ON provider_payments (provider);

CREATE INDEX ix_provider_payments_token
    ON provider_payments (token);
