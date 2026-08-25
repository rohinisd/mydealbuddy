import "server-only";
import { pool } from "@/lib/db";
import { getProductsByIds } from "@/lib/products";
import { validateCoupon, incrementCouponUsage } from "@/lib/coupons";
import { BUDDY_COINS_RATE } from "@/lib/cj-products";
import { findCustomerById } from "@/lib/customers";
import { getCartShippingEstimate } from "@/lib/cart-shipping";

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
  status: "pending_payment" | "paid" | "cancelled";
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  buddyCoinsEarned: number;
  couponCode: string | null;
  createdAt: string;
  lines: OrderLine[];
}

function rowToOrder(row: Record<string, unknown>, lines: OrderLine[]): Order {
  return {
    id: String(row.id),
    orderNumber: row.order_number as string,
    status: row.status as Order["status"],
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    shippingAmount: Number(row.shipping_amount),
    total: Number(row.total),
    buddyCoinsEarned: Number(row.buddy_coins_earned),
    couponCode: (row.coupon_code as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    lines,
  };
}

export interface PlaceOrderInput {
  /** Null for guest checkout -- Buddy Coins/referral crediting are skipped since there's no account to credit. */
  customerId: string | null;
  lines: { productId: string; quantity: number; option?: string }[];
  couponCode?: string | null;
  shipping: {
    name: string;
    email: string;
    countryCode: string;
    country: string;
    province?: string;
    city: string;
    address: string;
    zip?: string;
    phone?: string;
  };
}

export class PlaceOrderError extends Error {}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  if (input.lines.length === 0) throw new PlaceOrderError("Your cart is empty.");

  // Never trust client-submitted prices -- re-fetch current prices server-side.
  const products = await getProductsByIds(input.lines.map((l) => l.productId));
  const productById = new Map(products.map((p) => [p.id, p]));

  const resolvedLines = input.lines.map((line) => {
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

  // Never trust a client-submitted shipping cost -- same principle as prices
  // and coupons above. Always recompute fresh here, even if the checkout UI
  // already showed a live estimate moments ago.
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
  const total = Math.max(0, subtotal - discountAmount) + shippingAmount;
  // Guests have no account to credit Buddy Coins to -- 0, not a phantom
  // amount that implies they earned something they didn't.
  const buddyCoinsEarned = input.customerId
    ? resolvedLines.reduce((sum, l) => sum + Math.round(l.unitPrice * BUDDY_COINS_RATE) * l.quantity, 0)
    : 0;

  const orderNumber = `MDB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `INSERT INTO customer_order
         (customer_id, order_number, subtotal, discount_amount, shipping_amount, total, buddy_coins_earned,
          coupon_code, shipping_name, shipping_email, shipping_country_code, shipping_country, shipping_province,
          shipping_city, shipping_address, shipping_zip, shipping_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        input.customerId,
        orderNumber,
        subtotal,
        discountAmount,
        shippingAmount,
        total,
        buddyCoinsEarned,
        couponCode,
        input.shipping.name,
        input.shipping.email,
        input.shipping.countryCode,
        input.shipping.country,
        input.shipping.province || null,
        input.shipping.city,
        input.shipping.address,
        input.shipping.zip || null,
        input.shipping.phone || null,
      ]
    );
    const orderRow = orderRes.rows[0];

    for (const line of resolvedLines) {
      await client.query(
        `INSERT INTO customer_order_line (order_id, product_id, product_name, option_label, unit_price, quantity)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderRow.id, line.productId, line.productName, line.optionLabel, line.unitPrice, line.quantity]
      );
    }

    if (buddyCoinsEarned > 0 && input.customerId) {
      await client.query(
        `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1,$2,'purchase',$3)`,
        [input.customerId, buddyCoinsEarned, orderRow.id]
      );
    }

    if (couponCode) {
      await incrementCouponUsage(couponCode);
    }

    // Referral reward triggers on the referred customer's first order, per the
    // product doc ("registers" + "completes minimum qualified purchase") --
    // not applicable to guest orders, there's no account to have been referred.
    if (input.customerId) {
      const orderCountRes = await client.query(`SELECT COUNT(*) AS n FROM customer_order WHERE customer_id = $1`, [
        input.customerId,
      ]);
      const isFirstOrder = Number(orderCountRes.rows[0].n) === 1;
      if (isFirstOrder) {
        const customer = await findCustomerById(input.customerId);
        if (customer?.referredByCustomerId) {
          await client.query(
            `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1,$2,'referral_bonus',$3)`,
            [customer.referredByCustomerId, REFERRAL_BONUS_COINS, orderRow.id]
          );
          await client.query(
            `INSERT INTO buddy_coin_ledger (customer_id, amount, reason, order_id) VALUES ($1,$2,'referred_signup_bonus',$3)`,
            [input.customerId, REFERRED_SIGNUP_BONUS_COINS, orderRow.id]
          );
        }
      }
    }

    await client.query("COMMIT");
    return rowToOrder(
      orderRow,
      resolvedLines.map((l) => ({ ...l }))
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

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
