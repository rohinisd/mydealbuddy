import "server-only";
import Stripe from "stripe";
import { pool } from "@/lib/db";
import type { Customer } from "@/lib/customers";

// Mirrors the live-key safety gate in stripe.ts -- same client, same guard,
// just needs its own instance here since stripe.ts doesn't export the client.
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing from environment");
  if (key.startsWith("sk_live_") && (process.env.STRIPE_MODE !== "live" || process.env.STRIPE_LIVE_CONFIRM !== "yes-charge-real-money")) {
    throw new Error("STRIPE_SECRET_KEY is a live key but STRIPE_MODE/STRIPE_LIVE_CONFIRM are not both set -- refusing to make real Stripe API calls.");
  }
  return new Stripe(key);
}

/** Creates the Stripe Customer object on first use, then reuses it -- one per MyDealBuddy customer. */
export async function getOrCreateStripeCustomerId(customer: Customer): Promise<string> {
  const existing = await pool.query(`SELECT stripe_customer_id FROM customer WHERE id = $1`, [customer.id]);
  const stored = existing.rows[0]?.stripe_customer_id as string | null;
  if (stored) return stored;

  const stripe = getStripeClient();
  const stripeCustomer = await stripe.customers.create({
    email: customer.email,
    name: `${customer.firstName} ${customer.lastName}`,
    metadata: { mydealbuddy_customer_id: customer.id },
  });
  await pool.query(`UPDATE customer SET stripe_customer_id = $1 WHERE id = $2`, [stripeCustomer.id, customer.id]);
  return stripeCustomer.id;
}

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export async function listSavedPaymentMethods(stripeCustomerId: string): Promise<SavedPaymentMethod[]> {
  const stripe = getStripeClient();
  const methods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card" });
  return methods.data
    .filter((m) => m.card)
    .map((m) => ({
      id: m.id,
      brand: m.card!.brand,
      last4: m.card!.last4,
      expMonth: m.card!.exp_month,
      expYear: m.card!.exp_year,
    }));
}

/** Zero-dollar SetupIntent -- saves a card for later without charging anything. */
export async function createSetupIntent(stripeCustomerId: string): Promise<{ clientSecret: string }> {
  const stripe = getStripeClient();
  const intent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
  });
  if (!intent.client_secret) throw new Error("Stripe did not return a client secret for the new SetupIntent.");
  return { clientSecret: intent.client_secret };
}

/** Detaching (not deleting) is Stripe's own vocabulary for removing a saved card from a customer. */
export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Lets the checkout page's Payment Element show this customer's saved cards
 * (with a selector, plus "add new" and "save this card" controls) without
 * the server having created the PaymentIntent yet -- the deferred-intent
 * pattern this checkout already uses for instant card-field rendering.
 */
export async function createCheckoutCustomerSession(stripeCustomerId: string): Promise<{ clientSecret: string }> {
  const stripe = getStripeClient();
  const session = await stripe.customerSessions.create({
    customer: stripeCustomerId,
    components: {
      payment_element: {
        enabled: true,
        features: {
          payment_method_redisplay: "enabled",
          payment_method_save: "enabled",
          payment_method_save_usage: "off_session",
          payment_method_remove: "enabled",
        },
      },
    },
  });
  return { clientSecret: session.client_secret };
}

/** Which Stripe Customer a payment method belongs to -- callers must check this against the logged-in customer before detaching, so one customer can't remove another's saved card by guessing its id. Returns null for a nonexistent id, same as "no owner", rather than letting Stripe's error bubble up as a 500. */
export async function getPaymentMethodOwner(paymentMethodId: string): Promise<string | null> {
  const stripe = getStripeClient();
  try {
    const method = await stripe.paymentMethods.retrieve(paymentMethodId);
    return typeof method.customer === "string" ? method.customer : (method.customer?.id ?? null);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) return null;
    throw err;
  }
}
