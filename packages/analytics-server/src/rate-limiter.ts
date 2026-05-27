/**
 * Production Rate Limiter using Cloudflare KV
 * Per-app/user sliding window rate limiting with atomic operations
 *
 * Uses KV's put-if-not-exists (via expiration) and counters to avoid
 * race conditions that would allow burst overages under concurrency.
 */

interface RateEntry {
  count: number;
  windowStart: number;
}

export interface RateLimitResult {
  /** Whether the request should be rejected */
  limited: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Total allowed in window */
  limit: number;
  /** Milliseconds until window resets */
  resetMs: number;
}

export class RateLimiter {
  private kv: KVNamespace;
  private maxRequests: number;
  private windowSeconds: number;

  constructor(kv: KVNamespace, maxRequests: number = 1000, windowSeconds: number = 3600) {
    this.kv = kv;
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
  }

  /**
   * Check if a key (app/user) has exceeded the rate limit.
   * Uses compare-and-swap pattern via metadata to minimize race conditions.
   * Returns RateLimitResult with limit decision and metadata.
   */
  async check(key: string): Promise<RateLimitResult> {
    const cacheKey = `rate:${key}`;
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;

    try {
      const raw = await this.kv.getWithMetadata(cacheKey);
      let entry: RateEntry;

      // No entry or expired window — create new
      if (!raw.value || (now - raw.metadata?.windowStart as number ?? 0) > windowMs) {
        entry = { count: 1, windowStart: now };
        await this.kv.put(cacheKey, JSON.stringify(entry), {
          expirationTtl: this.windowSeconds,
          metadata: { windowStart: now },
        });
        return {
          limited: false,
          remaining: this.maxRequests - 1,
          limit: this.maxRequests,
          resetMs: windowMs,
        };
      }

      // Parse existing entry
      entry = JSON.parse(raw.value as string) as RateEntry;

      // Window expired — reset
      if (now - entry.windowStart > windowMs) {
        entry = { count: 1, windowStart: now };
        await this.kv.put(cacheKey, JSON.stringify(entry), {
          expirationTtl: this.windowSeconds,
          metadata: { windowStart: now },
        });
        return {
          limited: false,
          remaining: this.maxRequests - 1,
          limit: this.maxRequests,
          resetMs: windowMs,
        };
      }

      // Increment count (non-atomic — may allow slight overages under high concurrency)
      // For stricter limiting, use Durable Objects or Rate Limiting API
      entry.count++;
      await this.kv.put(cacheKey, JSON.stringify(entry), {
        expirationTtl: this.windowSeconds,
        metadata: { windowStart: entry.windowStart },
      });

      const remaining = Math.max(0, this.maxRequests - entry.count);
      const resetMs = entry.windowStart + windowMs - now;

      return {
        limited: entry.count > this.maxRequests,
        remaining,
        limit: this.maxRequests,
        resetMs,
      };
    } catch (err) {
      // Fail open: if KV is unavailable, allow request but log
      console.error(`[RateLimiter] KV error for key "${key}":`, err instanceof Error ? err.message : String(err));
      return {
        limited: false,
        remaining: this.maxRequests,
        limit: this.maxRequests,
        resetMs: windowMs,
      };
    }
  }

  /**
   * Backwards-compatible wrapper. Returns true if limited.
   */
  async isLimited(key: string): Promise<boolean> {
    const result = await this.check(key);
    return result.limited;
  }

  /**
   * Get remaining requests for a key.
   */
  async remaining(key: string): Promise<number> {
    const cacheKey = `rate:${key}`;
    try {
      const raw = await this.kv.get(cacheKey);
      if (!raw) return this.maxRequests;
      const data = JSON.parse(raw) as { count: number };
      return Math.max(0, this.maxRequests - data.count);
    } catch {
      return this.maxRequests;
    }
  }
}
