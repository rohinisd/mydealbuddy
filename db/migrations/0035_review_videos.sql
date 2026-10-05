-- Customers can attach videos to their own review, mirroring
-- customer_review_photo (0033) but for video files. Capped lower (2, not 5)
-- given video storage/bandwidth cost is much higher than a photo's.
CREATE TABLE customer_review_video (
  id         BIGSERIAL PRIMARY KEY,
  review_id  BIGINT NOT NULL REFERENCES customer_product_review(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_review_video_review_id_idx ON customer_review_video (review_id);
