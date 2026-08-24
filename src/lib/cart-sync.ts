import "server-only";
import { pool } from "@/lib/db";
import { sendCartAbandonmentEmail } from "@/lib/email";

export interface CartSyncLine {
  productId: string;
  quantity: number;
  option?: string;
}

// Full-replace sync: cheap, avoids diffing, and correctly bumps updated_at
// (and clears any prior abandoned_email_sent_at) on every real cart change --
// which is exactly the "customer is active again" signal abandonment
// detection needs.
export async function syncCustomerCart(customerId: string, lines: CartSyncLine[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM customer_cart_item WHERE customer_id = $1`, [customerId]);
    for (const line of lines) {
      if (!line.productId || !Number.isFinite(line.quantity) || line.quantity <= 0) continue;
      await client.query(
        `INSERT INTO customer_cart_item (customer_id, product_id, option_label, quantity) VALUES ($1,$2,$3,$4)`,
        [customerId, line.productId, line.option || null, line.quantity]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function clearCustomerCart(customerId: string): Promise<void> {
  await pool.query(`DELETE FROM customer_cart_item WHERE customer_id = $1`, [customerId]);
}

const ABANDONMENT_THRESHOLD_HOURS = 3;

/** Intended to run once/day via Vercel Cron (see /api/cron/cart-abandonment). */
export async function sendAbandonmentEmails(): Promise<number> {
  const staleRes = await pool.query(
    `SELECT DISTINCT ci.customer_id
     FROM customer_cart_item ci
     WHERE ci.updated_at < now() - ($1 * interval '1 hour')
       AND ci.abandoned_email_sent_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM customer_order o WHERE o.customer_id = ci.customer_id AND o.created_at > ci.updated_at
       )`,
    [ABANDONMENT_THRESHOLD_HOURS]
  );

  let sentCount = 0;
  for (const row of staleRes.rows) {
    const customerId = row.customer_id;
    const customerRes = await pool.query(`SELECT email FROM customer WHERE id = $1`, [customerId]);
    const email = customerRes.rows[0]?.email as string | undefined;
    if (!email) continue;

    const itemsRes = await pool.query(
      `SELECT ci.quantity, p.name_en, p.price_min
       FROM customer_cart_item ci
       JOIN cj_product p ON p.id = ci.product_id
       WHERE ci.customer_id = $1`,
      [customerId]
    );
    if (itemsRes.rows.length === 0) continue;

    const lines = itemsRes.rows.map((r) => ({
      productName: r.name_en as string,
      quantity: Number(r.quantity),
      unitPrice: r.price_min ? Number(r.price_min) : 0,
    }));

    try {
      await sendCartAbandonmentEmail(email, lines);
      await pool.query(
        `UPDATE customer_cart_item SET abandoned_email_sent_at = now() WHERE customer_id = $1 AND abandoned_email_sent_at IS NULL`,
        [customerId]
      );
      sentCount++;
    } catch (err) {
      console.error(`Failed to send abandonment email to customer ${customerId}:`, err);
    }
  }
  return sentCount;
}
