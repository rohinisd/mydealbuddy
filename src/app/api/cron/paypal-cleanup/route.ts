import { NextRequest, NextResponse } from "next/server";
import { cleanupStalePendingPaypalOrders } from "@/lib/paypal-checkout";

// Same auth pattern as /api/cron/cart-abandonment -- Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET` automatically once CRON_SECRET is set
// as a project env var.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupStalePendingPaypalOrders();
  return NextResponse.json({ ok: true, deleted });
}
