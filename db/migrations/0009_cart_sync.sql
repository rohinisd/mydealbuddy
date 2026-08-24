-- Server-side mirror of the localStorage cart, kept only for logged-in
-- customers. Purpose is narrow: power cart-abandonment email detection, not
-- to be the source of truth for rendering the cart (that stays localStorage).
CREATE TABLE customer_cart_item (
  id                       BIGSERIAL PRIMARY KEY,
  customer_id              BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  product_id               BIGINT NOT NULL REFERENCES cj_product(id),
  option_label             TEXT,
  quantity                 INT NOT NULL,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  abandoned_email_sent_at  TIMESTAMPTZ,
  UNIQUE (customer_id, product_id, option_label)
);
CREATE INDEX customer_cart_item_customer_id_idx ON customer_cart_item (customer_id);
