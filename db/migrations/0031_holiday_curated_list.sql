-- Adds "Holiday Collections" as a fifth admin-curated merchandising list,
-- same fixed-set pattern as the other four (see 0023_curated_lists.sql).
ALTER TABLE curated_list_item DROP CONSTRAINT curated_list_item_list_key_check;
ALTER TABLE curated_list_item ADD CONSTRAINT curated_list_item_list_key_check
  CHECK (list_key IN ('hot-deals', 'deal-of-the-day', 'trending-deals', 'new-in', 'holiday-picks'));
