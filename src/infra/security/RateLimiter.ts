/**
 * In-memory sliding-window rate limiter for auth endpoints. Bounded per-key
 * (typically IP) attempts within a window. Resets automatically as entries
 * expire. Not suitable for multi-instance deployments — replace with Redis or
 * a Vercel KV-backed limiter when scaling beyond a single Node process.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  // Drop expired hits
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

// Exposed for tests; not for production callers.
export function __resetRateLimiter() {
  buckets.clear();
}
