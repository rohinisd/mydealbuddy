-- Fields the storefront needs that CJ's public API doesn't provide directly:
-- which of our fixed nav categories (src/data/categories.ts) a product belongs
-- to, and a display brand (CJ has no brand field -- see report §3).
ALTER TABLE cj_product ADD COLUMN app_category_slug TEXT;
ALTER TABLE cj_product ADD COLUMN brand TEXT;

CREATE INDEX ON cj_product (app_category_slug);
