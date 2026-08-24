import "server-only";
import { pool } from "@/lib/db";

export type HomepageBlockType = "hero_slide" | "promo_banner" | "deal_card";

export interface HomepageBlock {
  id: string;
  blockType: HomepageBlockType;
  position: number;
  pill: string | null;
  headline: string;
  subcopy: string | null;
  cta: string | null;
  href: string;
  bg: string;
  isActive: boolean;
}

function rowToBlock(row: Record<string, unknown>): HomepageBlock {
  return {
    id: String(row.id),
    blockType: row.block_type as HomepageBlockType,
    position: Number(row.position),
    pill: (row.pill as string | null) ?? null,
    headline: row.headline as string,
    subcopy: (row.subcopy as string | null) ?? null,
    cta: (row.cta as string | null) ?? null,
    href: row.href as string,
    bg: row.bg as string,
    isActive: row.is_active as boolean,
  };
}

export async function getActiveHomepageBlocks(blockType: HomepageBlockType): Promise<HomepageBlock[]> {
  const res = await pool.query(`SELECT * FROM homepage_block WHERE block_type = $1 AND is_active = true ORDER BY position`, [
    blockType,
  ]);
  return res.rows.map(rowToBlock);
}

export async function listHomepageBlocksForAdmin(): Promise<HomepageBlock[]> {
  const res = await pool.query(`SELECT * FROM homepage_block ORDER BY block_type, position`);
  return res.rows.map(rowToBlock);
}

export async function createHomepageBlock(input: {
  blockType: HomepageBlockType;
  headline: string;
  href: string;
  bg?: string;
  pill?: string | null;
  subcopy?: string | null;
  cta?: string | null;
}): Promise<HomepageBlock> {
  const posRes = await pool.query(`SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM homepage_block WHERE block_type = $1`, [
    input.blockType,
  ]);
  const position = Number(posRes.rows[0].next_position);
  const res = await pool.query(
    `INSERT INTO homepage_block (block_type, position, pill, headline, subcopy, cta, href, bg)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [input.blockType, position, input.pill ?? null, input.headline, input.subcopy ?? null, input.cta ?? null, input.href, input.bg ?? "#eaf1f8"]
  );
  return rowToBlock(res.rows[0]);
}

export async function updateHomepageBlock(
  id: string,
  input: { pill: string | null; headline: string; subcopy: string | null; cta: string | null; href: string; bg: string }
): Promise<void> {
  await pool.query(`UPDATE homepage_block SET pill = $1, headline = $2, subcopy = $3, cta = $4, href = $5, bg = $6 WHERE id = $7`, [
    input.pill,
    input.headline,
    input.subcopy,
    input.cta,
    input.href,
    input.bg,
    id,
  ]);
}

export async function setHomepageBlockActive(id: string, isActive: boolean): Promise<void> {
  await pool.query(`UPDATE homepage_block SET is_active = $1 WHERE id = $2`, [isActive, id]);
}

export async function deleteHomepageBlock(id: string): Promise<void> {
  await pool.query(`DELETE FROM homepage_block WHERE id = $1`, [id]);
}

/** Swaps position with the neighboring block of the same block_type. */
export async function moveHomepageBlock(id: string, direction: "up" | "down"): Promise<void> {
  const res = await pool.query(`SELECT block_type, position FROM homepage_block WHERE id = $1`, [id]);
  const row = res.rows[0];
  if (!row) return;

  const cmp = direction === "up" ? "<" : ">";
  const order = direction === "up" ? "DESC" : "ASC";
  const neighborRes = await pool.query(
    `SELECT id, position FROM homepage_block WHERE block_type = $1 AND position ${cmp} $2 ORDER BY position ${order} LIMIT 1`,
    [row.block_type, row.position]
  );
  const neighbor = neighborRes.rows[0];
  if (!neighbor) return;

  await pool.query(`UPDATE homepage_block SET position = $1 WHERE id = $2`, [neighbor.position, id]);
  await pool.query(`UPDATE homepage_block SET position = $1 WHERE id = $2`, [row.position, neighbor.id]);
}
