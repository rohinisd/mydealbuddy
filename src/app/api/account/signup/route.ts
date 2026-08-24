import { NextRequest, NextResponse } from "next/server";
import { createCustomer, createVerificationToken, findCustomerByEmail, getCustomerByReferralCode } from "@/lib/customers";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/customer-session";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const ref = typeof body?.ref === "string" ? body.ref.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }

  const existing = await findCustomerByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const referrer = ref ? await getCustomerByReferralCode(ref) : null;
  const customer = await createCustomer({ email, password, firstName, lastName, referredByCustomerId: referrer?.id ?? null });

  const verificationToken = await createVerificationToken(customer.id);
  try {
    await sendVerificationEmail(customer.email, verificationToken);
  } catch (err) {
    // Don't fail signup over a flaky/unconfigured email provider -- the
    // account still works, verification can be resent later.
    console.error("Failed to send verification email:", err);
  }

  const sessionToken = await createSession(customer.id);
  const res = NextResponse.json({ ok: true, customer: { id: customer.id, email: customer.email, firstName: customer.firstName } });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
