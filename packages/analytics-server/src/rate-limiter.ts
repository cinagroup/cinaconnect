/**
 * Rate limiter using Cloudflare KV
 * Per-app/user sliding window rate limiting
 */

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
   * Returns true if limited, false if allowed.
   */
  async isLimited(key: string): Promise<boolean> {
    const cacheKey = `rate:${key}`;
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;

    try {
      const raw = await this.kv.get(cacheKey);
      if (!raw) {
        await this.kv.put(cacheKey, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: this.windowSeconds });
        return false;
      }

      const data = JSON.parse(raw) as { count: number; windowStart: number };

      // Window expired, reset
      if (now - data.windowStart > windowMs) {
        await this.kv.put(cacheKey, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: this.windowSeconds });
        return false;
      }

      data.count++;
      await this.kv.put(cacheKey, JSON.stringify(data), { expirationTtl: this.windowSeconds });

      return data.count > this.maxRequests;
    } catch {
      // If KV fails, allow the request (fail open)
      return false;
    }
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
