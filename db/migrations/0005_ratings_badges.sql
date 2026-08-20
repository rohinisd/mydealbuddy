-- first_synced_at is set once on INSERT and never touched again (unlike
-- fetched_at, which updates every re-sync) -- used to derive the "new" badge.
ALTER TABLE cj_product ADD COLUMN first_synced_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Admin-controlled only (deal/sale) -- never written by the CJ sync path,
-- so re-syncing a product doesn't clobber a manually curated badge.
ALTER TABLE cj_product ADD COLUMN badges TEXT[] NOT NULL DEFAULT '{}';
