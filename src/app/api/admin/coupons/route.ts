import { NextRequest, NextResponse } from "next/server";
import { createCoupon, listCouponsForAdmin } from "@/lib/coupons";

export async function GET() {
  const coupons = await listCouponsForAdmin();
  return NextResponse.json(coupons);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const discountType = body?.discountType === "fixed" ? "fixed" : body?.discountType === "percent" ? "percent" : null;
  const discountValue = Number(body?.discountValue);

  if (!code || !discountType || !Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: "code, discountType, and a positive discountValue are required" }, { status: 400 });
  }

  try {
    const coupon = await createCoupon({
      code,
      discountType,
      discountValue,
      minOrderValue: body?.minOrderValue != null ? Number(body.minOrderValue) : null,
      maxUses: body?.maxUses != null ? Number(body.maxUses) : null,
      expiresAt: body?.expiresAt || null,
    });
    return NextResponse.json({ ok: true, coupon });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create coupon";
    const status = message.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "That coupon code already exists." : message }, { status });
  }
}
