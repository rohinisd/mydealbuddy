import "server-only";
import { pool } from "@/lib/db";

export interface LoyaltyTier {
  name: "Bronze" | "Silver" | "Gold" | "Platinum";
  earnMultiplier: number;
  minLifetimeCoins: number;
}

// Thresholds are lifetime coins EARNED, not current balance -- redeeming
// coins for a discount shouldn't demote a customer's tier. Multiplier
// applies to purchase-earned coins only (not flat bonuses like referrals or
// reviews), same basis BUDDY_COINS_RATE already uses.
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: "Bronze", earnMultiplier: 1, minLifetimeCoins: 0 },
  { name: "Silver", earnMultiplier: 1.25, minLifetimeCoins: 500 },
  { name: "Gold", earnMultiplier: 1.5, minLifetimeCoins: 2000 },
  { name: "Platinum", earnMultiplier: 2, minLifetimeCoins: 5000 },
];

const EARNING_REASONS = ["purchase", "referral_bonus", "referred_signup_bonus", "review_bonus"];

// Deliberately excludes 'redemption' (negative), 'redemption_refund', and
// 'refund_clawback' (corrections, not new earning) -- otherwise a refund
// cycle could inflate lifetime-earned and tier status for free.
export async function getLifetimeEarnedCoins(customerId: string): Promise<number> {
  const res = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM buddy_coin_ledger WHERE customer_id = $1 AND reason = ANY($2)`,
    [customerId, EARNING_REASONS]
  );
  return Number(res.rows[0].total);
}

export function tierForLifetimeCoins(lifetimeCoins: number): LoyaltyTier {
  let current = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (lifetimeCoins >= t.minLifetimeCoins) current = t;
  }
  return current;
}

export interface CustomerLoyaltyStatus {
  tier: LoyaltyTier;
  lifetimeCoins: number;
  nextTier: LoyaltyTier | null;
  coinsToNextTier: number | null;
}

export async function getCustomerLoyaltyStatus(customerId: string): Promise<CustomerLoyaltyStatus> {
  const lifetimeCoins = await getLifetimeEarnedCoins(customerId);
  const tier = tierForLifetimeCoins(lifetimeCoins);
  const nextTier = LOYALTY_TIERS[LOYALTY_TIERS.indexOf(tier) + 1] ?? null;
  return {
    tier,
    lifetimeCoins,
    nextTier,
    coinsToNextTier: nextTier ? nextTier.minLifetimeCoins - lifetimeCoins : null,
  };
}
