-- Lets the admin panel "remove" a product from the storefront without
-- touching CJ or hard-deleting rows that carts/wishlists may reference by id.
ALTER TABLE cj_product ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX ON cj_product (is_active);
