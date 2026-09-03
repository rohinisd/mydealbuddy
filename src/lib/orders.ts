import "server-only";
import { pool } from "@/lib/db";
import { getProductsByIds } from "@/lib/products";
import { validateCoupon, incrementCouponUsage } from "@/lib/coupons";
import { BUDDY_COINS_RATE } from "@/lib/cj-products";
import { findCustomerById } from "@/lib/customers";
import { getCartShippingEstimate } from "@/lib/cart-shipping";
import { calculateTax } from "@/lib/tax";

export const REFERRAL_BONUS_COINS = 50; // credited to the referrer
export const REFERRED_SIGNUP_BONUS_COINS = 25; // credited to the new customer

export interface OrderLine {
  productId: string;
  productName: string;
  optionLabel: string | null;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: "pending_payment" | "paid" | "cancelled" | "refunded";
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  buddyCoinsEarned: number;
  couponCode: string | null;
  shippingEmail: string;
  paymentMethod: "paypal" | "stripe";
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paypalRefundId: string | null;
  stripePaymentIntentId: string | null;
  stripeRefundId: string | null;
  refundedAt: string | null;
  createdAt: string;
  lines: OrderLine[];
}

export function rowToOrder(row: Record<string, unknown>, lines: OrderLine[]): Order {
  return {
    id: String(row.id),
    orderNumber: row.order_number as string,
    status: row.status as Order["status"],
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    shippingAmount: Number(row.shipping_amount),
    taxAmount: Number(row.tax_amount ?? 0),
    total: Number(row.total),
    buddyCoinsEarned: Number(row.buddy_coins_earned),
    couponCode: (row.coupon_code as string | null) ?? null,
    shippingEmail: row.shipping_email as string,
    paymentMethod: (row.payment_method as Order["paymentMethod"]) ?? "paypal",
    paypalOrderId: (row.paypal_order_id as string | null) ?? null,
    paypalCaptureId: (row.paypal_capture_id as string | null) ?? null,
    paypalRefundId: (row.paypal_refund_id as string | null) ?? null,
    stripePaymentIntentId: (row.stripe_payment_intent_id as string | null) ?? null,
    stripeRefundId: (row.stripe_refund_id as string | null) ?? null,
    refundedAt: row.refunded_at ? new Date(row.refunded_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
    lines,
  };
}

export interface ShippingInput {
  name: string;
  email: string;
  countryCode: string;
  country: string;
  province?: string;
  city: string;
  address: string;
  zip?: string;
  phone?: string;
}

interface ResolvedOrder {
  customerId: string | null;
  resolvedLines: OrderLine[];
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  buddyCoinsEarned: number;
  shipping: ShippingInput;
  status: "pending_payment" | "paid";
  paymentMethod: "paypal" | "stripe";
  paypalOrderId?: string;
  paypalCaptureId?: string;
  stripePaymentIntentId?: string;
}

export class PlaceOrderError extends Error {}

/** Shared DB write path for both the no-payment flow and the PayPal-captured flow. */
async function insertOrderRecord(resolved: ResolvedOrder): Promise<Order> {
  const orderNumber = `MDB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `INSERT INTO customer_order
         (customer_id, order_number, status, subtotal, discount_amount, shipping_amount, tax_amount, total, buddy_coins_earned,
          coupon_code, shipping_name, shipping_email, shipping_country_code, shipping_country, shipping_province,
          shipping_city, shipping_address, shipping_zip, shipping_phone, payment_method, paypal_order_id, paypal_capture_id,
          stripe_payment_intent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        resolved.customerId,
        orderNumber,
        resolved.status,
        resolved.subtotal,
        resolved.discountAmount,
        resolved.shippingAmount,
        resolved.taxAmount,
        resolved.total,
        resolved.buddyCoinsEarned,
        resolved.couponCode,
        resolved.shipping.name,
        resolved.shipping.email,
        resolved.shipping.countryCode,
        resolved.shipping.country,
        resolved.shipping.province || null,
        resolved.shipping.city,
        resolved.shipping.address,
        resolved.shipping.zip || null,
        resolved.shipping.phone || null,
        resolved.paymentMethod,
        resolved.paypalOrderId ?? null,
        resolved.paypalCaptureId ?? null,
        resolved.stripePaymentIntentId ?? null,
      ]
    );
    const orderRow = orderRes.rows[0];

    for (const line of resolved.resolvedLines) {
      await client.query(
        `INSERT INTO customer_order_line (order_id, product_id, product_name, option_label, unit_price, quantity)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderRow.id, line.productId, line.productName, line.optionLabel, line.unitPrice, line.quantity]
      );
    }

    if (resolved.buddyCoinsEarned > 0 && resolved.customerId) {
      await client.query(
        `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1,$2,'purchase',$3)`,
        [resolved.customerId, resolved.buddyCoinsEarned, orderRow.id]
      );
    }

    if (resolved.couponCode) {
      await incrementCouponUsage(resolved.couponCode);
    }

    // Referral reward triggers on the referred customer's first order, per the
    // product doc ("registers" + "completes minimum qualified purchase") --
    // not applicable to guest orders, there's no account to have been referred.
    if (resolved.customerId) {
      const orderCountRes = await client.query(`SELECT COUNT(*) AS n FROM customer_order WHERE customer_id = $1`, [
        resolved.customerId,
      ]);
      const isFirstOrder = Number(orderCountRes.rows[0].n) === 1;
      if (isFirstOrder) {
        const customer = await findCustomerById(resolved.customerId);
        if (customer?.referredByCustomerId) {
          await client.query(
            `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1,$2,'referral_bonus',$3)`,
            [customer.referredByCustomerId, REFERRAL_BONUS_COINS, orderRow.id]
          );
          await client.query(
            `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1,$2,'referred_signup_bonus',$3)`,
            [resolved.customerId, REFERRED_SIGNUP_BONUS_COINS, orderRow.id]
          );
        }
      }
    }

    await client.query("COMMIT");
    return rowToOrder(orderRow, resolved.resolvedLines);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface ResolveOrderInput {
  customerId: string | null;
  lines: { productId: string; quantity: number; option?: string }[];
  couponCode?: string | null;
  shipping: ShippingInput;
}

/** Re-fetches real prices/coupon/shipping server-side -- never trusts client-submitted amounts. */
async function resolveOrder(
  input: ResolveOrderInput
): Promise<Omit<ResolvedOrder, "status" | "paymentMethod" | "paypalOrderId" | "paypalCaptureId" | "stripePaymentIntentId">> {
  if (input.lines.length === 0) throw new PlaceOrderError("Your cart is empty.");

  const products = await getProductsByIds(input.lines.map((l) => l.productId));
  const productById = new Map(products.map((p) => [p.id, p]));

  const resolvedLines: OrderLine[] = input.lines.map((line) => {
    const product = productById.get(line.productId);
    if (!product) throw new PlaceOrderError(`A product in your cart is no longer available.`);
    return {
      productId: product.id,
      productName: product.name,
      optionLabel: line.option ?? null,
      unitPrice: product.price,
      quantity: line.quantity,
    };
  });

  const subtotal = resolvedLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  let discountAmount = 0;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const result = await validateCoupon(input.couponCode, subtotal);
    if (!result.valid) throw new PlaceOrderError(result.reason || "That coupon can't be applied.");
    discountAmount = result.discountAmount ?? 0;
    couponCode = result.coupon?.code ?? input.couponCode;
  }

  if (!input.shipping.zip?.trim()) {
    throw new PlaceOrderError("A ZIP/postal code is required to calculate shipping.");
  }
  const shippingResult = await getCartShippingEstimate(
    resolvedLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    input.shipping.countryCode,
    input.shipping.zip
  );
  if (!shippingResult.shippable) {
    throw new PlaceOrderError("One or more items in your cart can't be shipped to that address.");
  }
  const shippingAmount = shippingResult.total;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = calculateTax(taxableAmount, input.shipping.countryCode, input.shipping.province);
  const total = taxableAmount + shippingAmount + taxAmount;
  // Guests have no account to credit Buddy Coins to -- 0, not a phantom
  // amount that implies they earned something they didn't.
  const buddyCoinsEarned = input.customerId
    ? resolvedLines.reduce((sum, l) => sum + Math.round(l.unitPrice * BUDDY_COINS_RATE) * l.quantity, 0)
    : 0;

  return {
    customerId: input.customerId,
    resolvedLines,
    subtotal,
    discountAmount,
    couponCode,
    shippingAmount,
    taxAmount,
    total,
    buddyCoinsEarned,
    shipping: input.shipping,
  };
}

export type PlaceOrderInput = ResolveOrderInput;

/** No-payment flow (kept for internal/testing use -- checkout itself now routes through PayPal or Stripe). */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const resolved = await resolveOrder(input);
  return insertOrderRecord({ ...resolved, status: "pending_payment", paymentMethod: "paypal" });
}

/** Used by the PayPal capture flow -- amounts are already resolved and stored server-side, not recomputed. */
export async function insertPaidOrder(
  resolved: Omit<ResolvedOrder, "status" | "paymentMethod" | "paypalOrderId" | "paypalCaptureId" | "stripePaymentIntentId">,
  paypalOrderId: string,
  paypalCaptureId: string
): Promise<Order> {
  return insertOrderRecord({ ...resolved, status: "paid", paymentMethod: "paypal", paypalOrderId, paypalCaptureId });
}

/** Used by the Stripe confirm flow -- amounts are already resolved and stored server-side, not recomputed. */
export async function insertPaidStripeOrder(
  resolved: Omit<ResolvedOrder, "status" | "paymentMethod" | "paypalOrderId" | "paypalCaptureId" | "stripePaymentIntentId">,
  stripePaymentIntentId: string
): Promise<Order> {
  return insertOrderRecord({ ...resolved, status: "paid", paymentMethod: "stripe", stripePaymentIntentId });
}

export { resolveOrder };

export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  const orderRes = await pool.query(`SELECT * FROM customer_order WHERE customer_id = $1 ORDER BY created_at DESC`, [
    customerId,
  ]);
  const orders = orderRes.rows;
  if (orders.length === 0) return [];

  const lineRes = await pool.query(
    `SELECT * FROM customer_order_line WHERE order_id = ANY($1) ORDER BY id`,
    [orders.map((o) => o.id)]
  );
  const linesByOrderId = new Map<string, OrderLine[]>();
  for (const row of lineRes.rows) {
    const key = String(row.order_id);
    const line: OrderLine = {
      productId: String(row.product_id),
      productName: row.product_name,
      optionLabel: row.option_label,
      unitPrice: Number(row.unit_price),
      quantity: Number(row.quantity),
    };
    linesByOrderId.set(key, [...(linesByOrderId.get(key) ?? []), line]);
  }

  return orders.map((row) => rowToOrder(row, linesByOrderId.get(String(row.id)) ?? []));
}

/** Unscoped, most-recent-first -- for the admin order list, callers must enforce their own auth. */
export async function listAllOrdersForAdmin(limit = 200): Promise<Order[]> {
  const orderRes = await pool.query(`SELECT * FROM customer_order ORDER BY created_at DESC LIMIT $1`, [limit]);
  const orders = orderRes.rows;
  if (orders.length === 0) return [];

  const lineRes = await pool.query(`SELECT * FROM customer_order_line WHERE order_id = ANY($1) ORDER BY id`, [
    orders.map((o) => o.id),
  ]);
  const linesByOrderId = new Map<string, OrderLine[]>();
  for (const row of lineRes.rows) {
    const key = String(row.order_id);
    const line: OrderLine = {
      productId: String(row.product_id),
      productName: row.product_name,
      optionLabel: row.option_label,
      unitPrice: Number(row.unit_price),
      quantity: Number(row.quantity),
    };
    linesByOrderId.set(key, [...(linesByOrderId.get(key) ?? []), line]);
  }

  return orders.map((row) => rowToOrder(row, linesByOrderId.get(String(row.id)) ?? []));
}

/** Public lookup for the Track Order page -- requires the shipping email to match, so an order number alone can't expose someone else's order. */
export async function getOrderByNumberAndEmail(orderNumber: string, email: string): Promise<Order | null> {
  const orderRes = await pool.query(
    `SELECT * FROM customer_order WHERE order_number = $1 AND lower(shipping_email) = lower($2)`,
    [orderNumber, email]
  );
  const orderRow = orderRes.rows[0];
  if (!orderRow) return null;

  const lineRes = await pool.query(`SELECT * FROM customer_order_line WHERE order_id = $1 ORDER BY id`, [orderRow.id]);
  const lines: OrderLine[] = lineRes.rows.map((row) => ({
    productId: String(row.product_id),
    productName: row.product_name,
    optionLabel: row.option_label,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
  }));
  return rowToOrder(orderRow, lines);
}

/** Unscoped lookup by id -- for admin use only, callers must enforce their own auth. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const orderRes = await pool.query(`SELECT * FROM customer_order WHERE id = $1`, [orderId]);
  const orderRow = orderRes.rows[0];
  if (!orderRow) return null;

  const lineRes = await pool.query(
    `SELECT * FROM customer_order_line WHERE order_id = $1 ORDER BY id`,
    [orderRow.id]
  );
  const lines: OrderLine[] = lineRes.rows.map((row) => ({
    productId: String(row.product_id),
    productName: row.product_name,
    optionLabel: row.option_label,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
  }));
  return rowToOrder(orderRow, lines);
}

export interface BuddyCoinLedgerRow {
  id: string;
  amount: number;
  reason: "purchase" | "referral_bonus" | "referred_signup_bonus";
  orderNumber: string | null;
  createdAt: string;
}

export async function getBuddyCoinLedger(customerId: string): Promise<{ balance: number; rows: BuddyCoinLedgerRow[] }> {
  const res = await pool.query(
    `SELECT l.id, l.amount, l.reason, l.created_at, o.order_number
     FROM buddy_coin_ledger l
     LEFT JOIN customer_order o ON o.id = l.order_id
     WHERE l.customer_id = $1
     ORDER BY l.created_at DESC`,
    [customerId]
  );
  const rows: BuddyCoinLedgerRow[] = res.rows.map((row) => ({
    id: String(row.id),
    amount: Number(row.amount),
    reason: row.reason,
    orderNumber: row.order_number ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  }));
  const balance = rows.reduce((sum, r) => sum + r.amount, 0);
  return { balance, rows };
}
