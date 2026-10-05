import "server-only";
import { pool } from "@/lib/db";

export interface Campaign {
  id: string;
  title: string;
  bannerText: string;
  coinBonusType: "none" | "multiplier" | "flat";
  coinBonusValue: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    title: row.title as string,
    bannerText: row.banner_text as string,
    coinBonusType: row.coin_bonus_type as Campaign["coinBonusType"],
    coinBonusValue: Number(row.coin_bonus_value),
    startsAt: new Date(row.starts_at as string).toISOString(),
    endsAt: new Date(row.ends_at as string).toISOString(),
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

/** The one campaign (if any) that's both toggled on and within its date window right now -- what drives the site banner and the coin bonus. */
export async function getActiveCampaign(): Promise<Campaign | null> {
  const res = await pool.query(
    `SELECT * FROM campaign WHERE is_active = true AND now() BETWEEN starts_at AND ends_at ORDER BY starts_at DESC LIMIT 1`
  );
  return res.rows[0] ? rowToCampaign(res.rows[0]) : null;
}

export async function listCampaignsForAdmin(): Promise<Campaign[]> {
  const res = await pool.query(`SELECT * FROM campaign ORDER BY starts_at DESC`);
  return res.rows.map(rowToCampaign);
}

export interface CampaignInput {
  title: string;
  bannerText: string;
  coinBonusType: "none" | "multiplier" | "flat";
  coinBonusValue: number;
  startsAt: string;
  endsAt: string;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const res = await pool.query(
    `INSERT INTO campaign (title, banner_text, coin_bonus_type, coin_bonus_value, starts_at, ends_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.title.trim(), input.bannerText.trim(), input.coinBonusType, input.coinBonusValue, input.startsAt, input.endsAt]
  );
  return rowToCampaign(res.rows[0]);
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<void> {
  await pool.query(
    `UPDATE campaign SET title = $1, banner_text = $2, coin_bonus_type = $3, coin_bonus_value = $4, starts_at = $5, ends_at = $6 WHERE id = $7`,
    [input.title.trim(), input.bannerText.trim(), input.coinBonusType, input.coinBonusValue, input.startsAt, input.endsAt, id]
  );
}

export async function setCampaignActive(id: string, isActive: boolean): Promise<void> {
  await pool.query(`UPDATE campaign SET is_active = $1 WHERE id = $2`, [isActive, id]);
}

export async function deleteCampaign(id: string): Promise<void> {
  await pool.query(`DELETE FROM campaign WHERE id = $1`, [id]);
}
