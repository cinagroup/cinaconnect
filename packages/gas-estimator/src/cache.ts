import type { GasCache, GasPriceData, GasEstimatorConfig } from './types.js';

/**
 * Simple gas price cache with TTL.
 */
export class GasPriceCache implements GasCache {
  private store = new Map<string, GasPriceData>();
  private ttl: number;

  constructor(config?: GasEstimatorConfig) {
    this.ttl = config?.cacheTtlMs ?? 30_000;
  }

  get(key: string): GasPriceData | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, data: GasPriceData): void {
    this.store.set(key, { ...data, timestamp: Date.now() });
  }

  has(key: string): boolean {
    const entry = this.get(key);
    return entry !== undefined;
  }

  clear(): void {
    this.store.clear();
  }

  /**
   * Prune expired entries.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.timestamp > this.ttl) {
        this.store.delete(key);
      }
    }
  }
}
