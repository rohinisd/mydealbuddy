import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { PlaceOrderError } from "@/lib/orders";
import { createPendingPaypalOrder } from "@/lib/paypal-checkout";
import { parseCheckoutBody } from "@/lib/checkout-request";

export async function POST(request: NextRequest) {
  const customer = await getCurrentCustomer();

  const body = await request.json().catch(() => null);
  const parsed = parseCheckoutBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { paypalOrderId, total } = await createPendingPaypalOrder({
      customerId: customer?.id ?? null,
      lines: parsed.lines,
      couponCode: parsed.couponCode,
      shipping: parsed.shipping,
    });
    return NextResponse.json({ ok: true, paypalOrderId, total });
  } catch (err) {
    if (err instanceof PlaceOrderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to create PayPal order:", err);
    return NextResponse.json({ error: "Something went wrong starting PayPal checkout." }, { status: 500 });
  }
}
