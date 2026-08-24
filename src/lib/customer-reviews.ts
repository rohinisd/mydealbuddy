import "server-only";
import { pool } from "@/lib/db";

export interface ReviewStatus {
  loggedIn: boolean;
  eligible: boolean;
  existingReview: { rating: number; body: string } | null;
}

// "Verified buyer" is gated on having ordered the product, not on payment
// status -- there's no live payment gateway yet, so every order sits at
// status='pending_payment' forever (see src/lib/orders.ts). Buddy Coins and
// referral bonuses already credit at order-creation time for the same
// reason; this follows that established precedent. Tighten to status='paid'
// once a real gateway exists.
export async function getReviewStatus(customerId: string | null, productId: string): Promise<ReviewStatus> {
  if (!customerId) return { loggedIn: false, eligible: false, existingReview: null };

  const [eligibleRes, existingRes] = await Promise.all([
    pool.query(
      `SELECT 1 FROM customer_order_line col
       JOIN customer_order co ON co.id = col.order_id
       WHERE co.customer_id = $1 AND col.product_id = $2 AND co.status != 'cancelled'
       LIMIT 1`,
      [customerId, productId]
    ),
    pool.query(`SELECT rating, body FROM customer_product_review WHERE customer_id = $1 AND product_id = $2`, [
      customerId,
      productId,
    ]),
  ]);

  return {
    loggedIn: true,
    eligible: eligibleRes.rows.length > 0,
    existingReview: existingRes.rows[0] ? { rating: Number(existingRes.rows[0].rating), body: existingRes.rows[0].body } : null,
  };
}

export class ReviewError extends Error {}

export async function submitReview(customerId: string, productId: string, rating: number, body: string): Promise<void> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewError("Rating must be 1-5.");
  if (!body.trim()) throw new ReviewError("Review text is required.");

  const status = await getReviewStatus(customerId, productId);
  if (!status.eligible) throw new ReviewError("Only customers who've purchased this product can leave a review.");

  await pool.query(
    `INSERT INTO customer_product_review (product_id, customer_id, rating, body)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (product_id, customer_id) DO UPDATE SET rating = $3, body = $4, updated_at = now()`,
    [productId, customerId, rating, body.trim()]
  );
}
