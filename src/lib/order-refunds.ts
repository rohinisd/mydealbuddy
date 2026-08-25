import "server-only";
import { pool } from "@/lib/db";
import { getOrderById, rowToOrder, type Order } from "@/lib/orders";
import { refundPaypalCapture } from "@/lib/paypal";

export class RefundError extends Error {}

/** Admin-initiated refund: calls PayPal, then marks the order refunded. */
export async function refundOrder(orderId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new RefundError("Order not found.");
  if (order.status !== "paid") throw new RefundError(`Order is ${order.status}, not paid -- nothing to refund.`);
  if (!order.paypalCaptureId) throw new RefundError("Order has no PayPal capture to refund.");

  const refund = await refundPaypalCapture(order.paypalCaptureId);

  const res = await pool.query(
    `UPDATE customer_order SET status = 'refunded', refunded_at = now(), paypal_refund_id = $1
     WHERE id = $2 RETURNING *`,
    [refund.refundId, orderId]
  );
  return rowToOrder(res.rows[0], order.lines);
}

/**
 * Webhook path: a refund issued directly in the PayPal dashboard (not
 * through our admin button) still needs to land in our DB. Idempotent --
 * only updates orders still in 'paid' status, so a duplicate webhook
 * delivery or a refund we already recorded via the admin button is a no-op.
 */
export async function markOrderRefundedByCaptureId(paypalCaptureId: string, refundId: string): Promise<void> {
  await pool.query(
    `UPDATE customer_order SET status = 'refunded', refunded_at = now(), paypal_refund_id = $1
     WHERE paypal_capture_id = $2 AND status = 'paid'`,
    [refundId, paypalCaptureId]
  );
}
