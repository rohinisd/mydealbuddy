import { NextRequest, NextResponse } from "next/server";
import { sendPriceDropAlerts } from "@/lib/wishlist-sync";

// Same Vercel Cron auth pattern as the other /api/cron/* routes.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await sendPriceDropAlerts();
  return NextResponse.json({ ok: true, sent });
}
