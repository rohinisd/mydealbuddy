import "server-only";

const RESEND_API_BASE = "https://api.resend.com";

// Switched from AgentMail 2026-08-26 -- AgentMail is built for AI agents that
// send AND receive mail (real inboxes); this app only ever sends one-way
// transactional email, so a plain transactional API is a much cheaper fit
// (Resend's free tier: 3,000/mo, 100/day vs AgentMail's $20/mo paywall).
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(`[email] RESEND_API_KEY/RESEND_FROM_EMAIL not set -- skipping send. Would have sent to ${to}: ${subject}`);
    return;
  }

  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
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
