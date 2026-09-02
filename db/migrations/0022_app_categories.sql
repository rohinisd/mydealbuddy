-- Real CJ category tree (client-exported: 14 top categories, 89 groups,
-- 572 leaf categories), replacing the old 6-slug made-up taxonomy in
-- app_category_slug. Every level's slug/name is denormalised onto every row
-- (l1_slug/l1_name always set, l2_* set from level 2 down, l3_* only on
-- leaves) so a single row lookup gives everything needed for breadcrumbs and
-- for scoping a product query to "everything under this branch" -- no
-- recursive parent walk needed at read time.
CREATE TABLE app_category (
  id        BIGSERIAL PRIMARY KEY,
  level     SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  parent_id BIGINT REFERENCES app_category(id),
  slug      TEXT NOT NULL,   -- this node's own slug, unique only among siblings
  name      TEXT NOT NULL,   -- this node's own display name, verbatim from CJ
  l1_slug   TEXT NOT NULL,
  l1_name   TEXT NOT NULL,
  l2_slug   TEXT,
  l2_name   TEXT,
  l3_slug   TEXT,
  l3_name   TEXT,
  full_slug TEXT NOT NULL UNIQUE  -- l1[/l2[/l3]] -- the URL path and product.category value
);
CREATE UNIQUE INDEX app_category_root_slug_idx ON app_category (slug) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX app_category_child_slug_idx ON app_category (parent_id, slug) WHERE parent_id IS NOT NULL;
CREATE INDEX app_category_l1_idx ON app_category (l1_slug);
CREATE INDEX app_category_l1_l2_idx ON app_category (l1_slug, l2_slug);

-- Nullable and deliberately NOT backfilled from the old app_category_slug --
-- there's no reliable automatic mapping from the old 6 broad slugs to the
-- correct one of 572 new leaf categories. Existing products become
-- "Uncategorized" until re-filed by hand via the admin product detail page.
ALTER TABLE cj_product ADD COLUMN app_category_id BIGINT REFERENCES app_category(id);
CREATE INDEX cj_product_app_category_id_idx ON cj_product (app_category_id);

ALTER TABLE cj_product DROP COLUMN app_category_slug;
