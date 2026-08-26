import "server-only";
import { pool } from "@/lib/db";
import { getShippingEstimate } from "@/lib/cj-shipping";
import { createCjOrder, confirmOrder, simulatePay } from "@/lib/cj-orders";
import type { Order } from "@/lib/orders";
import type { ShippingInput } from "@/lib/orders";

function sandboxFlag(): boolean {
  return process.env.CJ_ORDERS_SANDBOX !== "false";
}

/** CJ's createOrderV3 only accepts one product per order -- one row per cart line. */
async function placeCjOrderForLine(
  orderId: string,
  productId: string,
  quantity: number,
  shipping: ShippingInput
): Promise<void> {
  const rowRes = await pool.query(
    `INSERT INTO customer_order_cj_fulfillment (order_id, product_id, quantity, status) VALUES ($1,$2,$3,'pending') RETURNING id`,
    [orderId, productId, quantity]
  );
  const rowId = rowRes.rows[0].id;

  try {
    const options = await getShippingEstimate(productId, shipping.zip || "", shipping.countryCode, quantity);
    if (options.length === 0) throw new Error("No CJ shipping option available for this address");

    const result = await createCjOrder({
      productDbId: productId,
      quantity,
      logisticName: options[0].method,
      shipping: {
        customerName: shipping.name,
        countryCode: shipping.countryCode,
        country: shipping.country,
        province: shipping.province || "",
        city: shipping.city,
        address: shipping.address,
        zip: shipping.zip,
        phone: shipping.phone,
        email: shipping.email,
      },
    });

    await confirmOrder(result.orderId);
    // Sandbox has no real payment step to trigger fulfillment -- simulatePay
    // stands in for it. Live mode's equivalent real-payment step isn't wired
    // up yet; CJ_ORDERS_SANDBOX must stay true until it is (see .env.local).
    if (sandboxFlag()) await simulatePay(result.orderId);

    await pool.query(
      `UPDATE customer_order_cj_fulfillment SET status = 'placed', cj_order_id = $1, cj_order_number = $2, updated_at = now() WHERE id = $3`,
      [result.orderId, result.orderNumber, rowId]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`CJ fulfillment failed for order ${orderId}, product ${productId}:`, err);
    await pool.query(
      `UPDATE customer_order_cj_fulfillment SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2`,
      [message, rowId]
    );
  }
}

/**
 * Best-effort, post-payment step -- the customer has already paid by the
 * time this runs, so a CJ failure must never surface as a failed checkout.
 * Each line is recorded individually so a partial failure (e.g. one product
 * out of stock at CJ) is visible and retryable per-line in the admin order
 * list instead of silently lost.
 */
export async function fulfillOrderWithCj(order: Order, shipping: ShippingInput): Promise<void> {
  for (let i = 0; i < order.lines.length; i++) {
    const line = order.lines[i];
    await placeCjOrderForLine(order.id, line.productId, line.quantity, shipping);
    // CJ's freightCalculate/createOrderV3 endpoints are QPS=1.
    if (i < order.lines.length - 1) await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}

export interface CjFulfillmentRow {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  status: "pending" | "placed" | "failed";
  cjOrderId: string | null;
  cjOrderNumber: string | null;
  errorMessage: string | null;
}

function rowToFulfillment(row: Record<string, unknown>): CjFulfillmentRow {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    productId: String(row.product_id),
    quantity: Number(row.quantity),
    status: row.status as CjFulfillmentRow["status"],
    cjOrderId: (row.cj_order_id as string | null) ?? null,
    cjOrderNumber: (row.cj_order_number as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
  };
}

export async function listCjFulfillmentForOrders(orderIds: string[]): Promise<Map<string, CjFulfillmentRow[]>> {
  if (orderIds.length === 0) return new Map();
  const res = await pool.query(
    `SELECT * FROM customer_order_cj_fulfillment WHERE order_id = ANY($1) ORDER BY id`,
    [orderIds]
  );
  const byOrderId = new Map<string, CjFulfillmentRow[]>();
  for (const row of res.rows) {
    const fulfillment = rowToFulfillment(row);
    byOrderId.set(fulfillment.orderId, [...(byOrderId.get(fulfillment.orderId) ?? []), fulfillment]);
  }
  return byOrderId;
}

/** Re-attempts only the failed lines for an order -- used by the admin retry action. */
export async function retryFailedCjFulfillment(orderId: string, shipping: ShippingInput): Promise<void> {
  const failedRes = await pool.query(
    `SELECT product_id, quantity FROM customer_order_cj_fulfillment WHERE order_id = $1 AND status = 'failed'`,
    [orderId]
  );
  for (let i = 0; i < failedRes.rows.length; i++) {
    const row = failedRes.rows[i];
    await pool.query(`DELETE FROM customer_order_cj_fulfillment WHERE order_id = $1 AND product_id = $2 AND status = 'failed'`, [
      orderId,
      row.product_id,
    ]);
    await placeCjOrderForLine(orderId, String(row.product_id), Number(row.quantity), shipping);
    if (i < failedRes.rows.length - 1) await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}

export async function getOrderShipping(orderId: string): Promise<ShippingInput | null> {
  const res = await pool.query(
    `SELECT shipping_name, shipping_email, shipping_country_code, shipping_country, shipping_province,
            shipping_city, shipping_address, shipping_zip, shipping_phone
     FROM customer_order WHERE id = $1`,
    [orderId]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    name: row.shipping_name,
    email: row.shipping_email,
    countryCode: row.shipping_country_code,
    country: row.shipping_country,
    province: row.shipping_province ?? undefined,
    city: row.shipping_city,
    address: row.shipping_address,
    zip: row.shipping_zip ?? undefined,
    phone: row.shipping_phone ?? undefined,
  };
}
