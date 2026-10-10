import { NextRequest, NextResponse } from "next/server";
import { getContactMessageById, markContactMessageReplied } from "@/lib/contact-messages";
import { sendContactReplyEmail } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const replyMessage = typeof body?.message === "string" ? body.message.trim() : "";

  if (!replyMessage) {
    return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
  }

  const contactMessage = await getContactMessageById(id);
  if (!contactMessage) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (contactMessage.repliedAt) {
    return NextResponse.json({ error: "Already replied to this message." }, { status: 409 });
  }

  // Sending the email IS the action here (unlike the original inquiry, where
  // saving the row is primary and the notification email is best-effort) --
  // if Resend fails, nothing happened, so surface the error instead of
  // silently marking it replied.
  try {
    await sendContactReplyEmail({
      to: contactMessage.email,
      customerName: contactMessage.name,
      originalSubject: contactMessage.subject,
      originalMessage: contactMessage.message,
      replyMessage,
    });
  } catch (err) {
    console.error(`Failed to send reply for contact message ${id}:`, err);
    const message = err instanceof Error ? err.message : "Failed to send reply email.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await markContactMessageReplied(id, replyMessage);
  return NextResponse.json({ ok: true });
}
