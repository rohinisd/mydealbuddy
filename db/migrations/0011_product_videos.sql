-- cj_product_video existed since 0001 but was never wired up (0 rows, no
-- reader/writer anywhere). Extending it rather than replacing it: CJ-synced
-- rows and admin-uploaded rows now share one table, distinguished by `source`
-- -- display logic prefers an admin row (a deliberate override) and falls
-- back to CJ's when one isn't present.
ALTER TABLE cj_product_video
  ADD COLUMN source TEXT NOT NULL DEFAULT 'cj' CHECK (source IN ('cj', 'admin')),
  -- CJ's raw videoUrl/coverURL require browser-like headers CJ's Cloudflare
  -- accepts but a <video> tag can never send, and CJ's own docs say to cache
  -- video server-side rather than hotlink it -- these are OUR re-hosted
  -- Vercel Blob copies, what actually gets served to visitors. `url`/
  -- `cover_url` stay as CJ's originals, kept for reference/re-sync only.
  ADD COLUMN blob_video_url TEXT,
  ADD COLUMN blob_cover_url TEXT,
  ADD COLUMN play_count INT,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX cj_product_video_product_id_idx ON cj_product_video (product_id);
