import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getReviewStatus } from "@/lib/customer-reviews";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  const status = await getReviewStatus(customer?.id ?? null, id);
  return NextResponse.json(status);
}
