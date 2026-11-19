import "server-only";
import { Pool } from "pg";

// Reuse one pool across hot reloads in dev instead of opening a new one per request.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Small per-instance cap -- many Vercel serverless function instances can
    // run concurrently, each with its own Pool, so a generous per-instance
    // max (pg's default is 10) can collectively blow past Neon's pooled
    // endpoint connection limit under bursty traffic, surfacing as 503s.
    max: 5,
    connectionTimeoutMillis: 10_000,
  });

// A connection-level error (e.g. Neon terminating an idle pooled connection)
// emits on the pool even when no query is in flight. Unhandled, that's an
// uncaught exception that can crash the whole serverless invocation.
pool.on("error", (err) => {
  console.error("Unexpected error on idle pg client:", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}
