import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getOrCreateStripeCustomerId, createCheckoutCustomerSession } from "@/lib/stripe-customer";

/** Lets the checkout page's Payment Element show a logged-in customer's saved cards. Guests get nothing to show, so this 401s them rather than silently no-op-ing. */
export async function POST() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const stripeCustomerId = await getOrCreateStripeCustomerId(customer);
  const { clientSecret } = await createCheckoutCustomerSession(stripeCustomerId);
  return NextResponse.json({ clientSecret });
}
