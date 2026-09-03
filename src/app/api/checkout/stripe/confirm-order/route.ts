import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { confirmPendingStripeOrder, StripeConfirmError } from "@/lib/stripe-checkout";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { clearCustomerCart } from "@/lib/cart-sync";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId : "";
  if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });

  try {
    const order = await confirmPendingStripeOrder(paymentIntentId);

    const customer = await getCurrentCustomer();
    if (customer) {
      await clearCustomerCart(customer.id).catch((err) => console.error("Failed to clear synced cart:", err));
    }
    sendOrderConfirmationEmail(order.shippingEmail, order, "Stripe").catch((err) =>
      console.error("Failed to send order confirmation email:", err)
    );

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    if (err instanceof StripeConfirmError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to confirm Stripe order:", err);
    return NextResponse.json({ error: "Something went wrong confirming your card payment." }, { status: 500 });
  }
}
