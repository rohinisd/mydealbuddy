-- MDB-005: a 101% coupon was created and accepted with no upper-bound check.
-- The app now rejects it at creation (POST /api/admin/coupons), but a CHECK
-- constraint closes the gap for good -- no future code path can insert a
-- coupon that discounts more than the order is worth.
ALTER TABLE coupon ADD CONSTRAINT coupon_discount_value_positive CHECK (discount_value > 0);
ALTER TABLE coupon ADD CONSTRAINT coupon_percent_not_over_100 CHECK (discount_type <> 'percent' OR discount_value <= 100);
