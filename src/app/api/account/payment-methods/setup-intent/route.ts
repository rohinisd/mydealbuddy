import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getOrCreateStripeCustomerId, createSetupIntent } from "@/lib/stripe-customer";

export async function POST() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const stripeCustomerId = await getOrCreateStripeCustomerId(customer);
  const { clientSecret } = await createSetupIntent(stripeCustomerId);
  return NextResponse.json({ clientSecret });
}
