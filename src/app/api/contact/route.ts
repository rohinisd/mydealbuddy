import { NextRequest, NextResponse } from "next/server";
import { saveContactMessage, markContactMessageEmailSent } from "@/lib/contact-messages";
import { sendContactNotificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json({ error: "Name, a valid email, and a message are required." }, { status: 400 });
  }

  const id = await saveContactMessage({ name, email, subject: subject || undefined, message });

  try {
    await sendContactNotificationEmail({ name, email, subject: subject || undefined, message });
    await markContactMessageEmailSent(id);
  } catch (err) {
    // The message is already saved either way -- don't fail the customer's
    // submission over a flaky email provider, same pattern as signup's
    // verification email.
    console.error("Failed to send contact notification email:", err);
  }

  return NextResponse.json({ ok: true });
}
