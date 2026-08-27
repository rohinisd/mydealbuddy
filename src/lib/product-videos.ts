import "server-only";
import { pool } from "@/lib/db";
import { uploadToBlob, deleteFromBlob } from "@/lib/blob";

const CJ_API_BASE = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";

export interface ResolvedVideo {
  url: string;
  coverUrl: string | null;
  source: "cj" | "admin";
}

// Prefers an admin-uploaded video (a deliberate override) over a CJ-synced
// one; among CJ videos, the most-played is the most representative pick.
export async function getVideoForProduct(productId: string): Promise<ResolvedVideo | null> {
  const res = await pool.query(
    `SELECT source, blob_video_url, blob_cover_url FROM cj_product_video
     WHERE product_id = $1 AND blob_video_url IS NOT NULL
     ORDER BY (source = 'admin') DESC, play_count DESC NULLS LAST
     LIMIT 1`,
    [productId]
  );
  const row = res.rows[0];
  if (!row) return null;
  return { url: row.blob_video_url, coverUrl: row.blob_cover_url, source: row.source };
}

export interface AdminVideoStatus {
  hasVideo: boolean;
  source: "cj" | "admin" | null;
  videoUrl: string | null;
}

export async function listVideoStatusForAdmin(): Promise<Record<string, AdminVideoStatus>> {
  const res = await pool.query(
    `SELECT DISTINCT ON (product_id) product_id, source, blob_video_url
     FROM cj_product_video WHERE blob_video_url IS NOT NULL
     ORDER BY product_id, (source = 'admin') DESC`
  );
  const map: Record<string, AdminVideoStatus> = {};
  for (const row of res.rows) {
    map[String(row.product_id)] = { hasVideo: true, source: row.source, videoUrl: row.blob_video_url };
  }
  return map;
}

// CJ's raw video/cover URLs 403 without a browser-shaped request (their
// Cloudflare blocks bare server fetches) -- confirmed live that a normal
// User-Agent/Referer is enough, no special auth needed beyond that.
async function fetchCjAsset(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.cjdropshipping.com/",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch CJ asset (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

interface CjVideoRaw {
  videoId: string;
  videoNumber: string;
  videoUrl: string;
  coverURL: string;
  width: number;
  height: number;
  duration: number;
  videoSize: string;
  isFree: string;
  isBuy: boolean;
  copyrightPrice: string;
  notCopyrightPrice: string;
  videoType: number;
  playCount: number;
}

export interface CjVideoSyncResult {
  found: number;
  free: number;
  synced: number;
}

// Paid/licensed CJ videos are skipped entirely (not even their metadata is
// stored) -- only isFree videos get downloaded and re-hosted on our own Blob
// store, since CJ's docs require caching server-side rather than hotlinking,
// and a browser <video> tag can't send the headers CJ's raw URL needs anyway.
export async function syncCjVideosForProduct(productId: string, cjPid: string): Promise<CjVideoSyncResult> {
  const token = process.env.CJ_ACCESS_TOKEN;
  if (!token) throw new Error("CJ_ACCESS_TOKEN missing from environment");

  const res = await fetch(`${CJ_API_BASE}/product/queryVideosByProductId`, {
    method: "POST",
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ productId: cjPid }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`CJ video query failed: ${data.message}`);

  const videos: CjVideoRaw[] = data.data ?? [];
  const freeVideos = videos.filter((v) => v.isFree === "1");

  let synced = 0;
  for (const video of freeVideos) {
    const [videoBuf, coverBuf] = await Promise.all([
      fetchCjAsset(video.videoUrl),
      video.coverURL ? fetchCjAsset(video.coverURL) : Promise.resolve(null),
    ]);
    const blobVideoUrl = await uploadToBlob(`cj-videos/${productId}/${video.videoId}.mp4`, videoBuf, "video/mp4");
    const blobCoverUrl = coverBuf
      ? await uploadToBlob(`cj-videos/${productId}/${video.videoId}-cover.jpg`, coverBuf, "image/jpeg")
      : null;

    await pool.query(
      `INSERT INTO cj_product_video
         (product_id, cj_video_id, video_number, url, cover_url, width, height, duration_s, size_bytes,
          is_free, is_buy, copyright_price, not_copyright_price, video_type, play_count, source, blob_video_url, blob_cover_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'cj',$16,$17)
       ON CONFLICT (product_id, cj_video_id) DO UPDATE SET
         blob_video_url = EXCLUDED.blob_video_url, blob_cover_url = EXCLUDED.blob_cover_url, play_count = EXCLUDED.play_count`,
      [
        productId,
        video.videoId,
        video.videoNumber,
        video.videoUrl,
        video.coverURL,
        video.width,
        video.height,
        video.duration,
        Number(video.videoSize) || null,
        true,
        video.isBuy,
        Number(video.copyrightPrice) || 0,
        Number(video.notCopyrightPrice) || 0,
        video.videoType,
        video.playCount,
        blobVideoUrl,
        blobCoverUrl,
      ]
    );
    synced++;
  }

  return { found: videos.length, free: freeVideos.length, synced };
}

export async function uploadAdminVideo(productId: string, buffer: Buffer, contentType: string): Promise<void> {
  await removeAdminVideo(productId); // one admin video per product -- replace, don't accumulate
  const blobUrl = await uploadToBlob(`admin-videos/${productId}.mp4`, buffer, contentType);
  await pool.query(`INSERT INTO cj_product_video (product_id, source, blob_video_url, is_free) VALUES ($1, 'admin', $2, true)`, [
    productId,
    blobUrl,
  ]);
}

export async function removeAdminVideo(productId: string): Promise<void> {
  const existing = await pool.query(`SELECT blob_video_url FROM cj_product_video WHERE product_id = $1 AND source = 'admin'`, [
    productId,
  ]);
  for (const row of existing.rows) {
    if (row.blob_video_url) await deleteFromBlob(row.blob_video_url).catch(() => {});
  }
  await pool.query(`DELETE FROM cj_product_video WHERE product_id = $1 AND source = 'admin'`, [productId]);
}

export interface ProductVideoRow {
  id: string;
  source: "cj" | "admin";
  videoUrl: string;
  coverUrl: string | null;
  playCount: number | null;
}

export async function listVideosForProduct(productId: string): Promise<ProductVideoRow[]> {
  const res = await pool.query(
    `SELECT id, source, blob_video_url, blob_cover_url, play_count FROM cj_product_video
     WHERE product_id = $1 AND blob_video_url IS NOT NULL
     ORDER BY (source = 'admin') DESC, play_count DESC NULLS LAST`,
    [productId]
  );
  return res.rows.map((r) => ({
    id: String(r.id),
    source: r.source,
    videoUrl: r.blob_video_url,
    coverUrl: r.blob_cover_url,
    playCount: r.play_count,
  }));
}

// Deletes any single video row by id, CJ-sourced or admin -- unlike
// removeAdminVideo (which only ever clears the admin row as part of the
// "replace on upload" flow), this lets the admin curate away a specific CJ
// video too.
export async function deleteVideoById(productId: string, videoId: string): Promise<void> {
  const res = await pool.query(
    `SELECT blob_video_url, blob_cover_url FROM cj_product_video WHERE id = $1 AND product_id = $2`,
    [videoId, productId]
  );
  const row = res.rows[0];
  if (!row) return;
  if (row.blob_video_url) await deleteFromBlob(row.blob_video_url).catch(() => {});
  if (row.blob_cover_url) await deleteFromBlob(row.blob_cover_url).catch(() => {});
  await pool.query(`DELETE FROM cj_product_video WHERE id = $1`, [videoId]);
}
