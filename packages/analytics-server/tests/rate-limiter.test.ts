import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter } from "../src/rate-limiter.js";

// Mock KVNamespace
function createMockKV(): KVNamespace {
  const store = new Map<string, { value: string; expiration?: number }>();

  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiration && Date.now() > entry.expiration * 1000) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
      const expiration = opts?.expirationTtl
        ? Math.floor(Date.now() / 1000) + opts.expirationTtl
        : undefined;
      store.set(key, { value, expiration });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(): Promise<KVNamespaceListResult<string, string>> {
      return { keys: [], list_complete: true };
    },
  } as unknown as KVNamespace;
}

describe("RateLimiter", () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createMockKV();
  });

  it("allows first request", async () => {
    const limiter = new RateLimiter(kv, 10, 60);
    const limited = await limiter.isLimited("app_test");
    expect(limited).toBe(false);
  });

  it("allows requests under limit", async () => {
    const limiter = new RateLimiter(kv, 5, 60);
    for (let i = 0; i < 5; i++) {
      const limited = await limiter.isLimited("app_test");
      expect(limited).toBe(false);
    }
  });

  it("blocks when limit exceeded", async () => {
    const limiter = new RateLimiter(kv, 3, 60);
    await limiter.isLimited("app_test"); // 1
    await limiter.isLimited("app_test"); // 2
    await limiter.isLimited("app_test"); // 3
    const limited = await limiter.isLimited("app_test"); // 4 → exceeds
    expect(limited).toBe(true);
  });

  it("tracks different keys independently", async () => {
    const limiter = new RateLimiter(kv, 2, 60);
    await limiter.isLimited("app_a");
    await limiter.isLimited("app_a");
    const limitedA = await limiter.isLimited("app_a"); // 3rd for app_a
    const limitedB = await limiter.isLimited("app_b"); // 1st for app_b

    expect(limitedA).toBe(true);
    expect(limitedB).toBe(false);
  });

  it("returns correct remaining count", async () => {
    const limiter = new RateLimiter(kv, 10, 60);
    expect(await limiter.remaining("app_new")).toBe(10);
    await limiter.isLimited("app_new");
    expect(await limiter.remaining("app_new")).toBe(9);
  });

  it("returns max on missing key", async () => {
    const limiter = new RateLimiter(kv, 100, 60);
    expect(await limiter.remaining("app_unknown")).toBe(100);
  });

  it("fails open on KV error", async () => {
    const badKV = {
      get: vi.fn().mockRejectedValue(new Error("KV unavailable")),
      put: vi.fn().mockRejectedValue(new Error("KV unavailable")),
    } as unknown as KVNamespace;
    const limiter = new RateLimiter(badKV, 1, 60);
    const limited = await limiter.isLimited("app_test");
    expect(limited).toBe(false); // fail open
  });
});
