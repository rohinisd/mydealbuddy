import "server-only";
import { pool } from "@/lib/db";
import { uploadToBlob, deleteFromBlob } from "@/lib/blob";
import { sendRewardEmail } from "@/lib/email";

export interface ReviewStatus {
  loggedIn: boolean;
  eligible: boolean;
  existingReview: {
    id: string;
    rating: number;
    body: string;
    photos: { id: string; url: string }[];
    videos: { id: string; url: string }[];
  } | null;
}

// "Verified buyer" is gated on having ordered the product, not on payment
// status -- there's no live payment gateway yet, so every order sits at
// status='pending_payment' forever (see src/lib/orders.ts). Buddy Coins and
// referral bonuses already credit at order-creation time for the same
// reason; this follows that established precedent. Tighten to status='paid'
// once a real gateway exists.
export async function getReviewStatus(customerId: string | null, productId: string): Promise<ReviewStatus> {
  if (!customerId) return { loggedIn: false, eligible: false, existingReview: null };

  const [eligibleRes, existingRes] = await Promise.all([
    pool.query(
      `SELECT 1 FROM customer_order_line col
       JOIN customer_order co ON co.id = col.order_id
       WHERE co.customer_id = $1 AND col.product_id = $2 AND co.status != 'cancelled'
       LIMIT 1`,
      [customerId, productId]
    ),
    pool.query(`SELECT id, rating, body FROM customer_product_review WHERE customer_id = $1 AND product_id = $2`, [
      customerId,
      productId,
    ]),
  ]);

  const existingRow = existingRes.rows[0];
  if (!existingRow) {
    return { loggedIn: true, eligible: eligibleRes.rows.length > 0, existingReview: null };
  }

  const [photosRes, videosRes] = await Promise.all([
    pool.query(`SELECT id, url FROM customer_review_photo WHERE review_id = $1 ORDER BY position`, [existingRow.id]),
    pool.query(`SELECT id, url FROM customer_review_video WHERE review_id = $1 ORDER BY position`, [existingRow.id]),
  ]);

  return {
    loggedIn: true,
    eligible: eligibleRes.rows.length > 0,
    existingReview: {
      id: String(existingRow.id),
      rating: Number(existingRow.rating),
      body: existingRow.body,
      photos: photosRes.rows.map((p) => ({ id: String(p.id), url: p.url })),
      videos: videosRes.rows.map((v) => ({ id: String(v.id), url: v.url })),
    },
  };
}

export class ReviewError extends Error {}

export const REVIEW_BONUS_COINS = 20;

/** Returns the saved review's id and the number of Buddy Coins just credited -- 0 coins when this was an edit of an existing review, not a first-time one. */
export async function submitReview(
  customerId: string,
  productId: string,
  rating: number,
  body: string
): Promise<{ reviewId: string; coinsEarned: number }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewError("Rating must be 1-5.");
  if (!body.trim()) throw new ReviewError("Review text is required.");

  const status = await getReviewStatus(customerId, productId);
  if (!status.eligible) throw new ReviewError("Only customers who've purchased this product can leave a review.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // xmax = 0 is the standard Postgres trick for "this row came from the
    // INSERT, not the ON CONFLICT UPDATE" -- an UPDATE always stamps xmax
    // with the current transaction. Distinguishes a first-time review
    // (earns coins) from an edit of an existing one (doesn't, or editing a
    // review repeatedly would farm Buddy Coins for free).
    const res = await client.query(
      `INSERT INTO customer_product_review (product_id, customer_id, rating, body)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, customer_id) DO UPDATE SET rating = $3, body = $4, updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [productId, customerId, rating, body.trim()]
    );
    const reviewId = String(res.rows[0].id);
    const isFirstReview = res.rows[0].inserted as boolean;

    if (isFirstReview) {
      await client.query(`INSERT INTO buddy_coin_ledger (customer_id, amount, reason) VALUES ($1, $2, 'review_bonus')`, [
        customerId,
        REVIEW_BONUS_COINS,
      ]);
    }

    await client.query("COMMIT");

    if (isFirstReview) {
      // Best-effort, outside the transaction -- this is the only email a
      // review bonus gets; the in-app success message already covers the
      // customer's own session, but they're not always still looking at it.
      pool
        .query(`SELECT email, first_name FROM customer WHERE id = $1`, [customerId])
        .then((r) => {
          const row = r.rows[0];
          if (!row) return;
          return sendRewardEmail(row.email, row.first_name, REVIEW_BONUS_COINS, "thanks for reviewing a product you bought");
        })
        .catch((err) => console.error("Failed to send review-bonus reward email:", err));
    }

    return { reviewId, coinsEarned: isFirstReview ? REVIEW_BONUS_COINS : 0 };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const MAX_REVIEW_PHOTOS = 5;

export class ReviewPhotoError extends Error {}

/** Verifies the review belongs to this customer before touching Blob storage or the DB -- same ownership-check-before-mutation pattern as detachPaymentMethod. */
async function assertOwnsReview(reviewId: string, customerId: string): Promise<void> {
  const res = await pool.query(`SELECT 1 FROM customer_product_review WHERE id = $1 AND customer_id = $2`, [
    reviewId,
    customerId,
  ]);
  if (res.rows.length === 0) throw new ReviewPhotoError("Review not found.");
}

export async function addReviewPhoto(
  reviewId: string,
  customerId: string,
  buffer: Buffer,
  contentType: string
): Promise<{ id: string; url: string }> {
  await assertOwnsReview(reviewId, customerId);

  const countRes = await pool.query(`SELECT COUNT(*) AS n FROM customer_review_photo WHERE review_id = $1`, [reviewId]);
  if (Number(countRes.rows[0].n) >= MAX_REVIEW_PHOTOS) {
    throw new ReviewPhotoError(`A review can have up to ${MAX_REVIEW_PHOTOS} photos.`);
  }

  const blobUrl = await uploadToBlob(`review-photos/${reviewId}-${Date.now()}`, buffer, contentType);
  const maxPos = await pool.query(`SELECT COALESCE(MAX(position), -1) AS max FROM customer_review_photo WHERE review_id = $1`, [
    reviewId,
  ]);
  const insertRes = await pool.query(
    `INSERT INTO customer_review_photo (review_id, url, position) VALUES ($1, $2, $3) RETURNING id`,
    [reviewId, blobUrl, Number(maxPos.rows[0].max) + 1]
  );
  return { id: String(insertRes.rows[0].id), url: blobUrl };
}

export async function deleteReviewPhoto(photoId: string, customerId: string): Promise<void> {
  const res = await pool.query(
    `SELECT p.url FROM customer_review_photo p
     JOIN customer_product_review r ON r.id = p.review_id
     WHERE p.id = $1 AND r.customer_id = $2`,
    [photoId, customerId]
  );
  const row = res.rows[0];
  if (!row) throw new ReviewPhotoError("Photo not found.");

  await deleteFromBlob(row.url).catch(() => {});
  await pool.query(`DELETE FROM customer_review_photo WHERE id = $1`, [photoId]);
}

// Capped lower than photos (5) -- video storage/bandwidth cost is much higher per file.
const MAX_REVIEW_VIDEOS = 2;

export class ReviewVideoError extends Error {}

export async function addReviewVideo(
  reviewId: string,
  customerId: string,
  buffer: Buffer,
  contentType: string
): Promise<{ id: string; url: string }> {
  const owns = await pool.query(`SELECT 1 FROM customer_product_review WHERE id = $1 AND customer_id = $2`, [
    reviewId,
    customerId,
  ]);
  if (owns.rows.length === 0) throw new ReviewVideoError("Review not found.");

  const countRes = await pool.query(`SELECT COUNT(*) AS n FROM customer_review_video WHERE review_id = $1`, [reviewId]);
  if (Number(countRes.rows[0].n) >= MAX_REVIEW_VIDEOS) {
    throw new ReviewVideoError(`A review can have up to ${MAX_REVIEW_VIDEOS} videos.`);
  }

  const blobUrl = await uploadToBlob(`review-videos/${reviewId}-${Date.now()}.mp4`, buffer, contentType);
  const maxPos = await pool.query(`SELECT COALESCE(MAX(position), -1) AS max FROM customer_review_video WHERE review_id = $1`, [
    reviewId,
  ]);
  const insertRes = await pool.query(
    `INSERT INTO customer_review_video (review_id, url, position) VALUES ($1, $2, $3) RETURNING id`,
    [reviewId, blobUrl, Number(maxPos.rows[0].max) + 1]
  );
  return { id: String(insertRes.rows[0].id), url: blobUrl };
}

export async function deleteReviewVideo(videoId: string, customerId: string): Promise<void> {
  const res = await pool.query(
    `SELECT v.url FROM customer_review_video v
     JOIN customer_product_review r ON r.id = v.review_id
     WHERE v.id = $1 AND r.customer_id = $2`,
    [videoId, customerId]
  );
  const row = res.rows[0];
  if (!row) throw new ReviewVideoError("Video not found.");

  await deleteFromBlob(row.url).catch(() => {});
  await pool.query(`DELETE FROM customer_review_video WHERE id = $1`, [videoId]);
}
