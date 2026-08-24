import "server-only";

const AGENTMAIL_API_BASE = "https://api.agentmail.to";

// Verified live 2026-08-24 against a real AgentMail account: created an inbox
// via POST /inboxes, sent through this exact function, confirmed the message
// actually arrived via GET /inboxes/{id}/messages. One real bug this caught:
// AgentMail's inbox "id" is actually its own email address (e.g.
// "foo@agentmail.to"), not an opaque token -- the "@" must be URL-encoded in
// the path, which the first draft (built from docs alone) didn't do.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    console.warn(`[email] AGENTMAIL_API_KEY/AGENTMAIL_INBOX_ID not set -- skipping send. Would have sent to ${to}: ${subject}`);
    return;
  }

  const res = await fetch(`${AGENTMAIL_API_BASE}/inboxes/${encodeURIComponent(inboxId)}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AgentMail send failed (${res.status}): ${body}`);
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your MyDealBuddy account",
    `<p>Welcome to MyDealBuddy! Click below to verify your email address:</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}
