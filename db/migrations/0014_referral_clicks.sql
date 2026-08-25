-- Raw click count, not deduplicated by visitor -- matches the client PDF's
-- "Track: Referral clicks" ask literally. Not tied to a customer_id since a
-- click can happen before the visitor ever signs up.
CREATE TABLE referral_click (
  id             BIGSERIAL PRIMARY KEY,
  referral_code  TEXT NOT NULL,
  clicked_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referral_click_code_idx ON referral_click (referral_code);
