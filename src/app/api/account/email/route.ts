import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { updateCustomerEmail, createVerificationToken, EmailTakenError } from "@/lib/customers";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: NextRequest) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const newEmail = typeof body?.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await updateCustomerEmail(customer.id, newEmail);
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  const token = await createVerificationToken(customer.id);
  try {
    await sendVerificationEmail(newEmail, token);
  } catch (err) {
    console.error("Failed to send verification email after email change:", err);
  }

  return NextResponse.json({ ok: true });
}
