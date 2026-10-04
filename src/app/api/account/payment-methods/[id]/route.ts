import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getOrCreateStripeCustomerId, getPaymentMethodOwner, detachPaymentMethod } from "@/lib/stripe-customer";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id } = await params;
  const stripeCustomerId = await getOrCreateStripeCustomerId(customer);
  const owner = await getPaymentMethodOwner(id);
  if (owner !== stripeCustomerId) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }

  await detachPaymentMethod(id);
  return NextResponse.json({ ok: true });
}
