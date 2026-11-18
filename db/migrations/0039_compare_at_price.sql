-- Admin-set "was" price for showing a genuine strikethrough discount (e.g.
-- Macy's-style "$21.99 (73% off) $80.00"). NULL means no discount badge is
-- shown. Deliberately separate from price_min (CJ's own "suggested retail",
-- which is a marketing multiplier, not a real former price) -- this column
-- only gets set when the admin is running an actual promotion, so the
-- discount shown to customers is never fabricated.
ALTER TABLE cj_product ADD COLUMN compare_at_price NUMERIC(12,2);
