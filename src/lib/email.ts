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

export interface OrderConfirmationLine {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export async function sendOrderConfirmationEmail(
  to: string,
  order: { orderNumber: string; total: number; buddyCoinsEarned: number; lines: OrderConfirmationLine[] },
  paymentMethod?: string
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const rows = order.lines
    .map(
      (l) =>
        `<tr><td>${l.productName} × ${l.quantity}</td><td style="text-align:right">$${(l.unitPrice * l.quantity).toFixed(2)}</td></tr>`
    )
    .join("");
  await sendEmail(
    to,
    `Order confirmed — ${order.orderNumber}`,
    `<p>Thanks for your order! Here's a summary of ${order.orderNumber}:</p>
     <table style="width:100%;border-collapse:collapse">${rows}</table>
     <p><strong>Total: $${order.total.toFixed(2)}</strong></p>
     ${paymentMethod ? `<p>Paid via ${paymentMethod}.</p>` : ""}
     <p>You earned ${order.buddyCoinsEarned} Buddy Coins on this order.</p>
     <p><a href="${siteUrl}/account/orders">View your order</a></p>`
  );
}

export interface CartAbandonmentLine {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export async function sendCartAbandonmentEmail(to: string, lines: CartAbandonmentLine[]): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const rows = lines
    .map(
      (l) =>
        `<tr><td>${l.productName} × ${l.quantity}</td><td style="text-align:right">$${(l.unitPrice * l.quantity).toFixed(2)}</td></tr>`
    )
    .join("");
  await sendEmail(
    to,
    "You left something in your cart",
    `<p>Still thinking it over? Your cart is waiting for you:</p>
     <table style="width:100%;border-collapse:collapse">${rows}</table>
     <p><a href="${siteUrl}/cart">Return to your cart</a></p>`
  );
}
