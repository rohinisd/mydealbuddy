ALTER TABLE customer_order ADD COLUMN paypal_order_id TEXT;
ALTER TABLE customer_order ADD COLUMN paypal_capture_id TEXT;

-- Bridges PayPal's create-order step to its capture step without trusting
-- anything the client sends at capture time except which PayPal order to
-- capture. Storing the fully-resolved order here (computed once, from real
-- prices/coupon/shipping) also avoids calling CJ's live shipping API a
-- second time at capture -- which could legitimately return a different
-- quote and create a mismatch between what PayPal charged and what we'd
-- otherwise try to record.
CREATE TABLE paypal_pending_order (
  paypal_order_id     TEXT PRIMARY KEY,
  customer_id         BIGINT REFERENCES customer(id),
  lines_json          JSONB NOT NULL,
  coupon_code         TEXT,
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_amount     NUMERIC(10,2) NOT NULL,
  shipping_amount     NUMERIC(10,2) NOT NULL,
  total                NUMERIC(10,2) NOT NULL,
  buddy_coins_earned  INT NOT NULL,
  shipping_json       JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
