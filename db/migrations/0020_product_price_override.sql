-- Admin-set selling price. NULL means "use price_min (CJ's suggested retail)
-- as-is", matching current behavior. When set, this is what customers see
-- and pay -- price_min stays untouched as the CJ-sourced reference value.
ALTER TABLE cj_product ADD COLUMN override_price NUMERIC(12,2);
