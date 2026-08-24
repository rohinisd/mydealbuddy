CREATE TABLE homepage_block (
  id          BIGSERIAL PRIMARY KEY,
  block_type  TEXT NOT NULL CHECK (block_type IN ('hero_slide', 'promo_banner', 'deal_card')),
  position    INT NOT NULL DEFAULT 0,
  pill        TEXT,
  headline    TEXT NOT NULL,
  subcopy     TEXT,
  cta         TEXT,
  href        TEXT NOT NULL,
  bg          TEXT NOT NULL DEFAULT '#eaf1f8',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX homepage_block_type_position_idx ON homepage_block (block_type, position);

-- Seed with the content that was previously hardcoded in page.tsx / HeroCarousel.tsx,
-- so the homepage looks identical after this migration and is immediately editable.
INSERT INTO homepage_block (block_type, position, pill, headline, subcopy, cta, href, bg) VALUES
  ('hero_slide', 0, 'Trending Deals', 'Discover smart deals for everyday living', 'Beauty, home, pets, car accessories & more — all in one place.', 'Shop Now', '/shop', '#eaf1f8'),
  ('hero_slide', 1, 'Deal of the Day', 'Up to 50% off electronics this week', 'Earbuds, power banks, smart watches — while stocks last.', 'Shop Electronics', '/product-category/electronics', '#e7ecfb'),
  ('hero_slide', 2, 'New In', 'Fresh arrivals across every category', 'New this week, curated and ready to ship.', 'See What''s New', '/shop', '#fdeee0');

INSERT INTO homepage_block (block_type, position, headline, subcopy, cta, href, bg) VALUES
  ('promo_banner', 0, 'Beauty Essentials', 'Up to 20% off skincare & haircare', 'Shop Now', '/product-category/beauty-personal-care', '#fde8d8'),
  ('promo_banner', 1, 'Smart Home Finds', 'Save more every day on home upgrades', 'Shop Now', '/product-category/home-kitchen', '#dff3e3'),
  ('promo_banner', 2, 'Health & Fitness Essentials', 'Gear up for your next goal', 'Shop Now', '/product-category/health-fitness', '#e6e1fb');

INSERT INTO homepage_block (block_type, position, headline, subcopy, cta, href, bg) VALUES
  ('deal_card', 0, 'Dovly AI — Improve Your Credit Score', 'Free credit monitoring with AI-powered dispute automation.', 'Get This Deal', '#', '#eaf1f8'),
  ('deal_card', 1, 'Swagbucks Cashback', 'Earn cashback and rewards on everyday online shopping.', 'Join Now', '#', '#eaf1f8'),
  ('deal_card', 2, 'Rakuten — Cash Back at 2,500+ Stores', 'Get a percentage back on purchases at your favorite retailers.', 'Shop Now', '#', '#eaf1f8');
