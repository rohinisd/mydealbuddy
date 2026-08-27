import "server-only";
import sanitizeHtml from "sanitize-html";
import { pool } from "@/lib/db";

const CJ_API_BASE = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";

// CJ descriptions come from third-party suppliers -- sanitize before storage
// so nothing downstream has to think about untrusted HTML from the supply chain.
function sanitizeDescription(html: string | undefined): string | null {
  if (!html) return null;
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "b", "strong", "i", "em", "u", "span", "ul", "ol", "li", "img", "a", "font", "blockquote"],
    allowedAttributes: {
      img: ["src", "alt", "style", "width", "height"],
      a: ["href", "title", "target"],
      span: ["style"],
      font: ["style"],
      "*": ["style"],
    },
    allowedSchemes: ["https"],
  });
}

interface CjVariant {
  vid: string;
  variantSku: string;
  variantNameEn?: string;
  variantKey?: string;
  barcode?: string;
  barcode2?: string;
  variantSellPrice?: number;
  variantSugSellPrice?: number;
  variantWeight?: number;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantVolume?: number;
  inventories?: { countryCode: string; totalInventory?: number; cjInventory?: number; factoryInventory?: number; verifiedWarehouse?: number }[];
}

interface CjProductDetail {
  pid: string;
  productSku?: string;
  productName?: string;
  productNameEn: string;
  description?: string;
  entryCode?: string;
  bigImage?: string;
  productImageSet?: string[];
  categoryId?: string;
  categoryName?: string;
  supplierName?: string;
  listedNum?: number;
  status?: string;
  variants?: CjVariant[];
}

async function cjFetch(path: string): Promise<Record<string, unknown>> {
  const token = process.env.CJ_ACCESS_TOKEN;
  if (!token) throw new Error("CJ_ACCESS_TOKEN missing from environment");
  const res = await fetch(`${CJ_API_BASE}${path}`, {
    headers: { "CJ-Access-Token": token },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`CJ API error on ${path}: ${data.message}`);
  return data.data;
}

/** Accepts a raw pid, or a CJ product page URL like ".../product/...-p-<pid>.html". */
export function extractPid(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/-p-([A-Za-z0-9-]+)\.html/);
  if (urlMatch) return urlMatch[1];
  return trimmed;
}

// product/query accepts pid, productSku (SPU), or variantSku as alternative
// identifiers, but product-level SPU codes and variant SKU codes look
// identical (CJ's own alphanumeric format, e.g. "CJXX1234567") -- there's no
// way to tell them apart from the string alone, and CJ has no combined
// lookup. Numeric input is always a pid; otherwise try productSku first and
// fall back to variantSku if that 404s.
async function resolveProductDetail(identifier: string): Promise<CjProductDetail> {
  if (/^\d+$/.test(identifier)) {
    return (await cjFetch(`/product/query?pid=${encodeURIComponent(identifier)}`)) as unknown as CjProductDetail;
  }
  try {
    return (await cjFetch(`/product/query?productSku=${encodeURIComponent(identifier)}`)) as unknown as CjProductDetail;
  } catch {
    // product/query is QPS=1 -- space out the fallback retry.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return (await cjFetch(`/product/query?variantSku=${encodeURIComponent(identifier)}`)) as unknown as CjProductDetail;
  }
}

async function upsertCategory(categoryId: string | undefined, categoryName: string | undefined): Promise<string | null> {
  if (!categoryId) return null;
  const leafName = categoryName?.split("/").pop()?.trim() || categoryName || "Uncategorised";
  await pool.query(
    `INSERT INTO cj_category (cj_category_id, name, level, parent_id)
     VALUES ($1, $2, 3, NULL)
     ON CONFLICT (cj_category_id) DO UPDATE SET name = EXCLUDED.name`,
    [categoryId, leafName]
  );
  return categoryId;
}

function parseJsonArrayField(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export interface SyncedProductSummary {
  productDbId: string;
  pid: string;
  nameEn: string;
}

/** Fetches one product from CJ by pid and upserts it into cj_product/variant/image. */
export async function syncProductByPid(pid: string, appCategorySlug: string): Promise<SyncedProductSummary> {
  const detail = await resolveProductDetail(pid);
  if (!detail?.pid) throw new Error(`No CJ product found for pid "${pid}"`);

  const nameEnList = parseJsonArrayField(detail.productName);
  const variants = detail.variants || [];
  // price_min/max drive what customers see -- use CJ's suggested retail, not
  // variantSellPrice (our cost). Displaying cost with no markup means every
  // sale loses money once shipping/fees are added; see the pricing decision
  // this followed. Falls back to cost only if a variant has no suggested price.
  const prices = variants
    .map((v) => Number(v.variantSugSellPrice ?? v.variantSellPrice))
    .filter((n) => !Number.isNaN(n));
  const weights = variants.map((v) => Number(v.variantWeight)).filter((n) => !Number.isNaN(n));

  const categoryId = await upsertCategory(detail.categoryId, detail.categoryName);
  const brand = detail.supplierName?.trim() || "CJ Marketplace";

  const productResult = await pool.query(
    `INSERT INTO cj_product (
       pid, spu, name_en, name_cn, description_html, hs_code, main_image_url,
       category_l3_id, currency, price_min, price_max,
       weight_min_g, weight_max_g, listed_count, sold_out,
       app_category_slug, brand, raw_payload, is_active, fetched_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,'USD',$9,$10,$11,$12,$13,$14,$15,$16,$17, true, now()
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
       is_active = true,
       fetched_at = now()
     RETURNING id`,
    [
      detail.pid,
      detail.productSku ?? null,
      detail.productNameEn,
      nameEnList[0] || null,
      sanitizeDescription(detail.description),
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
  const productDbId = productResult.rows[0].id as string;

  const images = detail.productImageSet || [];
  // Only ever touch source='cj' rows here -- an admin-added photo (see
  // src/lib/product-images.ts, positions offset well past CJ's range) must
  // survive a product being re-synced from CJ.
  await pool.query(`DELETE FROM cj_product_image WHERE product_id = $1 AND source = 'cj'`, [productDbId]);
  for (let i = 0; i < images.length; i++) {
    const url = images[i];
    await pool.query(
      `INSERT INTO cj_product_image (product_id, position, url, url_path, source)
       VALUES ($1, $2, $3, $4, 'cj') ON CONFLICT (product_id, position) DO NOTHING`,
      [productDbId, i, url, url.split("?")[0]]
    );
  }

  for (const v of variants) {
    const variantResult = await pool.query(
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
        productDbId,
        v.vid,
        v.variantSku,
        v.variantNameEn || null,
        v.variantKey || null,
        JSON.stringify({}),
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
    const variantDbId = variantResult.rows[0].id as string;

    for (const inv of v.inventories || []) {
      await pool.query(
        `INSERT INTO cj_variant_inventory (
           vid, variant_id, country_code, total_inventory, cj_inventory,
           factory_inventory, verified_warehouse, fetched_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7, now())
         ON CONFLICT (vid, country_code, fetched_at) DO NOTHING`,
        [v.vid, variantDbId, inv.countryCode, inv.totalInventory ?? null, inv.cjInventory ?? null, inv.factoryInventory ?? null, inv.verifiedWarehouse ?? null]
      );
    }
  }

  // Back-to-back CJ calls can hit the same 1 req/sec limit we saw on product/query.
  // Reviews are supplementary (ratings display) -- don't fail the whole sync over them.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  try {
    await syncProductReviews(detail.pid, productDbId);
  } catch (err) {
    console.error(`Review sync failed for pid ${detail.pid}:`, err instanceof Error ? err.message : err);
  }

  return { productDbId, pid: detail.pid, nameEn: detail.productNameEn };
}

interface CjComment {
  commentId: number;
  comment?: string;
  commentUser?: string;
  score?: number;
  countryCode?: string;
  commentDate?: string;
}

async function syncProductReviews(pid: string, productDbId: string): Promise<void> {
  const data = (await cjFetch(`/product/productComments?pid=${encodeURIComponent(pid)}&pageNum=1&pageSize=50`)) as unknown as {
    list?: CjComment[];
  };
  const comments = data.list || [];

  await pool.query(`DELETE FROM cj_product_review WHERE product_id = $1`, [productDbId]);
  for (const c of comments) {
    if (typeof c.score !== "number") continue;
    await pool.query(
      `INSERT INTO cj_product_review (product_id, cj_comment_id, author_masked, score, body, country_code, source, commented_at)
       VALUES ($1,$2,$3,$4,$5,$6,'CJ',$7)
       ON CONFLICT (cj_comment_id) DO NOTHING`,
      [productDbId, c.commentId, c.commentUser || null, c.score, c.comment || null, c.countryCode || null, c.commentDate || null]
    );
  }
}

export async function setProductActive(productDbId: string, isActive: boolean): Promise<void> {
  await pool.query(`UPDATE cj_product SET is_active = $1 WHERE id = $2`, [isActive, productDbId]);
}

const VALID_BADGES = new Set(["deal", "sale", "new"]);

export async function setProductBadges(productDbId: string, badges: string[]): Promise<void> {
  const filtered = badges.filter((b) => VALID_BADGES.has(b) && b !== "new"); // "new" is auto-derived, not admin-set
  await pool.query(`UPDATE cj_product SET badges = $1 WHERE id = $2`, [filtered, productDbId]);
}
