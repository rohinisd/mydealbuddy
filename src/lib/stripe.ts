import "server-only";
import Stripe from "stripe";

// Unlike PayPal (sandbox vs live API base URL), Stripe picks test vs live
// purely from which key you hand it (sk_test_... vs sk_live_...). So the
// hard safety gate here checks the key's own prefix: a live key is refused
// unless STRIPE_MODE=live AND STRIPE_LIVE_CONFIRM are both explicitly set --
// same two-deliberate-edits intent as PAYPAL_LIVE_CONFIRM, adapted to how
// Stripe actually works. See the STRIPE_LIVE_CONFIRM comment block in
// .env.local for why.
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing from environment");

  if (key.startsWith("sk_live_")) {
    if (process.env.STRIPE_MODE !== "live" || process.env.STRIPE_LIVE_CONFIRM !== "yes-charge-real-money") {
      throw new Error(
        "STRIPE_SECRET_KEY is a live key but STRIPE_MODE/STRIPE_LIVE_CONFIRM are not both set -- refusing to make real Stripe API calls."
      );
    }
  }

  return new Stripe(key);
}

export interface StripePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}

export async function createStripePaymentIntent(amount: number, currency = "usd"): Promise<StripePaymentIntentResult> {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    automatic_payment_methods: { enabled: true },
  });
  if (!intent.client_secret) throw new Error("Stripe did not return a client secret for the new PaymentIntent.");
  return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
}

export interface StripeRetrieveResult {
  status: Stripe.PaymentIntent.Status;
  amount: number;
}

export async function retrieveStripePaymentIntent(paymentIntentId: string): Promise<StripeRetrieveResult> {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return { status: intent.status, amount: intent.amount / 100 };
}

export interface StripeRefundResult {
  refundId: string;
  status: string;
}

/** Full refund of a succeeded PaymentIntent -- no amount means "refund the whole thing". */
export async function refundStripePaymentIntent(paymentIntentId: string): Promise<StripeRefundResult> {
  const stripe = getStripeClient();
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return { refundId: refund.id, status: refund.status ?? "unknown" };
}

/**
 * Verifies a webhook actually came from Stripe (not a spoofed POST) via
 * Stripe's own HMAC signature scheme -- synchronous and needs no API call,
 * unlike PayPal's verify-via-API-round-trip. Requires STRIPE_WEBHOOK_SECRET,
 * obtained by registering the webhook URL under Developers -> Webhooks in
 * the Stripe dashboard.
 */
export function constructStripeWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET missing from environment -- cannot verify webhook authenticity");

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
