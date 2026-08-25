import "server-only";

// Hard safety gate, same pattern as CJ_ORDERS_SANDBOX -- flipping PAYPAL_MODE
// to "live" alone is not enough to start moving real money. See the
// PAYPAL_LIVE_CONFIRM comment block in .env.local for why.
function paypalApiBase(): string {
  if (process.env.PAYPAL_MODE !== "live") return "https://api-m.sandbox.paypal.com";
  if (process.env.PAYPAL_LIVE_CONFIRM !== "yes-charge-real-money") {
    throw new Error(
      "PAYPAL_MODE=live but PAYPAL_LIVE_CONFIRM is not set to the exact confirmation string -- refusing to make real PayPal API calls."
    );
  }
  return "https://api-m.paypal.com";
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET missing from environment");

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${data.error_description || res.status}`);

  // Refresh a minute early rather than risk using an expired token.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export async function createPaypalOrder(amount: number, currency = "USD"): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal create order failed: ${data.message || res.status}`);
  return data.id as string;
}

export interface PaypalCaptureResult {
  captureId: string;
  amount: number;
}

export async function capturePaypalOrder(paypalOrderId: string): Promise<PaypalCaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal capture failed: ${data.message || res.status}`);

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture || data.status !== "COMPLETED") {
    throw new Error(`PayPal capture did not complete (status: ${data.status})`);
  }

  return { captureId: capture.id as string, amount: Number(capture.amount.value) };
}

export interface PaypalRefundResult {
  refundId: string;
  status: string;
}

/** Full refund of a completed capture -- no amount means "refund the whole thing". */
export async function refundPaypalCapture(captureId: string): Promise<PaypalRefundResult> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalApiBase()}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal refund failed: ${data.message || res.status}`);
  return { refundId: data.id as string, status: data.status as string };
}

export interface PaypalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

/**
 * Verifies a webhook actually came from PayPal (not a spoofed POST) via
 * PayPal's own verify-webhook-signature endpoint, per their docs -- rolling
 * our own signature check is unnecessary and easy to get subtly wrong.
 * Requires PAYPAL_WEBHOOK_ID, obtained by registering the webhook URL under
 * the app's "Webhooks" tab in developer.paypal.com.
 */
export async function verifyPaypalWebhookSignature(
  headers: PaypalWebhookHeaders,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID missing from environment -- cannot verify webhook authenticity");

  const token = await getAccessToken();
  const res = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal webhook verification call failed: ${data.message || res.status}`);
  return data.verification_status === "SUCCESS";
}
