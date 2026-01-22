-- =========================
-- PAYMENT LOGS
-- =========================
CREATE TABLE payment_logs (
    id BIGSERIAL PRIMARY KEY,

    payment_id BIGINT NOT NULL CHECK (payment_id >= 0),

    event_type SMALLINT NOT NULL,
    status     SMALLINT NOT NULL, -- 0=success,1=failed,2=retrying,3=blocked

    message VARCHAR(500),
    payload VARCHAR(500),

    retry_count SMALLINT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_payment_logs_payment_id  ON payment_logs(payment_id);
CREATE INDEX ix_payment_logs_event_type  ON payment_logs(event_type);
CREATE INDEX ix_payment_logs_status      ON payment_logs(status);
CREATE INDEX ix_payment_logs_created_at  ON payment_logs(created_at);
CREATE INDEX ix_payment_logs_next_retry_at ON payment_logs (next_retry_at);
