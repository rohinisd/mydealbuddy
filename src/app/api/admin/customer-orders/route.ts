import { NextResponse } from "next/server";
import { listAllOrdersForAdmin } from "@/lib/orders";
import { listCjFulfillmentForOrders } from "@/lib/cj-fulfillment";

export async function GET() {
  const orders = await listAllOrdersForAdmin();
  const fulfillmentByOrderId = await listCjFulfillmentForOrders(orders.map((o) => o.id));
  return NextResponse.json(
    orders.map((order) => ({ ...order, cjFulfillment: fulfillmentByOrderId.get(order.id) ?? [] }))
  );
}
