import "server-only";
import { pool } from "@/lib/db";

export interface AdminProductRow {
  id: string;
  pid: string;
  nameEn: string;
  appCategorySlug: string | null;
  brand: string | null;
  priceMin: number | null;
  mainImageUrl: string | null;
  isActive: boolean;
  fetchedAt: string;
}

export async function listAllProductsForAdmin(): Promise<AdminProductRow[]> {
  const res = await pool.query(
    `SELECT id, pid, name_en, app_category_slug, brand, price_min, main_image_url, is_active, fetched_at
     FROM cj_product ORDER BY fetched_at DESC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    pid: row.pid,
    nameEn: row.name_en,
    appCategorySlug: row.app_category_slug,
    brand: row.brand,
    priceMin: row.price_min ? Number(row.price_min) : null,
    mainImageUrl: row.main_image_url,
    isActive: row.is_active,
    fetchedAt: row.fetched_at,
  }));
}
