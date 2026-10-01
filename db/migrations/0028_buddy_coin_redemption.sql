-- Customers can now spend Buddy Coins for a dollar discount at checkout
-- (see COIN_REDEMPTION_RATE in src/lib/buddy-coins.ts), symmetric with
-- earning them. Tracked on the order itself (receipts/history) and as new
-- ledger reasons (balance accounting + refund reversal).
ALTER TABLE customer_order ADD COLUMN coins_redeemed INT NOT NULL DEFAULT 0;
ALTER TABLE paypal_pending_order ADD COLUMN coins_redeemed INT NOT NULL DEFAULT 0;
ALTER TABLE stripe_pending_order ADD COLUMN coins_redeemed INT NOT NULL DEFAULT 0;

ALTER TABLE buddy_coin_ledger DROP CONSTRAINT buddy_coin_ledger_reason_check;
ALTER TABLE buddy_coin_ledger ADD CONSTRAINT buddy_coin_ledger_reason_check
  CHECK (reason IN ('purchase', 'referral_bonus', 'referred_signup_bonus', 'refund_clawback', 'redemption', 'redemption_refund'));
