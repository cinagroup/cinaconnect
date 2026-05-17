import type { TokenInfo, TokenListCache } from './types.js';

/**
 * In-memory token metadata cache with TTL support.
 */
export class LRUTokenCache implements TokenListCache {
  private store = new Map<string, { tokens: TokenInfo[]; timestamp: number }>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(key: string): TokenInfo[] | undefined {
    const entry = this.store.get(key);
    return entry?.tokens;
  }

  set(key: string, tokens: TokenInfo[]): void {
    if (this.store.size >= this.maxSize) {
      // Evict the oldest entry
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { tokens, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  getTimestamp(key: string): number | undefined {
    return this.store.get(key)?.timestamp;
  }

  /**
   * Check if a cached entry is stale.
   */
  isStale(key: string, maxAgeMs: number): boolean {
    const timestamp = this.getTimestamp(key);
    if (timestamp === undefined) return true;
    return Date.now() - timestamp > maxAgeMs;
  }
}

export const defaultCache = new LRUTokenCache();
