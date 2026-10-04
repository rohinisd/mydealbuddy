-- Customers can attach photos to their own review, mirroring the admin
-- product-image pattern (cj_product_image) but scoped to one review.
CREATE TABLE customer_review_photo (
  id         BIGSERIAL PRIMARY KEY,
  review_id  BIGINT NOT NULL REFERENCES customer_product_review(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_review_photo_review_id_idx ON customer_review_photo (review_id);
