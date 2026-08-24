import "server-only";

const AGENTMAIL_API_BASE = "https://api.agentmail.to";

// Built against AgentMail's documented REST API (agentmail.to/docs/quickstart)
// but NOT yet exercised against a live account -- no API key exists yet.
// Verify this against a real send once AGENTMAIL_API_KEY / AGENTMAIL_INBOX_ID
// are set, the same way every other external integration in this project was
// verified against live behavior before being trusted.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    console.warn(`[email] AGENTMAIL_API_KEY/AGENTMAIL_INBOX_ID not set -- skipping send. Would have sent to ${to}: ${subject}`);
    return;
  }

  const res = await fetch(`${AGENTMAIL_API_BASE}/inboxes/${inboxId}/messages/send`, {
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
