import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getOrCreateStripeCustomerId, listSavedPaymentMethods } from "@/lib/stripe-customer";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const stripeCustomerId = await getOrCreateStripeCustomerId(customer);
  const methods = await listSavedPaymentMethods(stripeCustomerId);
  return NextResponse.json(methods);
}
