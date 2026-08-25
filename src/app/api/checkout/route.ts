import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { placeOrder, PlaceOrderError } from "@/lib/orders";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { clearCustomerCart } from "@/lib/cart-sync";
import { parseCheckoutBody } from "@/lib/checkout-request";

export async function POST(request: NextRequest) {
  // Guest checkout: customer is null for anyone not logged in, and that's fine.
  const customer = await getCurrentCustomer();

  const body = await request.json().catch(() => null);
  const parsed = parseCheckoutBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const order = await placeOrder({
      customerId: customer?.id ?? null,
      lines: parsed.lines,
      couponCode: parsed.couponCode,
      shipping: parsed.shipping,
    });

    // Best-effort side effects -- a flaky email provider or a stray cart-sync
    // row should never fail an order that already committed successfully.
    if (customer) {
      await clearCustomerCart(customer.id).catch((err) => console.error("Failed to clear synced cart:", err));
    }
    sendOrderConfirmationEmail(parsed.shipping.email, order).catch((err) =>
      console.error("Failed to send order confirmation email:", err)
    );

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    if (err instanceof PlaceOrderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to place order:", err);
    return NextResponse.json({ error: "Something went wrong placing your order." }, { status: 500 });
  }
}
