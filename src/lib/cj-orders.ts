import "server-only";
import { pool } from "@/lib/db";

const CJ_API_BASE = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";

// Hard safety gate -- see the comment block around CJ_ORDERS_SANDBOX in
// .env.local for why this defaults to sandbox and must stay that way until
// a real payment gateway exists.
function sandboxFlag(): 0 | 1 {
  return process.env.CJ_ORDERS_SANDBOX === "false" ? 0 : 1;
}

async function cjFetch(path: string, opts: RequestInit = {}): Promise<Record<string, unknown>> {
  const token = process.env.CJ_ACCESS_TOKEN;
  if (!token) throw new Error("CJ_ACCESS_TOKEN missing from environment");
  const res = await fetch(`${CJ_API_BASE}${path}`, {
    ...opts,
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`CJ API error on ${path}: ${data.message}`);
  return data.data;
}

export interface CreateCjOrderInput {
  productDbId: string;
  quantity: number;
  logisticName: string;
  shipping: {
    customerName: string;
    countryCode: string;
    country: string;
    province: string;
    city: string;
    address: string;
    zip?: string;
    phone?: string;
    email?: string;
  };
}

export interface CjOrderResult {
  orderId: string;
  orderNumber: string;
  shipmentOrderId?: string;
  orderStatus?: string;
  productAmount?: number;
  postageAmount?: number;
  actualPayment?: number;
  isSandbox: boolean;
}

async function getVidForProduct(productDbId: string): Promise<string> {
  const res = await pool.query(`SELECT vid FROM cj_variant WHERE product_id = $1 ORDER BY id LIMIT 1`, [productDbId]);
  const vid = res.rows[0]?.vid as string | undefined;
  if (!vid) throw new Error("No variant found for this product");
  return vid;
}

/** Always sandbox-gated (see sandboxFlag) and always explicit about which
 * CJ store the order belongs to -- CJ defaults to the account's "default API
 * store" when storeName is omitted, which is NOT this app's store. */
export async function createCjOrder(input: CreateCjOrderInput): Promise<CjOrderResult> {
  const vid = await getVidForProduct(input.productDbId);
  const isSandbox = sandboxFlag();
  const orderNumber = `MDB-${isSandbox ? "TEST-" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const data = await cjFetch(`/shopping/order/createOrderV3`, {
    method: "POST",
    body: JSON.stringify({
      orderNumber,
      isSandbox,
      // "api" (the generic value) is rejected -- "5027:Platform api not support" -- because
      // this account's stores were authorized as WooCommerce connections (confirmed via
      // CJ's dashboard screenshot earlier), not generic API access. Using that instead.
      platform: "Woocommerce",
      payType: 3, // "order only" -- no payment initiated, even outside sandbox
      storeName: process.env.CJ_STORE_NAME,
      fromCountryCode: "CN",
      shopLogisticsType: 2, // trying "Seller Logistics" -- type 3 silently dropped logisticName (order came back logisticName:null, postageAmount:0, and confirmOrder then failed "Logistic not found")
      logisticName: input.logisticName,
      shippingCountryCode: input.shipping.countryCode,
      shippingCountry: input.shipping.country,
      shippingProvince: input.shipping.province,
      shippingCity: input.shipping.city,
      shippingCustomerName: input.shipping.customerName,
      shippingAddress: input.shipping.address,
      shippingZip: input.shipping.zip || undefined,
      shippingPhone: input.shipping.phone || undefined,
      email: input.shipping.email || undefined,
      products: [
        {
          vid,
          quantity: input.quantity,
          storeLineItemId: `${orderNumber}-1`,
        },
      ],
    }),
  });

  return {
    orderId: data.orderId as string,
    orderNumber: data.orderNumber as string,
    shipmentOrderId: data.shipmentOrderId as string | undefined,
    orderStatus: data.orderStatus as string | undefined,
    productAmount: data.productAmount != null ? Number(data.productAmount) : undefined,
    postageAmount: data.postageAmount != null ? Number(data.postageAmount) : undefined,
    actualPayment: data.actualPayment != null ? Number(data.actualPayment) : undefined,
    isSandbox: isSandbox === 1,
  };
}

export async function getOrderDetail(orderId: string): Promise<Record<string, unknown>> {
  return cjFetch(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`);
}

/** CREATED -> UNPAID. Required before simulatePay/updateStatus will accept the order --
 * verified live: both fail with "current status CREATED(100)" until this runs first. */
export async function confirmOrder(orderId: string): Promise<void> {
  await cjFetch(`/shopping/order/confirmOrder`, {
    method: "PATCH",
    body: JSON.stringify({ orderId }),
  });
}

/** Sandbox-only: simulates payment success without any real charge. */
export async function simulatePay(orderId: string): Promise<void> {
  await cjFetch(`/shopping/sandbox/simulatePay`, {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

/** Sandbox-only: advances a test order through the status lifecycle. */
export async function advanceSandboxStatus(orderId: string, targetStatus: 400 | 500 | 600 | 700): Promise<void> {
  await cjFetch(`/shopping/sandbox/updateStatus`, {
    method: "POST",
    body: JSON.stringify({ orderId, targetStatus }),
  });
}

/** Only works while status is CREATED or IN_CART, per CJ's docs. */
export async function deleteOrder(orderId: string): Promise<void> {
  await cjFetch(`/shopping/order/deleteOrder?orderId=${encodeURIComponent(orderId)}`, { method: "DELETE" });
}
