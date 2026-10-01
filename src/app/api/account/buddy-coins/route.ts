import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getBuddyCoinLedger } from "@/lib/orders";

/** Balance-only lookup for the checkout redemption UI -- full history lives at /account/buddy-coins. */
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ balance: 0 });
  const { balance } = await getBuddyCoinLedger(customer.id);
  return NextResponse.json({ balance });
}
