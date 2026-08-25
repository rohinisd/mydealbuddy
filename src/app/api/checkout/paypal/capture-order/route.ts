import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { capturePendingPaypalOrder, PaypalCaptureError } from "@/lib/paypal-checkout";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { clearCustomerCart } from "@/lib/cart-sync";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paypalOrderId = typeof body?.paypalOrderId === "string" ? body.paypalOrderId : "";
  if (!paypalOrderId) return NextResponse.json({ error: "paypalOrderId is required" }, { status: 400 });

  try {
    const order = await capturePendingPaypalOrder(paypalOrderId);

    // Best-effort side effects, same as the no-payment checkout route.
    const customer = await getCurrentCustomer();
    if (customer) {
      await clearCustomerCart(customer.id).catch((err) => console.error("Failed to clear synced cart:", err));
    }
    sendOrderConfirmationEmail(order.shippingEmail, order, "PayPal").catch((err) =>
      console.error("Failed to send order confirmation email:", err)
    );

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    if (err instanceof PaypalCaptureError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to capture PayPal order:", err);
    return NextResponse.json({ error: "Something went wrong confirming your PayPal payment." }, { status: 500 });
  }
}
