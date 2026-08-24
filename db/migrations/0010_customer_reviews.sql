-- Real, MyDealBuddy-native reviews -- kept separate from cj_product_review
-- (CJ's own synced review data) rather than writing into it, so CJ-sourced
-- content is never mixed with or mistaken for genuine customer submissions.
CREATE TABLE customer_product_review (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  customer_id  BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)
);
CREATE INDEX customer_product_review_product_id_idx ON customer_product_review (product_id);

-- The "verified buyer" eligibility check (does this customer have an order
-- line for this product) runs on every PDP view for logged-in customers --
-- customer_order_line had no index on product_id until now.
CREATE INDEX customer_order_line_product_id_idx ON customer_order_line (product_id);
