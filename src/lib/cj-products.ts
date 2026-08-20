import "server-only";
import { pool } from "@/lib/db";
import type { Product } from "@/types/product";

// CJ products have no slug or star rating -- neither is synced yet (reviews
// aren't pulled in by scripts/sync-cj-products.js). Slug is derived
// deterministically here so it's stable across reads without needing storage.
function slugify(name: string, pid: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return `${base}-${pid.slice(-6)}`;
}

interface ProductRow {
  id: string;
  pid: string;
  spu: string | null;
  name_en: string;
  app_category_slug: string | null;
  brand: string | null;
  price_min: string | null;
  price_max: string | null;
  main_image_url: string | null;
  listed_count: number | null;
  sold_out: boolean | null;
}

function rowToProduct(row: ProductRow, imageUrl: string | null, gallery: string[] = []): Product {
  const price = row.price_min ? Number(row.price_min) : 0;
  return {
    id: row.id,
    slug: slugify(row.name_en, row.pid),
    category: row.app_category_slug ?? "auto-home",
    brand: row.brand ?? "CJ Marketplace",
    name: row.name_en,
    price,
    sku: row.spu ?? undefined,
    // CJ's own "suggested retail" is a marketing multiplier, not a market MRP --
    // deliberately not mapped to `mrp` here to avoid inventing fake discounts.
    inStock: row.sold_out !== true,
    swatch: "#e7ecef",
    swatchHover: "#dbe3e0",
    image: imageUrl ?? undefined,
    images: gallery.length ? gallery : undefined,
  };
}

const BASE_QUERY = `
  SELECT p.id, p.pid, p.spu, p.name_en, p.app_category_slug, p.brand,
         p.price_min, p.price_max, p.main_image_url, p.listed_count, p.sold_out
  FROM cj_product p
`;

export async function getAllProducts(): Promise<Product[]> {
  const res = await pool.query(`${BASE_QUERY} ORDER BY p.id`);
  return res.rows.map((row) => rowToProduct(row, row.main_image_url));
}

async function getGallery(productId: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT url FROM cj_product_image WHERE product_id = $1 ORDER BY position`,
    [productId]
  );
  return res.rows.map((r) => r.url as string);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  // Slug is derived, not stored, so fetch everything and match in memory --
  // fine at this catalog size; revisit with a stored/indexed slug column once
  // the synced catalog grows past a few hundred rows.
  const products = await getAllProducts();
  const match = products.find((p) => p.slug === slug);
  if (!match) return undefined;
  match.images = await getGallery(match.id);
  return match;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const res = await pool.query(`${BASE_QUERY} WHERE p.id = $1`, [id]);
  if (!res.rows[0]) return undefined;
  const gallery = await getGallery(id);
  return rowToProduct(res.rows[0], res.rows[0].main_image_url, gallery);
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  // ILIKE over name/brand is plenty for this catalog size. Revisit with a
  // tsvector/trigram index if the synced catalog grows past a few thousand rows.
  const res = await pool.query(
    `${BASE_QUERY} WHERE p.name_en ILIKE $1 OR p.brand ILIKE $1 ORDER BY p.id LIMIT $2`,
    [`%${query}%`, limit]
  );
  return res.rows.map((row) => rowToProduct(row, row.main_image_url));
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const res = await pool.query(`${BASE_QUERY} WHERE p.spu ILIKE $1`, [sku]);
  if (!res.rows[0]) return undefined;
  const gallery = await getGallery(res.rows[0].id);
  return rowToProduct(res.rows[0], res.rows[0].main_image_url, gallery);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const res = await pool.query(`${BASE_QUERY} WHERE p.id = ANY($1)`, [ids]);
  return res.rows.map((row) => rowToProduct(row, row.main_image_url));
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, limit);
}
