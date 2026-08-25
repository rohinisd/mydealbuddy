ALTER TABLE buddy_coin_ledger DROP CONSTRAINT buddy_coin_ledger_reason_check;
ALTER TABLE buddy_coin_ledger ADD CONSTRAINT buddy_coin_ledger_reason_check
  CHECK (reason IN ('purchase', 'referral_bonus', 'referred_signup_bonus', 'refund_clawback'));
