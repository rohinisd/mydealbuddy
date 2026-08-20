import "server-only";
import { pool } from "@/lib/db";

export interface Coupon {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  timesUsed: number;
  isActive: boolean;
  expiresAt: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  coupon?: Coupon;
}

function rowToCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: String(row.id),
    code: row.code as string,
    discountType: row.discount_type as "percent" | "fixed",
    discountValue: Number(row.discount_value),
    minOrderValue: row.min_order_value != null ? Number(row.min_order_value) : null,
    maxUses: row.max_uses != null ? Number(row.max_uses) : null,
    timesUsed: Number(row.times_used),
    isActive: row.is_active as boolean,
    expiresAt: row.expires_at ? new Date(row.expires_at as string).toISOString() : null,
  };
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidationResult> {
  const res = await pool.query(`SELECT * FROM coupon WHERE code ILIKE $1`, [code.trim()]);
  const row = res.rows[0];
  if (!row) return { valid: false, reason: "That coupon code isn't recognized." };

  const coupon = rowToCoupon(row);
  if (!coupon.isActive) return { valid: false, reason: "This coupon is no longer active." };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, reason: "This coupon has expired." };
  }
  if (coupon.maxUses != null && coupon.timesUsed >= coupon.maxUses) {
    return { valid: false, reason: "This coupon has reached its usage limit." };
  }
  if (coupon.minOrderValue != null && subtotal < coupon.minOrderValue) {
    return { valid: false, reason: `This coupon requires a minimum order of $${coupon.minOrderValue.toFixed(2)}.` };
  }

  const discountAmount =
    coupon.discountType === "percent"
      ? Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100
      : Math.min(coupon.discountValue, subtotal);

  return { valid: true, discountAmount, coupon };
}

export async function listCouponsForAdmin(): Promise<Coupon[]> {
  const res = await pool.query(`SELECT * FROM coupon ORDER BY created_at DESC`);
  return res.rows.map(rowToCoupon);
}

export async function createCoupon(input: {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderValue?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}): Promise<Coupon> {
  const res = await pool.query(
    `INSERT INTO coupon (code, discount_type, discount_value, min_order_value, max_uses, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      input.code.trim().toUpperCase(),
      input.discountType,
      input.discountValue,
      input.minOrderValue ?? null,
      input.maxUses ?? null,
      input.expiresAt ?? null,
    ]
  );
  return rowToCoupon(res.rows[0]);
}

export async function setCouponActive(id: string, isActive: boolean): Promise<void> {
  await pool.query(`UPDATE coupon SET is_active = $1 WHERE id = $2`, [isActive, id]);
}
