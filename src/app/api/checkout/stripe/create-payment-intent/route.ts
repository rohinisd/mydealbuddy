import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { PlaceOrderError } from "@/lib/orders";
import { createPendingStripeOrder } from "@/lib/stripe-checkout";
import { getOrCreateStripeCustomerId } from "@/lib/stripe-customer";
import { parseCheckoutBody } from "@/lib/checkout-request";

export async function POST(request: NextRequest) {
  const customer = await getCurrentCustomer();

  const body = await request.json().catch(() => null);
  const parsed = parseCheckoutBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    // Guests have no Stripe Customer -- nothing to attach saved cards to,
    // same "no account, no account-tied features" rule as Buddy Coins.
    const stripeCustomerId = customer ? await getOrCreateStripeCustomerId(customer) : undefined;
    const { clientSecret, paymentIntentId, total } = await createPendingStripeOrder(
      {
        customerId: customer?.id ?? null,
        lines: parsed.lines,
        couponCode: parsed.couponCode,
        coinsToRedeem: parsed.coinsToRedeem,
        shipping: parsed.shipping,
      },
      stripeCustomerId
    );
    return NextResponse.json({ ok: true, clientSecret, paymentIntentId, total });
  } catch (err) {
    if (err instanceof PlaceOrderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to create Stripe payment intent:", err);
    return NextResponse.json({ error: "Something went wrong starting card checkout." }, { status: 500 });
  }
}
