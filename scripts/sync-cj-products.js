// Pulls a small batch of real products from CJ Dropshipping into the Neon DB.
// Run: node scripts/sync-cj-products.js
//
// For each (appCategory, keyword) pair below, searches CJ for matching
// products, fetches full detail per product, and upserts into cj_product /
// cj_variant / cj_product_image / cj_variant_inventory. app_category_slug is
// stamped from the search bucket since CJ's own category tree doesn't line
// up with src/data/categories.ts.

require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

const CJ_API_BASE = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_ACCESS_TOKEN = process.env.CJ_ACCESS_TOKEN;

if (!CJ_ACCESS_TOKEN) {
  console.error("CJ_ACCESS_TOKEN missing from .env.local");
  process.exit(1);
}

// Small first batch: a few products per app category, to prove the pipeline
// end-to-end. Expand this list (or replace with real category IDs) once
// you're ready to populate the full catalog.
const SEARCH_BUCKETS = [
  { appCategory: "electronics", keyword: "wireless earbuds", limit: 3 },
  { appCategory: "auto-home", keyword: "car phone holder", limit: 3 },
  { appCategory: "home-kitchen", keyword: "kitchen organizer", limit: 3 },
  { appCategory: "beauty-personal-care", keyword: "facial massager", limit: 3 },
];

async function cjFetch(path, opts = {}) {
  const res = await fetch(`${CJ_API_BASE}${path}`, {
    ...opts,
    headers: { "CJ-Access-Token": CJ_ACCESS_TOKEN, ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`CJ API error on ${path}: ${data.message}`);
  return data.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchProductIds(keyword, limit) {
  // v1 /product/list + productNameEn filters correctly; listV2's `keyword` param
  // (lowercase) silently ignores the filter and returns an unrelated default set --
  // confirmed by testing both directly against the live API.
  const data = await cjFetch(`/product/list?pageNum=1&pageSize=${limit}&productNameEn=${encodeURIComponent(keyword)}`);
  return (data.list || []).map((p) => p.pid);
}

async function getProductDetail(pid) {
  return cjFetch(`/product/query?pid=${pid}`);
}

function parseJsonArrayField(raw) {
  // productName / materialName / etc come back as JSON-encoded string arrays, e.g. '["a","b"]'
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function upsertCategory(client, categoryId, categoryName) {
  if (!categoryId) return null;
  const leafName = categoryName?.split("/").pop()?.trim() || categoryName || "Uncategorised";
  await client.query(
    `INSERT INTO cj_category (cj_category_id, name, level, parent_id)
     VALUES ($1, $2, 3, NULL)
     ON CONFLICT (cj_category_id) DO UPDATE SET name = EXCLUDED.name`,
    [categoryId, leafName]
  );
  return categoryId;
}

async function upsertProduct(client, detail, appCategorySlug) {
  const nameEnList = parseJsonArrayField(detail.productName);
  const variants = detail.variants || [];
  const prices = variants.map((v) => Number(v.variantSellPrice)).filter((n) => !Number.isNaN(n));
  const weights = variants.map((v) => Number(v.variantWeight)).filter((n) => !Number.isNaN(n));

  const categoryId = await upsertCategory(client, detail.categoryId, detail.categoryName);
  const brand = detail.supplierName?.trim() || "CJ Marketplace";

  const result = await client.query(
    `INSERT INTO cj_product (
       pid, spu, name_en, name_cn, description_html, hs_code, main_image_url,
       category_l3_id, currency, price_min, price_max,
       weight_min_g, weight_max_g, listed_count, sold_out,
       app_category_slug, brand, raw_payload, fetched_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,'USD',$9,$10,$11,$12,$13,$14,$15,$16,$17, now()
     )
     ON CONFLICT (pid) DO UPDATE SET
       name_en = EXCLUDED.name_en,
       description_html = EXCLUDED.description_html,
       main_image_url = EXCLUDED.main_image_url,
       price_min = EXCLUDED.price_min,
       price_max = EXCLUDED.price_max,
       app_category_slug = EXCLUDED.app_category_slug,
       brand = EXCLUDED.brand,
       raw_payload = EXCLUDED.raw_payload,
       fetched_at = now()
     RETURNING id`,
    [
      detail.pid,
      detail.productSku,
      detail.productNameEn,
      nameEnList[0] || null,
      detail.description || null,
      detail.entryCode || null,
      detail.bigImage || null,
      categoryId,
      prices.length ? Math.min(...prices) : null,
      prices.length ? Math.max(...prices) : null,
      weights.length ? Math.min(...weights) : null,
      weights.length ? Math.max(...weights) : null,
      detail.listedNum ?? null,
      detail.status === "0",
      appCategorySlug,
      brand,
      JSON.stringify(detail),
    ]
  );
  return result.rows[0].id;
}

async function replaceImages(client, productId, images) {
  await client.query(`DELETE FROM cj_product_image WHERE product_id = $1`, [productId]);
  for (let i = 0; i < images.length; i++) {
    const url = images[i];
    const urlPath = url.split("?")[0];
    await client.query(
      `INSERT INTO cj_product_image (product_id, position, url, url_path)
       VALUES ($1, $2, $3, $4) ON CONFLICT (product_id, position) DO NOTHING`,
      [productId, i, url, urlPath]
    );
  }
}

async function upsertVariants(client, productId, variants) {
  for (const v of variants) {
    const attrs = {};
    if (v.variantKey && v.variantKey.includes("-")) {
      const parts = v.variantKey.split("-");
      if (parts.length === 2) attrs.value = v.variantKey; // raw fallback, axis names not reliably known here
    }

    const variantResult = await client.query(
      `INSERT INTO cj_variant (
         product_id, vid, variant_sku, variant_name_en, variant_key_raw, attributes,
         barcode, barcode2, cost_price, suggested_retail, weight_g,
         length_mm, width_mm, height_mm, volume_mm3, image_url, fetched_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
       ON CONFLICT (vid) DO UPDATE SET
         cost_price = EXCLUDED.cost_price,
         suggested_retail = EXCLUDED.suggested_retail,
         fetched_at = now()
       RETURNING id`,
      [
        productId,
        v.vid,
        v.variantSku,
        v.variantNameEn || null,
        v.variantKey || null,
        JSON.stringify(attrs),
        v.barcode || null,
        v.barcode2 || null,
        v.variantSellPrice ?? null,
        v.variantSugSellPrice ?? null,
        v.variantWeight ?? null,
        v.variantLength ?? null,
        v.variantWidth ?? null,
        v.variantHeight ?? null,
        v.variantVolume ?? null,
        null,
      ]
    );
    const variantId = variantResult.rows[0].id;

    for (const inv of v.inventories || []) {
      await client.query(
        `INSERT INTO cj_variant_inventory (
           vid, variant_id, country_code, total_inventory, cj_inventory,
           factory_inventory, verified_warehouse, fetched_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7, now())
         ON CONFLICT (vid, country_code, fetched_at) DO NOTHING`,
        [
          v.vid,
          variantId,
          inv.countryCode,
          inv.totalInventory ?? null,
          inv.cjInventory ?? null,
          inv.factoryInventory ?? null,
          inv.verifiedWarehouse ?? null,
        ]
      );
    }
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let synced = 0;
  for (const bucket of SEARCH_BUCKETS) {
    console.log(`\n--- ${bucket.appCategory} ("${bucket.keyword}") ---`);
    let pids;
    try {
      pids = await searchProductIds(bucket.keyword, bucket.limit);
    } catch (err) {
      console.error(`  search failed: ${err.message}`);
      continue;
    }
    if (!pids.length) {
      console.log("  no results");
      continue;
    }

    for (const pid of pids) {
      try {
        await sleep(1100); // product/query is capped at 1 request/second
        const detail = await getProductDetail(pid);
        const productId = await upsertProduct(client, detail, bucket.appCategory);
        await replaceImages(client, productId, detail.productImageSet || []);
        await upsertVariants(client, productId, detail.variants || []);
        console.log(`  synced: ${detail.productNameEn?.slice(0, 60)}`);
        synced++;
      } catch (err) {
        console.error(`  failed on pid ${pid}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. ${synced} products synced.`);
  await client.end();
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
