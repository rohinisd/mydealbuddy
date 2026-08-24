import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ customer: null });
  return NextResponse.json({ customer: { id: customer.id, email: customer.email, firstName: customer.firstName } });
}
