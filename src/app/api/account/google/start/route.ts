import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildGoogleAuthUrl } from "@/lib/google-oauth";

const CSRF_COOKIE = "google_oauth_csrf";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || "/my-account";
  const ref = request.nextUrl.searchParams.get("ref") || "";

  // Bound to a short-lived cookie and checked again in the callback -- state
  // round-trips through Google unmodified, so it also carries next/ref
  // through the redirect rather than relying on anything client-side.
  const csrf = randomBytes(16).toString("hex");
  const state = Buffer.from(JSON.stringify({ csrf, next, ref })).toString("base64url");

  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set(CSRF_COOKIE, csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
