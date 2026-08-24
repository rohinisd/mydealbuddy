import "server-only";
import { pool } from "@/lib/db";
import type { Product, ProductReview } from "@/types/product";

// Slug is derived deterministically (CJ has no concept of one) so it's
// stable across reads without needing storage.
function slugify(name: string, pid: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return `${base}-${pid.slice(-6)}`;
}

const NEW_BADGE_WINDOW_DAYS = 14;
export const BUDDY_COINS_RATE = 0.05; // 5% of price, rounded

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
  badges: string[] | null;
  first_synced_at: string;
  avg_score: string | null;
  review_count: string | null;
}

function rowToProduct(row: ProductRow, imageUrl: string | null, gallery: string[] = []): Product {
  const price = row.price_min ? Number(row.price_min) : 0;
  const isNew = Date.now() - new Date(row.first_synced_at).getTime() < NEW_BADGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const badges = [...(row.badges ?? []), ...(isNew ? ["new"] : [])] as NonNullable<Product["badges"]>;
  const ratingCount = row.review_count ? Number(row.review_count) : 0;

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
    badges: badges.length ? badges : undefined,
    rating: ratingCount > 0 && row.avg_score ? Number(row.avg_score) : undefined,
    ratingCount: ratingCount > 0 ? ratingCount : undefined,
    buddyCoins: Math.round(price * BUDDY_COINS_RATE) || undefined,
  };
}

// Storefront-facing queries only ever see active products -- deactivating a
// product in the admin panel (src/lib/admin-products.ts) hides it here
// without touching CJ or deleting rows that carts/wishlists may reference.
// avg_score/review_count blend CJ-synced reviews with real customer reviews
// (customer_product_review) -- a real review should move the shown rating
// exactly like a CJ one does.
const BASE_QUERY = `
  SELECT p.id, p.pid, p.spu, p.name_en, p.app_category_slug, p.brand,
         p.price_min, p.price_max, p.main_image_url, p.listed_count, p.sold_out,
         p.badges, p.first_synced_at,
         (SELECT AVG(score) FROM (
            SELECT score FROM cj_product_review WHERE product_id = p.id AND score IS NOT NULL
            UNION ALL
            SELECT rating AS score FROM customer_product_review WHERE product_id = p.id
          ) combined_scores) AS avg_score,
         (SELECT COUNT(*) FROM (
            SELECT 1 AS n FROM cj_product_review WHERE product_id = p.id
            UNION ALL
            SELECT 1 AS n FROM customer_product_review WHERE product_id = p.id
          ) combined_counts) AS review_count
  FROM cj_product p
  WHERE p.is_active = true
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
  const res = await pool.query(`${BASE_QUERY} AND p.id = $1`, [id]);
  if (!res.rows[0]) return undefined;
  const gallery = await getGallery(id);
  return rowToProduct(res.rows[0], res.rows[0].main_image_url, gallery);
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  // ILIKE over name/brand is plenty for this catalog size. Revisit with a
  // tsvector/trigram index if the synced catalog grows past a few thousand rows.
  const res = await pool.query(
    `${BASE_QUERY} AND (p.name_en ILIKE $1 OR p.brand ILIKE $1) ORDER BY p.id LIMIT $2`,
    [`%${query}%`, limit]
  );
  return res.rows.map((row) => rowToProduct(row, row.main_image_url));
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const res = await pool.query(`${BASE_QUERY} AND p.spu ILIKE $1`, [sku]);
  if (!res.rows[0]) return undefined;
  const gallery = await getGallery(res.rows[0].id);
  return rowToProduct(res.rows[0], res.rows[0].main_image_url, gallery);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const res = await pool.query(`${BASE_QUERY} AND p.id = ANY($1)`, [ids]);
  return res.rows.map((row) => rowToProduct(row, row.main_image_url));
}

// description_html can be sizeable, so it's fetched separately from BASE_QUERY
// (used everywhere, including bulk listings) rather than bloating every call site.
export async function getProductDescription(productId: string): Promise<string | undefined> {
  const res = await pool.query(`SELECT description_html FROM cj_product WHERE id = $1`, [productId]);
  return res.rows[0]?.description_html ?? undefined;
}

export async function getProductReviews(productId: string, limit = 20): Promise<ProductReview[]> {
  const [cjRes, customerRes] = await Promise.all([
    pool.query(
      `SELECT id, author_masked, score, body, commented_at
       FROM cj_product_review WHERE product_id = $1 ORDER BY commented_at DESC NULLS LAST LIMIT $2`,
      [productId, limit]
    ),
    pool.query(
      `SELECT r.id, r.rating, r.body, r.created_at, c.first_name
       FROM customer_product_review r
       JOIN customer c ON c.id = r.customer_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC LIMIT $2`,
      [productId, limit]
    ),
  ]);

  const cjReviews: (ProductReview & { sortKey: number })[] = cjRes.rows
    .filter((r) => r.body)
    .map((r) => ({
      id: `cj-${r.id}`,
      author: r.author_masked || "Verified Buyer",
      rating: r.score,
      date: r.commented_at ? new Date(r.commented_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "",
      text: r.body,
      sortKey: r.commented_at ? new Date(r.commented_at).getTime() : 0,
    }));

  const customerReviews: (ProductReview & { sortKey: number })[] = customerRes.rows.map((r) => ({
    id: `c-${r.id}`,
    author: r.first_name as string,
    rating: Number(r.rating),
    date: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    text: r.body,
    verified: true,
    sortKey: new Date(r.created_at).getTime(),
  }));

  return [...cjReviews, ...customerReviews]
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit)
    .map(({ sortKey: _sortKey, ...review }) => review);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, limit);
}
