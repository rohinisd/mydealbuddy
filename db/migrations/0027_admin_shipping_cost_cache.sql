-- Admin pricing tool needs a shipping-cost figure to help set the final
-- selling price, but CJ has no per-product shipping cost field -- it only
-- exists via a live freightCalculate call to a specific destination (same
-- as real checkout). Quoted once to a fixed New Jersey reference address
-- (where the business has tax nexus, see src/lib/tax.ts) and cached here
-- rather than hit CJ's QPS=1 API on every admin page load. NULL until an
-- admin fetches/refreshes it.
ALTER TABLE cj_product ADD COLUMN cached_shipping_cost NUMERIC(12,2);
ALTER TABLE cj_product ADD COLUMN cached_shipping_fetched_at TIMESTAMPTZ;
