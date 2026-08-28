import { NextRequest, NextResponse } from "next/server";
import { getOrderByNumberAndEmail } from "@/lib/orders";
import { listCjFulfillmentForOrders } from "@/lib/cj-fulfillment";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Doesn't claim "Shipped"/"Delivered" -- there's no real shipment-tracking
// integration with CJ yet, only payment status and whether we've placed the
// sourcing order with our supplier. Never show more than that's actually true.
function trackingStage(orderStatus: string, fulfillmentStatuses: string[]): string {
  if (orderStatus === "cancelled") return "This order was cancelled.";
  if (orderStatus === "refunded") return "This order was refunded.";
  if (orderStatus === "pending_payment") return "Awaiting payment.";
  if (fulfillmentStatuses.length > 0 && fulfillmentStatuses.every((s) => s === "placed")) {
    return "Payment confirmed. Your order has been placed with our supplier and is being prepared for shipment.";
  }
  return "Payment confirmed. We're preparing your order.";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!orderNumber || !email) {
    return NextResponse.json({ error: "Order number and email are required." }, { status: 400 });
  }

  const order = await getOrderByNumberAndEmail(orderNumber, email);
  if (!order) {
    return NextResponse.json({ error: "We couldn't find an order matching that order number and email." }, { status: 404 });
  }

  const fulfillmentByOrder = await listCjFulfillmentForOrders([order.id]);
  const fulfillmentStatuses = (fulfillmentByOrder.get(order.id) ?? []).map((f) => f.status);

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: STATUS_LABEL[order.status] ?? order.status,
    createdAt: order.createdAt,
    total: order.total,
    lines: order.lines.map((l) => ({ productName: l.productName, optionLabel: l.optionLabel, quantity: l.quantity })),
    stageMessage: trackingStage(order.status, fulfillmentStatuses),
  });
}
