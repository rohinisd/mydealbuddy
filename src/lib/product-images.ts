import "server-only";
import { pool } from "@/lib/db";
import { uploadToBlob, deleteFromBlob } from "@/lib/blob";

// Admin photos live past CJ's position range (always 0..N-1 on resync) so a
// re-sync's bulk CJ replace (see cj-sync.ts) never collides with one.
const ADMIN_POSITION_OFFSET = 10000;

export interface ProductImageRow {
  id: string;
  url: string;
  position: number;
  source: "cj" | "admin";
}

export async function listImagesForProduct(productId: string): Promise<ProductImageRow[]> {
  const res = await pool.query(
    `SELECT id, url, position, source FROM cj_product_image WHERE product_id = $1 ORDER BY position`,
    [productId]
  );
  return res.rows.map((r) => ({ id: String(r.id), url: r.url, position: r.position, source: r.source }));
}

export async function addAdminImage(productId: string, buffer: Buffer, contentType: string): Promise<void> {
  const blobUrl = await uploadToBlob(`admin-images/${productId}-${Date.now()}`, buffer, contentType);

  const maxPos = await pool.query(
    `SELECT COALESCE(MAX(position), ${ADMIN_POSITION_OFFSET - 1}) AS max FROM cj_product_image
     WHERE product_id = $1 AND source = 'admin'`,
    [productId]
  );
  const nextPos = Number(maxPos.rows[0].max) + 1;

  await pool.query(
    `INSERT INTO cj_product_image (product_id, position, url, url_path, source)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [productId, nextPos, blobUrl, blobUrl.split("?")[0]]
  );

  // If the product currently has no main image (e.g. every CJ photo was
  // deleted), this new upload becomes it.
  await pool.query(
    `UPDATE cj_product SET main_image_url = $1 WHERE id = $2 AND main_image_url IS NULL`,
    [blobUrl, productId]
  );
}

export async function deleteImage(productId: string, imageId: string): Promise<void> {
  const res = await pool.query(
    `SELECT url, source FROM cj_product_image WHERE id = $1 AND product_id = $2`,
    [imageId, productId]
  );
  const row = res.rows[0];
  if (!row) return;

  if (row.source === "admin") {
    await deleteFromBlob(row.url).catch(() => {});
  }
  await pool.query(`DELETE FROM cj_product_image WHERE id = $1`, [imageId]);

  // If the deleted photo was the product's main image, promote the next
  // remaining one (lowest position) or clear it if none are left.
  const productRes = await pool.query(`SELECT main_image_url FROM cj_product WHERE id = $1`, [productId]);
  if (productRes.rows[0]?.main_image_url === row.url) {
    const nextRes = await pool.query(
      `SELECT url FROM cj_product_image WHERE product_id = $1 ORDER BY position LIMIT 1`,
      [productId]
    );
    await pool.query(`UPDATE cj_product SET main_image_url = $1 WHERE id = $2`, [
      nextRes.rows[0]?.url ?? null,
      productId,
    ]);
  }
}
