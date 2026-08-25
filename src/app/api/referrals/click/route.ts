import { NextRequest, NextResponse } from "next/server";
import { getCustomerByReferralCode } from "@/lib/customers";
import { recordReferralClick } from "@/lib/referral-clicks";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  // Silently no-op on a garbage/unknown code rather than erroring -- this is
  // a public, unauthenticated endpoint hit by anyone who lands on a referral
  // link, valid or not.
  if (code) {
    const customer = await getCustomerByReferralCode(code);
    if (customer) await recordReferralClick(code);
  }

  return NextResponse.json({ ok: true });
}
