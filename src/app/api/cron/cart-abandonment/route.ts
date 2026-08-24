import { NextRequest, NextResponse } from "next/server";
import { sendAbandonmentEmails } from "@/lib/cart-sync";

// Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when
// CRON_SECRET is set as a project env var -- this rejects any other caller.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await sendAbandonmentEmails();
  return NextResponse.json({ ok: true, sent });
}
