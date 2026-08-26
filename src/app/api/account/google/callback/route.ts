import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForUserinfo } from "@/lib/google-oauth";
import {
  createCustomer,
  findCustomerByEmail,
  findCustomerByGoogleId,
  getCustomerByReferralCode,
  linkGoogleId,
} from "@/lib/customers";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/customer-session";

const CSRF_COOKIE = "google_oauth_csrf";

interface GoogleState {
  csrf: string;
  next: string;
  ref: string;
}

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const failUrl = (message: string) => new URL(`/login?error=${encodeURIComponent(message)}`, siteUrl);

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) return NextResponse.redirect(failUrl("Google sign-in was cancelled."));
  if (!code || !stateRaw) return NextResponse.redirect(failUrl("Invalid Google sign-in response."));

  let state: GoogleState;
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
  } catch {
    return NextResponse.redirect(failUrl("Invalid Google sign-in state."));
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!csrfCookie || csrfCookie !== state.csrf) {
    return NextResponse.redirect(failUrl("Your Google sign-in session expired -- please try again."));
  }

  try {
    const googleUser = await exchangeCodeForUserinfo(code);

    let customer = await findCustomerByGoogleId(googleUser.googleId);
    if (!customer) {
      const existing = await findCustomerByEmail(googleUser.email);
      if (existing) {
        // Same email as an existing password account -- link rather than
        // create a duplicate, so their orders/coins/referrals stay intact.
        if (googleUser.emailVerified) await linkGoogleId(existing.id, googleUser.googleId);
        customer = existing;
      } else {
        const referrer = state.ref ? await getCustomerByReferralCode(state.ref) : null;
        customer = await createCustomer({
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          referredByCustomerId: referrer?.id ?? null,
          googleId: googleUser.googleId,
          emailVerified: googleUser.emailVerified,
        });
      }
    }

    const sessionToken = await createSession(customer.id);
    const res = NextResponse.redirect(new URL(state.next || "/my-account", siteUrl));
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    res.cookies.delete(CSRF_COOKIE);
    return res;
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return NextResponse.redirect(failUrl("Something went wrong signing in with Google."));
  }
}
