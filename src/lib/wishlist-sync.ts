import "server-only";
import { pool } from "@/lib/db";
import { sendPriceDropEmail, type PriceDropItem } from "@/lib/email";

/**
 * Write-mirror sync, same shape as syncCustomerCart (cart-sync.ts) -- the
 * localStorage wishlist stays the source of truth for rendering, this just
 * gives a cron something server-queryable to check prices against. Only
 * inserts genuinely new items (price baseline = current price right now);
 * never touches last_known_price for items that remain, so a plain re-sync
 * (e.g. every page load) can't erase a price-drop baseline that's still
 * waiting to be checked.
 */
export async function syncCustomerWishlist(customerId: string, productIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (uniqueIds.length === 0) {
      await client.query(`DELETE FROM customer_wishlist_item WHERE customer_id = $1`, [customerId]);
    } else {
      await client.query(`DELETE FROM customer_wishlist_item WHERE customer_id = $1 AND product_id != ALL($2)`, [
        customerId,
        uniqueIds,
      ]);
      await client.query(
        `INSERT INTO customer_wishlist_item (customer_id, product_id, last_known_price)
         SELECT $1, p.id, COALESCE(p.override_price, p.price_min, 0)
         FROM cj_product p
         WHERE p.id = ANY($2)
         ON CONFLICT (customer_id, product_id) DO NOTHING`,
        [customerId, uniqueIds]
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

/** Intended to run once/day via Vercel Cron (see /api/cron/deal-alerts). Returns the number of customers emailed. */
export async function sendPriceDropAlerts(): Promise<number> {
  const res = await pool.query(
    `SELECT w.id AS wishlist_item_id, w.customer_id, w.last_known_price, p.id AS product_id, p.name_en,
            COALESCE(p.override_price, p.price_min, 0) AS current_price
     FROM customer_wishlist_item w
     JOIN cj_product p ON p.id = w.product_id
     WHERE p.is_active = true AND COALESCE(p.override_price, p.price_min, 0) < w.last_known_price`
  );
  if (res.rows.length === 0) return 0;

  const byCustomer = new Map<string, { items: (PriceDropItem & { wishlistItemId: string })[] }>();
  for (const row of res.rows) {
    const customerId = String(row.customer_id);
    const entry = byCustomer.get(customerId) ?? { items: [] };
    entry.items.push({
      wishlistItemId: String(row.wishlist_item_id),
      productId: String(row.product_id),
      productName: row.name_en,
      oldPrice: Number(row.last_known_price),
      newPrice: Number(row.current_price),
    });
    byCustomer.set(customerId, entry);
  }

  let sentCount = 0;
  for (const [customerId, { items }] of byCustomer) {
    const customerRes = await pool.query(`SELECT email FROM customer WHERE id = $1`, [customerId]);
    const email = customerRes.rows[0]?.email as string | undefined;
    if (!email) continue;

    try {
      await sendPriceDropEmail(email, items);
      // Move the baseline to the new (lower) price -- catches a *further*
      // drop later without re-alerting for the same one repeatedly.
      for (const item of items) {
        await pool.query(`UPDATE customer_wishlist_item SET last_known_price = $1 WHERE id = $2`, [
          item.newPrice,
          item.wishlistItemId,
        ]);
      }
      sentCount++;
    } catch (err) {
      console.error(`Failed to send price-drop email to customer ${customerId}:`, err);
    }
  }
  return sentCount;
}
