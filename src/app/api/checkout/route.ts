import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { placeOrder, PlaceOrderError } from "@/lib/orders";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { clearCustomerCart } from "@/lib/cart-sync";

export async function POST(request: NextRequest) {
  // Guest checkout: customer is null for anyone not logged in, and that's fine.
  const customer = await getCurrentCustomer();

  const body = await request.json().catch(() => null);
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  const shipping = body?.shipping ?? {};

  const validLines = lines
    .filter((l: unknown): l is { productId: unknown; quantity: unknown; option?: unknown } => typeof l === "object" && l !== null)
    .map((l: { productId: unknown; quantity: unknown; option?: unknown }) => ({
      productId: String(l.productId),
      quantity: Number(l.quantity),
      option: typeof l.option === "string" ? l.option : undefined,
    }))
    .filter((l: { productId: string; quantity: number }) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);

  const requiredShippingFields = ["name", "email", "countryCode", "country", "city", "address"] as const;
  for (const field of requiredShippingFields) {
    if (typeof shipping[field] !== "string" || !shipping[field].trim()) {
      return NextResponse.json({ error: `Shipping ${field} is required.` }, { status: 400 });
    }
  }

  try {
    const order = await placeOrder({
      customerId: customer?.id ?? null,
      lines: validLines,
      couponCode: typeof body?.couponCode === "string" ? body.couponCode : null,
      shipping: {
        name: shipping.name,
        email: shipping.email,
        countryCode: shipping.countryCode,
        country: shipping.country,
        province: typeof shipping.province === "string" ? shipping.province : undefined,
        city: shipping.city,
        address: shipping.address,
        zip: typeof shipping.zip === "string" ? shipping.zip : undefined,
        phone: typeof shipping.phone === "string" ? shipping.phone : undefined,
      },
    });

    // Best-effort side effects -- a flaky email provider or a stray cart-sync
    // row should never fail an order that already committed successfully.
    if (customer) {
      await clearCustomerCart(customer.id).catch((err) => console.error("Failed to clear synced cart:", err));
    }
    sendOrderConfirmationEmail(shipping.email, order).catch((err) => console.error("Failed to send order confirmation email:", err));

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    if (err instanceof PlaceOrderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to place order:", err);
    return NextResponse.json({ error: "Something went wrong placing your order." }, { status: 500 });
  }
}
