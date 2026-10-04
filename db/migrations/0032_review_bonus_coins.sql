-- Writing a (first) review now earns Buddy Coins, matching the product
-- vision doc's rewards list (purchases, referrals, reviews, ...).
ALTER TABLE buddy_coin_ledger DROP CONSTRAINT buddy_coin_ledger_reason_check;
ALTER TABLE buddy_coin_ledger ADD CONSTRAINT buddy_coin_ledger_reason_check
  CHECK (reason IN ('purchase', 'referral_bonus', 'referred_signup_bonus', 'refund_clawback', 'redemption', 'redemption_refund', 'review_bonus'));
