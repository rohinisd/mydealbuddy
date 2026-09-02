import "server-only";
import { pool } from "@/lib/db";
import { getProductsByIds } from "@/lib/cj-products";
import type { Product } from "@/types/product";

export const CURATED_LIST_KEYS = ["hot-deals", "deal-of-the-day", "trending-deals", "new-in"] as const;
export type CuratedListKey = (typeof CURATED_LIST_KEYS)[number];

export function isCuratedListKey(value: string): value is CuratedListKey {
  return (CURATED_LIST_KEYS as readonly string[]).includes(value);
}

// Real products only, in the admin's chosen order -- getProductsByIds doesn't
// preserve input order (ANY($1) returns DB order), so we re-sort here.
export async function getCuratedListProducts(listKey: CuratedListKey, limit?: number): Promise<Product[]> {
  const res = await pool.query(
    `SELECT product_id FROM curated_list_item WHERE list_key = $1 ORDER BY position`,
    [listKey]
  );
  const orderedIds: string[] = res.rows.map((r) => String(r.product_id));
  if (orderedIds.length === 0) return [];

  const products = await getProductsByIds(orderedIds);
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  return limit ? ordered.slice(0, limit) : ordered;
}

export interface CuratedListItemAdmin {
  id: string;
  productId: string;
  nameEn: string;
  mainImageUrl: string | null;
  position: number;
}

export async function listCuratedItemsForAdmin(listKey: CuratedListKey): Promise<CuratedListItemAdmin[]> {
  const res = await pool.query(
    `SELECT i.id, i.product_id, i.position, p.name_en, p.main_image_url
     FROM curated_list_item i JOIN cj_product p ON p.id = i.product_id
     WHERE i.list_key = $1 ORDER BY i.position`,
    [listKey]
  );
  return res.rows.map((r) => ({
    id: String(r.id),
    productId: String(r.product_id),
    nameEn: r.name_en,
    mainImageUrl: r.main_image_url,
    position: r.position,
  }));
}

export async function addToCuratedList(listKey: CuratedListKey, productId: string): Promise<void> {
  const maxRes = await pool.query(
    `SELECT COALESCE(MAX(position), -1) AS max FROM curated_list_item WHERE list_key = $1`,
    [listKey]
  );
  const nextPosition = Number(maxRes.rows[0].max) + 1;
  await pool.query(
    `INSERT INTO curated_list_item (list_key, product_id, position) VALUES ($1, $2, $3)
     ON CONFLICT (list_key, product_id) DO NOTHING`,
    [listKey, productId, nextPosition]
  );
}

export async function removeFromCuratedList(listKey: CuratedListKey, productId: string): Promise<void> {
  await pool.query(`DELETE FROM curated_list_item WHERE list_key = $1 AND product_id = $2`, [listKey, productId]);
}

// Full reorder: caller sends the complete new product-id order for this list.
export async function reorderCuratedList(listKey: CuratedListKey, orderedProductIds: string[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedProductIds.length; i++) {
      await client.query(
        `UPDATE curated_list_item SET position = $1 WHERE list_key = $2 AND product_id = $3`,
        [i, listKey, orderedProductIds[i]]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
