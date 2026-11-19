-- The 0007 seed used placeholder category slugs (beauty-personal-care,
-- home-kitchen, health-fitness) that never matched the real CJ taxonomy
-- imported in 0022_app_categories, so all three homepage promo cards 404'd.
-- Repoints them at the closest real, currently-stocked top-level category.
UPDATE homepage_block SET href = '/product-category/health-beauty-and-hair'
  WHERE block_type = 'promo_banner' AND headline = 'Beauty Essentials';
UPDATE homepage_block SET href = '/product-category/home-garden-and-furniture'
  WHERE block_type = 'promo_banner' AND headline = 'Smart Home Finds';
UPDATE homepage_block SET href = '/product-category/sports-and-outdoors'
  WHERE block_type = 'promo_banner' AND headline = 'Health & Fitness Essentials';
