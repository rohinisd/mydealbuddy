ALTER TABLE customer_order DROP CONSTRAINT customer_order_status_check;
ALTER TABLE customer_order ADD CONSTRAINT customer_order_status_check
  CHECK (status IN ('pending_payment', 'paid', 'cancelled', 'refunded'));

ALTER TABLE customer_order ADD COLUMN refunded_at TIMESTAMPTZ;
ALTER TABLE customer_order ADD COLUMN paypal_refund_id TEXT;
