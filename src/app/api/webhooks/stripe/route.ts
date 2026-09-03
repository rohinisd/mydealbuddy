import { NextRequest, NextResponse } from "next/server";
import { constructStripeWebhookEvent } from "@/lib/stripe";
import { markOrderRefundedByStripePaymentIntentId } from "@/lib/order-refunds";

/**
 * Catches refunds issued directly in the Stripe dashboard (bypassing our
 * admin refund button) so our order status doesn't silently drift from
 * reality. Mirrors /api/webhooks/paypal's scope exactly -- register this URL
 * under Developers -> Webhooks in the Stripe dashboard, subscribed to at
 * least charge.refunded, then set STRIPE_WEBHOOK_SECRET to the signing
 * secret it gives you. Stripe can deliver to localhost via the Stripe CLI,
 * but production delivery still needs the deployed URL registered.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event;
  try {
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    const refundId = charge.refunds?.data?.[0]?.id;
    if (paymentIntentId && refundId) {
      await markOrderRefundedByStripePaymentIntentId(paymentIntentId, refundId);
    } else {
      console.error("charge.refunded webhook missing payment_intent/refund id:", JSON.stringify(charge.id));
    }
  }

  return NextResponse.json({ ok: true });
}
