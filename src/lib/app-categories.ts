import "server-only";
import { pool } from "@/lib/db";

export interface CategoryRow {
  id: string;
  level: 1 | 2 | 3;
  slug: string;
  name: string;
  fullSlug: string;
  l1Slug: string;
  l1Name: string;
  l2Slug: string | null;
  l2Name: string | null;
  l3Slug: string | null;
  l3Name: string | null;
}

export interface CategoryLeaf {
  id: string;
  slug: string;
  name: string;
  fullSlug: string;
}
export interface CategoryGroup {
  id: string;
  slug: string;
  name: string;
  fullSlug: string;
  leaves: CategoryLeaf[];
}
export interface CategoryTop {
  id: string;
  slug: string;
  name: string;
  fullSlug: string;
  groups: CategoryGroup[];
}

function rowToCategory(row: Record<string, unknown>): CategoryRow {
  return {
    id: String(row.id),
    level: row.level as 1 | 2 | 3,
    slug: row.slug as string,
    name: row.name as string,
    fullSlug: row.full_slug as string,
    l1Slug: row.l1_slug as string,
    l1Name: row.l1_name as string,
    l2Slug: (row.l2_slug as string | null) ?? null,
    l2Name: (row.l2_name as string | null) ?? null,
    l3Slug: (row.l3_slug as string | null) ?? null,
    l3Name: (row.l3_name as string | null) ?? null,
  };
}

/** The full 3-level tree, ~675 rows in one query -- used for the admin category picker (every category, populated or not). */
export async function getCategoryTree(): Promise<CategoryTop[]> {
  const res = await pool.query(`SELECT * FROM app_category ORDER BY level, id`);
  return assembleTree(res.rows.map(rowToCategory));
}

// Only categories (at every level) with at least one active product beneath
// them -- used for customer-facing nav so it doesn't show hundreds of empty
// entries while the catalog is still small.
export async function getPopulatedCategoryTree(): Promise<CategoryTop[]> {
  const res = await pool.query(
    `SELECT ac.* FROM app_category ac
     WHERE EXISTS (
       SELECT 1 FROM cj_product p
       WHERE p.is_active = true AND p.app_category_id IS NOT NULL AND (
         (ac.level = 1 AND p.app_category_id IN (SELECT id FROM app_category WHERE l1_slug = ac.l1_slug)) OR
         (ac.level = 2 AND p.app_category_id IN (SELECT id FROM app_category WHERE l1_slug = ac.l1_slug AND l2_slug = ac.l2_slug)) OR
         (ac.level = 3 AND p.app_category_id = ac.id)
       )
     )
     ORDER BY ac.level, ac.id`
  );
  return assembleTree(res.rows.map(rowToCategory));
}

function assembleTree(rows: CategoryRow[]): CategoryTop[] {
  const tops = new Map<string, CategoryTop>();
  for (const r of rows.filter((r) => r.level === 1)) {
    tops.set(r.id, { id: r.id, slug: r.slug, name: r.name, fullSlug: r.fullSlug, groups: [] });
  }
  const groupsByL1 = new Map<string, CategoryGroup>(); // key: fullSlug
  for (const r of rows.filter((r) => r.level === 2)) {
    const group: CategoryGroup = { id: r.id, slug: r.slug, name: r.name, fullSlug: r.fullSlug, leaves: [] };
    groupsByL1.set(r.fullSlug, group);
  }
  for (const r of rows.filter((r) => r.level === 3)) {
    const parentFullSlug = `${r.l1Slug}/${r.l2Slug}`;
    groupsByL1.get(parentFullSlug)?.leaves.push({ id: r.id, slug: r.slug, name: r.name, fullSlug: r.fullSlug });
  }
  for (const [fullSlug, group] of groupsByL1) {
    const l1Slug = fullSlug.split("/")[0];
    const top = [...tops.values()].find((t) => t.slug === l1Slug);
    top?.groups.push(group);
  }
  return [...tops.values()];
}

/** Resolves 1-3 URL segments (from /product-category/[...slugs]) to the matching row, or null. */
export async function resolveCategoryPath(slugs: string[]): Promise<CategoryRow | null> {
  if (slugs.length === 0 || slugs.length > 3) return null;
  const res = await pool.query(`SELECT * FROM app_category WHERE full_slug = $1`, [slugs.join("/")]);
  return res.rows[0] ? rowToCategory(res.rows[0]) : null;
}

export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const res = await pool.query(`SELECT * FROM app_category WHERE id = $1`, [id]);
  return res.rows[0] ? rowToCategory(res.rows[0]) : null;
}

/** Direct children of a category (groups under a top, or leaves under a group) -- for category-page drill-down navigation. */
export async function getChildCategories(parentId: string): Promise<CategoryRow[]> {
  const res = await pool.query(`SELECT * FROM app_category WHERE parent_id = $1 ORDER BY name`, [parentId]);
  return res.rows.map(rowToCategory);
}
