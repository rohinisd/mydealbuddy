-- Server-side mirror of the (still localStorage-first) wishlist, same
-- write-mirror pattern as customer_cart_item -- exists so a cron can check
-- for price drops, which needs something server-queryable to check against.
-- last_known_price is the baseline a drop is measured against; it only moves
-- when a drop is detected (see sendPriceDropAlerts), not on every sync, so
-- re-syncing the same wishlist doesn't erase the comparison point.
CREATE TABLE customer_wishlist_item (
  id                BIGSERIAL PRIMARY KEY,
  customer_id       BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  product_id        BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  last_known_price  NUMERIC(12,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);
CREATE INDEX customer_wishlist_item_customer_id_idx ON customer_wishlist_item (customer_id);
