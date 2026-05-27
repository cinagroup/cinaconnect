/**
 * Performance Optimization Utilities for @cinacoin/core-sdk
 *
 * Provides request batching, result caching, and other performance
 * primitives used across the SDK to minimize latency and redundant work.
 */

/** Generic cache entry with expiration. */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Options for result caching. */
export interface CacheOptions {
  /** Time-to-live in milliseconds. Default: 5000ms. */
  ttl?: number;
  /** Maximum number of entries in the cache. Default: 100. */
  maxSize?: number;
}

/** Batched request handler. */
export interface BatchHandler<TReq, TRes> {
  /** Process a batch of requests. */
  execute: (requests: TReq[]) => Promise<TRes[]>;
  /** Maximum batch size before flushing. Default: 10. */
  batchSize?: number;
  /** Maximum wait time before flushing. Default: 50ms. */
  batchWindow?: number;
}

// ─── Result Caching ────────────────────────────────────────────────

/**
 * In-memory result cache with TTL and LRU eviction.
 */
export class ResultCache<K = string, T = unknown> {
  private _store = new Map<K, CacheEntry<T>>();
  private _maxSize: number;
  private _defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this._defaultTtl = options.ttl ?? 5000;
    this._maxSize = options.maxSize ?? 100;
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   */
  get(key: K): T | undefined {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Set a value in the cache with optional TTL override.
   */
  set(key: K, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this._store.size >= this._maxSize && !this._store.has(key)) {
      const firstKey = this._store.keys().next().value;
      if (firstKey !== undefined) {
        this._store.delete(firstKey);
      }
    }
    this._store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this._defaultTtl),
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific entry.
   */
  delete(key: K): boolean {
    return this._store.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this._store.clear();
  }

  /**
   * Get the current number of entries.
   */
  get size(): number {
    return this._store.size;
  }

  /**
   * Evict all expired entries.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) {
        this._store.delete(key);
      }
    }
  }
}

// ─── Request Batching ──────────────────────────────────────────────

/**
 * Batches individual requests into bulk operations.
 *
 * Usage:
 *   const batcher = createBatcher<ChainId, Balance>({
 *     execute: async (chainIds) => fetchBalances(chainIds),
 *     batchSize: 20,
 *     batchWindow: 50,
 *   });
 *
 *   const balance = await batcher.enqueue(1);
 *   const balance2 = await batcher.enqueue(137);
 */
export class RequestBatcher<TReq, TRes> {
  private _queue: Array<{
    request: TReq;
    resolve: (result: TRes) => void;
    reject: (error: Error) => void;
  }> = [];
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _handler: BatchHandler<TReq, TRes>;
  private _batchSize: number;
  private _batchWindow: number;
  private _processing = false;

  constructor(handler: BatchHandler<TReq, TRes>) {
    this._handler = handler;
    this._batchSize = handler.batchSize ?? 10;
    this._batchWindow = handler.batchWindow ?? 50;
  }

  /**
   * Enqueue a request and return a promise for its result.
   */
  enqueue(request: TReq): Promise<TRes> {
    return new Promise((resolve, reject) => {
      this._queue.push({ request, resolve, reject });

      // Flush immediately if batch is full
      if (this._queue.length >= this._batchSize) {
        this._flush();
        return;
      }

      // Schedule flush after batch window
      if (!this._timer) {
        this._timer = setTimeout(() => this._flush(), this._batchWindow);
      }
    });
  }

  /**
   * Flush the current batch immediately.
   */
  private async _flush(): Promise<void> {
    if (this._processing || this._queue.length === 0) return;

    this._processing = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    const batch = this._queue.splice(0, this._batchSize);
    const requests = batch.map((item) => item.request);

    try {
      const results = await this._handler.execute(requests);
      batch.forEach((item, i) => item.resolve(results[i]));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      batch.forEach((item) => item.reject(err));
    } finally {
      this._processing = false;
      // Process remaining items
      if (this._queue.length > 0) {
        this._flush();
      }
    }
  }

  /**
   * Force flush and return the number of remaining queued items.
   */
  flush(): Promise<void> {
    return this._flush();
  }

  /**
   * Get the current queue length.
   */
  get queueLength(): number {
    return this._queue.length;
  }

  /**
   * Destroy the batcher, rejecting all pending requests.
   */
  destroy(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    for (const item of this._queue) {
      item.reject(new Error('Batcher destroyed'));
    }
    this._queue = [];
  }
}

// ─── Debounce ──────────────────────────────────────────────────────

/**
 * Create a debounced function that delays invocation.
 */
export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  wait: number
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, wait);
  };
}

// ─── Throttle ──────────────────────────────────────────────────────

/**
 * Create a throttled function that limits invocation rate.
 */
export function throttle<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  limit: number
): (...args: TArgs) => void {
  let inThrottle = false;

  return (...args: TArgs) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ─── Memoize ───────────────────────────────────────────────────────

/**
 * Memoize a function with an optional key serializer.
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();

  return (...args: TArgs) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
