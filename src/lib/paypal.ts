import "server-only";

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET missing from environment");

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
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
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
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
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
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
