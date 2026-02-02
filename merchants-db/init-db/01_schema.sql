-- =========================
-- Table: products
-- =========================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX ix_products_name
    ON products (name);

-- =========================
-- Table: orders
-- =========================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,

    product_id INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'finished', 'failed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_orders_product_id
    ON orders (product_id);

CREATE INDEX ix_orders_status
    ON orders (status);

CREATE INDEX ix_orders_created_at
    ON orders (created_at);
