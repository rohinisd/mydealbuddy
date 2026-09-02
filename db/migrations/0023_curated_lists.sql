-- Admin-curated product lists for merchandising sections that were
-- previously either automatic (badge-driven) or fake (hardcoded "Deal of
-- the Day" hero text with an unverified "50% off" claim). Only 4 fixed
-- lists exist, hardcoded in application code -- not admin-creatable list
-- types, so a simple CHECK constraint is enough, no separate lookup table.
CREATE TABLE curated_list_item (
  id         BIGSERIAL PRIMARY KEY,
  list_key   TEXT NOT NULL CHECK (list_key IN ('hot-deals', 'deal-of-the-day', 'trending-deals', 'new-in')),
  product_id BIGINT NOT NULL REFERENCES cj_product(id) ON DELETE CASCADE,
  position   INT NOT NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_key, product_id)
);
CREATE INDEX curated_list_item_list_key_position_idx ON curated_list_item (list_key, position);
