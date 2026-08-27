-- Mirrors cj_product_video's source column (0011): CJ-synced and
-- admin-uploaded photos now share cj_product_image, distinguished by
-- `source`. Needed so a full CJ re-sync (which bulk-replaces CJ rows) never
-- wipes an admin-added photo, and so individual CJ photos become deletable.
ALTER TABLE cj_product_image
  ADD COLUMN source TEXT NOT NULL DEFAULT 'cj' CHECK (source IN ('cj', 'admin'));
