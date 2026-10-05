-- Admin-controlled seasonal/promotional campaigns: a banner shown site-wide
-- plus an optional Buddy Coins bonus (multiplier on top of the existing
-- tier multiplier, or a flat per-order bonus) for the window it's active.
-- Only ever one "live" campaign is queried for at a time (is_active +
-- current time within [starts_at, ends_at]) -- the admin UI is responsible
-- for not overlapping two active campaigns, there's no DB-level constraint
-- for it given how rarely this changes.
CREATE TABLE campaign (
  id                BIGSERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  banner_text       TEXT NOT NULL,
  coin_bonus_type   TEXT NOT NULL DEFAULT 'none' CHECK (coin_bonus_type IN ('none', 'multiplier', 'flat')),
  coin_bonus_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX campaign_active_window_idx ON campaign (is_active, starts_at, ends_at);

-- A flat per-order campaign bonus is its own ledger reason (so it shows up
-- distinctly in Buddy Coins history), same precedent as review_bonus etc.
-- A multiplier-type bonus instead scales the existing 'purchase' amount
-- directly (same precedent as the loyalty tier multiplier) -- no new reason
-- needed for that case.
ALTER TABLE buddy_coin_ledger DROP CONSTRAINT buddy_coin_ledger_reason_check;
ALTER TABLE buddy_coin_ledger ADD CONSTRAINT buddy_coin_ledger_reason_check
  CHECK (reason IN ('purchase', 'referral_bonus', 'referred_signup_bonus', 'refund_clawback', 'redemption', 'redemption_refund', 'review_bonus', 'campaign_bonus'));

-- Pending orders need the resolved bonus carried from create-intent time
-- through to capture time, same reasoning as coins_redeemed (0028) -- the
-- amount shown/promised at checkout-start is what's honored at payment
-- confirmation, not whatever happens to be active moments later.
ALTER TABLE paypal_pending_order ADD COLUMN campaign_flat_bonus INT NOT NULL DEFAULT 0;
ALTER TABLE paypal_pending_order ADD COLUMN campaign_title TEXT;
ALTER TABLE stripe_pending_order ADD COLUMN campaign_flat_bonus INT NOT NULL DEFAULT 0;
ALTER TABLE stripe_pending_order ADD COLUMN campaign_title TEXT;
