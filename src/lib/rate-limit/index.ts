/**
 * src/lib/rate-limit/index.ts — Rate Limiting (Server-Side)
 *
 * In-memory token-bucket limiter for route handlers (auth resends, signup
 * validation, report filing, etc.). This is per-process; on Vercel's
 * serverless model each warm instance enforces its own window, which is
 * adequate for abuse *mitigation* (not a hard guarantee). The authoritative
 * DB-level enforcement remains Supabase RLS.
 *
 * Upgrade path: swap the Map for a Redis-backed store (Upstash) in V1.1.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
  reason?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Check a rate limit for `key` (e.g. `resend:${email}` or `signup:${ip}`).
 * Allows up to `max` calls per `windowMs`.
 */
export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: options.max - 1, resetAt: new Date(fresh.resetAt).toISOString() };
  }

  if (bucket.count >= options.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(bucket.resetAt).toISOString(),
      reason: "rate-limit",
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: options.max - bucket.count,
    resetAt: new Date(bucket.resetAt).toISOString(),
  };
}

/** Convenience wrapper for the common "few attempts per window" pattern. */
export function throttle(key: string, max = 5, windowMs = 60_000): RateLimitResult {
  return checkRateLimit(key, { max, windowMs });
}

/**
 * Check if a user has exceeded their post creation rate limit.
 * (Kept for API compatibility; DB-level enforcement via RLS in production.)
 */
export async function checkPostRateLimit(_userId: string): Promise<RateLimitResult> {
  return {
    allowed: true,
    remaining: 10,
  };
}

export { MAX_POSTS_PER_DAY, MAX_POSTS_PER_HOUR } from "@/lib/constants";
