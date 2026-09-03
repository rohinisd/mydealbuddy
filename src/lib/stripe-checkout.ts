import "server-only";
import { pool } from "@/lib/db";
import { resolveOrder, insertPaidStripeOrder, type ResolveOrderInput, type Order } from "@/lib/orders";
import { createStripePaymentIntent, retrieveStripePaymentIntent } from "@/lib/stripe";
import { fulfillOrderWithCj } from "@/lib/cj-fulfillment";

export async function createPendingStripeOrder(
  input: ResolveOrderInput
): Promise<{ clientSecret: string; paymentIntentId: string; total: number }> {
  const resolved = await resolveOrder(input);
  const { paymentIntentId, clientSecret } = await createStripePaymentIntent(resolved.total);

  await pool.query(
    `INSERT INTO stripe_pending_order
       (stripe_payment_intent_id, customer_id, lines_json, coupon_code, subtotal, discount_amount, shipping_amount,
        tax_amount, total, buddy_coins_earned, shipping_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      paymentIntentId,
      resolved.customerId,
      JSON.stringify(resolved.resolvedLines),
      resolved.couponCode,
      resolved.subtotal,
      resolved.discountAmount,
      resolved.shippingAmount,
      resolved.taxAmount,
      resolved.total,
      resolved.buddyCoinsEarned,
      JSON.stringify(resolved.shipping),
    ]
  );

  return { clientSecret, paymentIntentId, total: resolved.total };
}

export class StripeConfirmError extends Error {}

export async function confirmPendingStripeOrder(paymentIntentId: string): Promise<Order> {
  const pendingRes = await pool.query(`SELECT * FROM stripe_pending_order WHERE stripe_payment_intent_id = $1`, [
    paymentIntentId,
  ]);
  const pending = pendingRes.rows[0];
  if (!pending) throw new StripeConfirmError("No pending order found for this Stripe payment.");

  const intent = await retrieveStripePaymentIntent(paymentIntentId);
  if (intent.status !== "succeeded") {
    throw new StripeConfirmError(`Stripe payment has not succeeded yet (status: ${intent.status}).`);
  }

  // Sanity check: what Stripe actually charged should exactly match what we
  // asked it to charge at create-payment-intent time. A mismatch would mean
  // something is deeply wrong (not just user error) -- surface it loudly
  // rather than silently recording a different amount than what was paid.
  const expectedTotal = Number(pending.total);
  if (Math.abs(intent.amount - expectedTotal) > 0.01) {
    throw new StripeConfirmError(
      `Stripe charged $${intent.amount} but expected $${expectedTotal} -- refusing to record a mismatched order.`
    );
  }

  const order = await insertPaidStripeOrder(
    {
      customerId: pending.customer_id != null ? String(pending.customer_id) : null,
      resolvedLines: pending.lines_json,
      subtotal: Number(pending.subtotal),
      discountAmount: Number(pending.discount_amount),
      couponCode: pending.coupon_code,
      shippingAmount: Number(pending.shipping_amount),
      taxAmount: Number(pending.tax_amount),
      total: Number(pending.total),
      buddyCoinsEarned: Number(pending.buddy_coins_earned),
      shipping: pending.shipping_json,
    },
    paymentIntentId
  );

  await pool.query(`DELETE FROM stripe_pending_order WHERE stripe_payment_intent_id = $1`, [paymentIntentId]);

  // Payment already succeeded -- a CJ failure here must never fail checkout
  // for the customer. fulfillOrderWithCj records per-line failures for
  // admin visibility/retry rather than throwing.
  try {
    await fulfillOrderWithCj(order, pending.shipping_json);
  } catch (err) {
    console.error(`Unexpected error sourcing order ${order.orderNumber} from CJ:`, err);
  }

  return order;
}

/**
 * A real Stripe confirmation happens within minutes; anything still pending
 * after 24h means the buyer abandoned checkout. Mirrors
 * cleanupStalePendingPaypalOrders in paypal-checkout.ts.
 */
export async function cleanupStaleStripePendingOrders(maxAgeHours = 24): Promise<number> {
  const res = await pool.query(
    `DELETE FROM stripe_pending_order WHERE created_at < now() - ($1 || ' hours')::interval`,
    [maxAgeHours]
  );
  return res.rowCount ?? 0;
}
