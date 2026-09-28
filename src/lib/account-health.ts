import "server-only";
import Stripe from "stripe";
import { pool } from "@/lib/db";
import { cjFetch } from "@/lib/cj-sync";
import { checkPaypalAuth } from "@/lib/paypal";

export interface ServiceHealth {
  name: string;
  status: "ok" | "warning" | "error" | "unconfigured";
  detail: string;
}

function daysUntil(isoDate: string | undefined): number | null {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Live API calls, not just "is the env var set" -- a key can be present but
// revoked, and CJ's own docs claim a much shorter access-token lifetime than
// what's actually stored, so the stored expiry alone isn't trustworthy.
async function checkCj(): Promise<ServiceHealth> {
  const accessExpires = daysUntil(process.env.CJ_ACCESS_TOKEN_EXPIRES_AT);
  const refreshExpires = daysUntil(process.env.CJ_REFRESH_TOKEN_EXPIRES_AT);
  const expiryNote =
    accessExpires != null
      ? `access token expires in ${accessExpires}d, refresh in ${refreshExpires}d`
      : "no expiry date on record";

  if (!process.env.CJ_ACCESS_TOKEN) {
    return { name: "CJ Dropshipping", status: "unconfigured", detail: "CJ_ACCESS_TOKEN not set" };
  }

  try {
    const productRes = await pool.query(`SELECT pid FROM cj_product LIMIT 1`);
    const pid = productRes.rows[0]?.pid;
    if (!pid) {
      return { name: "CJ Dropshipping", status: "warning", detail: `No products in catalog to test against (${expiryNote})` };
    }
    await cjFetch(`/product/query?pid=${encodeURIComponent(pid)}`);
    if (accessExpires != null && accessExpires < 3) {
      return { name: "CJ Dropshipping", status: "warning", detail: `Working now, but ${expiryNote} -- refresh soon` };
    }
    return { name: "CJ Dropshipping", status: "ok", detail: `Working now (${expiryNote})` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { name: "CJ Dropshipping", status: "error", detail: `${message} (${expiryNote})` };
  }
}

async function checkStripe(): Promise<ServiceHealth> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { name: "Stripe", status: "unconfigured", detail: "STRIPE_SECRET_KEY not set" };
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.balance.retrieve();
    const mode = process.env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test";
    return { name: "Stripe", status: "ok", detail: `API key valid (${mode} mode)` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { name: "Stripe", status: "error", detail: message };
  }
}

async function checkPaypal(): Promise<ServiceHealth> {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return { name: "PayPal", status: "unconfigured", detail: "PAYPAL_CLIENT_ID/SECRET not set" };
  }
  try {
    await checkPaypalAuth();
    const mode = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
    return { name: "PayPal", status: "ok", detail: `Credentials valid (${mode} mode)` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { name: "PayPal", status: "error", detail: message };
  }
}

async function checkResend(): Promise<ServiceHealth> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { name: "Resend", status: "unconfigured", detail: "RESEND_API_KEY not set" };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
      return { name: "Resend", status: "error", detail: `API key rejected (${res.status})` };
    }
    const data = await res.json();
    const domains = (data.data ?? []) as { name: string; status: string }[];
    if (domains.length === 0) {
      return { name: "Resend", status: "warning", detail: "API key valid, but no domain configured -- sending from Resend's shared test address" };
    }
    const unverified = domains.filter((d) => d.status !== "verified");
    if (unverified.length > 0) {
      return { name: "Resend", status: "warning", detail: `Domain(s) not verified: ${unverified.map((d) => d.name).join(", ")}` };
    }
    return { name: "Resend", status: "ok", detail: `Domain(s) verified: ${domains.map((d) => d.name).join(", ")}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { name: "Resend", status: "error", detail: message };
  }
}

export async function checkAccountHealth(): Promise<ServiceHealth[]> {
  const results = await Promise.all([checkCj(), checkStripe(), checkPaypal(), checkResend()]);
  return results;
}
