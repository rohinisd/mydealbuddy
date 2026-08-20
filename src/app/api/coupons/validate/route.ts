import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const subtotal = Number(body?.subtotal);

  if (!code || !Number.isFinite(subtotal)) {
    return NextResponse.json({ valid: false, reason: "code and subtotal are required" }, { status: 400 });
  }

  const result = await validateCoupon(code, subtotal);
  return NextResponse.json(result);
}
