import { NextResponse } from "next/server";
import { listAllOrdersForAdmin } from "@/lib/orders";

export async function GET() {
  const orders = await listAllOrdersForAdmin();
  return NextResponse.json(orders);
}
