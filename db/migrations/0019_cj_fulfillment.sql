-- Tracks the real CJ Dropshipping order placed for each line of a paid
-- customer order. One customer_order can map to multiple CJ orders (CJ's
-- createOrderV3 only accepts a single product per order), so this is a
-- one-row-per-line table rather than columns on customer_order itself.
CREATE TABLE customer_order_cj_fulfillment (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES customer_order(id) ON DELETE CASCADE,
  product_id      BIGINT NOT NULL REFERENCES cj_product(id),
  quantity        INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'placed', 'failed')),
  cj_order_id     TEXT,
  cj_order_number TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_order_cj_fulfillment_order_id_idx ON customer_order_cj_fulfillment (order_id);
