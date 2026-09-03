-- Adds real sales-tax tracking (order-wide, both payment methods) and Stripe
-- as a second payment method alongside PayPal.

ALTER TABLE customer_order ADD COLUMN tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE customer_order ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'paypal' CHECK (payment_method IN ('paypal', 'stripe'));
ALTER TABLE customer_order ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE customer_order ADD COLUMN stripe_refund_id TEXT;

ALTER TABLE paypal_pending_order ADD COLUMN tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Mirrors paypal_pending_order (0015_paypal_orders.sql): bridges Stripe's
-- create-payment-intent step to its confirm step without trusting anything
-- the client sends at confirm time except which PaymentIntent to confirm.
CREATE TABLE stripe_pending_order (
  stripe_payment_intent_id TEXT PRIMARY KEY,
  customer_id         BIGINT REFERENCES customer(id),
  lines_json          JSONB NOT NULL,
  coupon_code         TEXT,
  subtotal            NUMERIC(10,2) NOT NULL,
  discount_amount     NUMERIC(10,2) NOT NULL,
  shipping_amount     NUMERIC(10,2) NOT NULL,
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  buddy_coins_earned  INT NOT NULL,
  shipping_json       JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
