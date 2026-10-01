-- Manual tracker for API keys / subscriptions that have no live API to check
-- automatically (domain renewal, CJ's own account plan, Vercel/Neon billing
-- until those get real API tokens wired up, etc.) -- surfaced on the admin
-- Account Health page alongside the live checks in src/lib/account-health.ts.
CREATE TABLE tracked_subscription (
  id            BIGSERIAL PRIMARY KEY,
  service_name  TEXT NOT NULL,
  account_label TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('api_key', 'subscription')),
  renews_on     DATE,
  warn_days     INT NOT NULL DEFAULT 14,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
