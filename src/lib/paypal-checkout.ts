import "server-only";
import { pool } from "@/lib/db";
import { resolveOrder, insertPaidOrder, type ResolveOrderInput, type Order } from "@/lib/orders";
import { createPaypalOrder, capturePaypalOrder } from "@/lib/paypal";

export async function createPendingPaypalOrder(input: ResolveOrderInput): Promise<{ paypalOrderId: string; total: number }> {
  const resolved = await resolveOrder(input);
  const paypalOrderId = await createPaypalOrder(resolved.total);

  await pool.query(
    `INSERT INTO paypal_pending_order
       (paypal_order_id, customer_id, lines_json, coupon_code, subtotal, discount_amount, shipping_amount, total,
        buddy_coins_earned, shipping_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      paypalOrderId,
      resolved.customerId,
      JSON.stringify(resolved.resolvedLines),
      resolved.couponCode,
      resolved.subtotal,
      resolved.discountAmount,
      resolved.shippingAmount,
      resolved.total,
      resolved.buddyCoinsEarned,
      JSON.stringify(resolved.shipping),
    ]
  );

  return { paypalOrderId, total: resolved.total };
}

export class PaypalCaptureError extends Error {}

export async function capturePendingPaypalOrder(paypalOrderId: string): Promise<Order> {
  const pendingRes = await pool.query(`SELECT * FROM paypal_pending_order WHERE paypal_order_id = $1`, [paypalOrderId]);
  const pending = pendingRes.rows[0];
  if (!pending) throw new PaypalCaptureError("No pending order found for this PayPal order ID.");

  const capture = await capturePaypalOrder(paypalOrderId);

  // Sanity check: what PayPal actually charged should exactly match what we
  // asked it to charge at create-order time. A mismatch would mean something
  // is deeply wrong (not just user error) -- surface it loudly rather than
  // silently recording a different amount than what was actually paid.
  const expectedTotal = Number(pending.total);
  if (Math.abs(capture.amount - expectedTotal) > 0.01) {
    throw new PaypalCaptureError(
      `PayPal captured $${capture.amount} but expected $${expectedTotal} -- refusing to record a mismatched order.`
    );
  }

  const order = await insertPaidOrder(
    {
      customerId: pending.customer_id != null ? String(pending.customer_id) : null,
      resolvedLines: pending.lines_json,
      subtotal: Number(pending.subtotal),
      discountAmount: Number(pending.discount_amount),
      couponCode: pending.coupon_code,
      shippingAmount: Number(pending.shipping_amount),
      total: Number(pending.total),
      buddyCoinsEarned: Number(pending.buddy_coins_earned),
      shipping: pending.shipping_json,
    },
    paypalOrderId,
    capture.captureId
  );

  await pool.query(`DELETE FROM paypal_pending_order WHERE paypal_order_id = $1`, [paypalOrderId]);
  return order;
}
