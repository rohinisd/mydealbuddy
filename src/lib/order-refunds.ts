import "server-only";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { getOrderById, rowToOrder, type Order } from "@/lib/orders";
import { refundPaypalCapture } from "@/lib/paypal";

export class RefundError extends Error {}

/**
 * Marks an order refunded and claws back every Buddy Coin credited because
 * of it -- purchase coins, plus any referral/referred-signup bonuses this
 * order triggered (those can belong to a *different* customer than the one
 * who placed the order). The WHERE status='paid' guard makes this safe to
 * call twice (e.g. admin refund and a later webhook delivery for the same
 * event): the second call updates 0 rows and returns null.
 */
async function markRefundedAndClawback(
  client: PoolClient,
  orderId: string,
  refundId: string
): Promise<Record<string, unknown> | null> {
  const res = await client.query(
    `UPDATE customer_order SET status = 'refunded', refunded_at = now(), paypal_refund_id = $1
     WHERE id = $2 AND status = 'paid' RETURNING *`,
    [refundId, orderId]
  );
  if (res.rowCount === 0) return null;

  const creditsRes = await client.query(
    `SELECT customer_id, SUM(amount) AS total FROM buddy_coin_ledger
     WHERE order_id = $1 AND amount > 0 GROUP BY customer_id`,
    [orderId]
  );
  for (const row of creditsRes.rows) {
    await client.query(
      `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1, $2, 'refund_clawback', $3)`,
      [row.customer_id, -Number(row.total), orderId]
    );
  }

  return res.rows[0];
}

/** Admin-initiated refund: calls PayPal, then marks the order refunded and claws back its Buddy Coins. */
export async function refundOrder(orderId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new RefundError("Order not found.");
  if (order.status !== "paid") throw new RefundError(`Order is ${order.status}, not paid -- nothing to refund.`);
  if (!order.paypalCaptureId) throw new RefundError("Order has no PayPal capture to refund.");

  const refund = await refundPaypalCapture(order.paypalCaptureId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await markRefundedAndClawback(client, orderId, refund.refundId);
    await client.query("COMMIT");
    if (!row) {
      // PayPal already accepted the refund by this point -- can't undo that.
      // Loud failure beats a silently stale order.
      throw new RefundError(
        `PayPal refund ${refund.refundId} succeeded but the order's status changed before it could be recorded -- check order ${orderId} manually.`
      );
    }
    return rowToOrder(row, order.lines);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Webhook path: a refund issued directly in the PayPal dashboard (not
 * through our admin button) still needs to land in our DB. Idempotent, same
 * guard as the admin path -- a duplicate webhook delivery or a refund we
 * already recorded via the admin button is a no-op.
 */
export async function markOrderRefundedByCaptureId(paypalCaptureId: string, refundId: string): Promise<void> {
  const orderRes = await pool.query(`SELECT id FROM customer_order WHERE paypal_capture_id = $1`, [paypalCaptureId]);
  const orderId = orderRes.rows[0]?.id;
  if (!orderId) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await markRefundedAndClawback(client, String(orderId), refundId);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
