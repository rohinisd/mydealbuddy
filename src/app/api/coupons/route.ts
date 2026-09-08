import { NextResponse } from "next/server";
import { listPublicActiveCoupons } from "@/lib/coupons";

// No auth -- these are meant to be publicly advertised (cart banner,
// /account/coupons), same as a promo code printed on a flyer.
export async function GET() {
  const coupons = await listPublicActiveCoupons();
  return NextResponse.json(
    coupons.map((c) => ({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValue: c.minOrderValue,
    }))
  );
}
