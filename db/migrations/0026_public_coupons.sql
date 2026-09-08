-- Lets admin control which active coupons are safe to advertise inside the
-- app (a general promo code) vs. kept private (e.g. a one-off code given to
-- a specific customer manually) -- defaults true so existing/simple coupon
-- creation behaves the same as before this column existed.
ALTER TABLE coupon ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;
