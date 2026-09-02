import "server-only";
import { pool } from "@/lib/db";

export interface AdminProductRow {
  id: string;
  pid: string;
  nameEn: string;
  categoryId: string | null;
  categoryLabel: string | null;
  brand: string | null;
  priceMin: number | null;
  overridePrice: number | null;
  mainImageUrl: string | null;
  isActive: boolean;
  badges: string[];
  fetchedAt: string;
}

const CATEGORY_JOIN = `LEFT JOIN app_category ac ON ac.id = p.app_category_id`;
// "L1Name / L2Name / L3Name" -- full breadcrumb so two same-named leaves under
// different top categories (e.g. "Accessories" appears several times) aren't
// ambiguous in the admin list.
const CATEGORY_LABEL_EXPR = `NULLIF(concat_ws(' / ', ac.l1_name, ac.l2_name, ac.l3_name), '')`;

export async function listAllProductsForAdmin(): Promise<AdminProductRow[]> {
  const res = await pool.query(
    `SELECT p.id, p.pid, p.name_en, p.app_category_id, ${CATEGORY_LABEL_EXPR} AS category_label,
            p.brand, p.price_min, p.override_price, p.main_image_url, p.is_active, p.badges, p.fetched_at
     FROM cj_product p ${CATEGORY_JOIN}
     ORDER BY p.fetched_at DESC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    pid: row.pid,
    nameEn: row.name_en,
    categoryId: row.app_category_id ? String(row.app_category_id) : null,
    categoryLabel: row.category_label,
    brand: row.brand,
    priceMin: row.price_min ? Number(row.price_min) : null,
    overridePrice: row.override_price ? Number(row.override_price) : null,
    mainImageUrl: row.main_image_url,
    isActive: row.is_active,
    badges: row.badges ?? [],
    fetchedAt: row.fetched_at,
  }));
}

export interface AdminProductVariantRow {
  id: string;
  variantSku: string;
  variantNameEn: string | null;
  attributes: Record<string, string> | null;
  costPrice: number | null;
  suggestedRetail: number | null;
}

export interface AdminProductDetail {
  id: string;
  pid: string;
  spu: string | null;
  nameEn: string;
  descriptionHtml: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  brand: string | null;
  priceMin: number | null;
  priceMax: number | null;
  overridePrice: number | null;
  mainImageUrl: string | null;
  isActive: boolean;
  badges: string[];
  variants: AdminProductVariantRow[];
}

export async function getProductDetailForAdmin(id: string): Promise<AdminProductDetail | null> {
  const productRes = await pool.query(
    `SELECT p.*, ${CATEGORY_LABEL_EXPR} AS category_label
     FROM cj_product p ${CATEGORY_JOIN} WHERE p.id = $1`,
    [id]
  );
  const row = productRes.rows[0];
  if (!row) return null;

  const variantsRes = await pool.query(
    `SELECT id, variant_sku, variant_name_en, attributes, cost_price, suggested_retail
     FROM cj_variant WHERE product_id = $1 ORDER BY id`,
    [id]
  );

  return {
    id: String(row.id),
    pid: row.pid,
    spu: row.spu,
    nameEn: row.name_en,
    descriptionHtml: row.description_html,
    categoryId: row.app_category_id ? String(row.app_category_id) : null,
    categoryLabel: row.category_label,
    brand: row.brand,
    priceMin: row.price_min ? Number(row.price_min) : null,
    priceMax: row.price_max ? Number(row.price_max) : null,
    overridePrice: row.override_price ? Number(row.override_price) : null,
    mainImageUrl: row.main_image_url,
    isActive: row.is_active,
    badges: row.badges ?? [],
    variants: variantsRes.rows.map((v) => ({
      id: String(v.id),
      variantSku: v.variant_sku,
      variantNameEn: v.variant_name_en,
      attributes: v.attributes,
      costPrice: v.cost_price ? Number(v.cost_price) : null,
      suggestedRetail: v.suggested_retail ? Number(v.suggested_retail) : null,
    })),
  };
}

export async function setProductOverridePrice(id: string, price: number | null): Promise<void> {
  await pool.query(`UPDATE cj_product SET override_price = $1 WHERE id = $2`, [price, id]);
}

export async function setProductCategory(id: string, categoryId: string): Promise<void> {
  await pool.query(`UPDATE cj_product SET app_category_id = $1 WHERE id = $2`, [categoryId, id]);
}
