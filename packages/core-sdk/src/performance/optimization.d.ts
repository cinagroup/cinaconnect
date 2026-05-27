/**
 * Performance Optimization Utilities for @cinacoin/core-sdk
 *
 * Provides request batching, result caching, and other performance
 * primitives used across the SDK to minimize latency and redundant work.
 */
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
/**
 * In-memory result cache with TTL and LRU eviction.
 */
export declare class ResultCache<K = string, T = unknown> {
    private _store;
    private _maxSize;
    private _defaultTtl;
    constructor(options?: CacheOptions);
    /**
     * Get a cached value. Returns undefined if not found or expired.
     */
    get(key: K): T | undefined;
    /**
     * Set a value in the cache with optional TTL override.
     */
    set(key: K, value: T, ttl?: number): void;
    /**
     * Check if a key exists and is not expired.
     */
    has(key: K): boolean;
    /**
     * Delete a specific entry.
     */
    delete(key: K): boolean;
    /**
     * Clear all entries.
     */
    clear(): void;
    /**
     * Get the current number of entries.
     */
    get size(): number;
    /**
     * Evict all expired entries.
     */
    prune(): void;
}
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
export declare class RequestBatcher<TReq, TRes> {
    private _queue;
    private _timer;
    private _handler;
    private _batchSize;
    private _batchWindow;
    private _processing;
    constructor(handler: BatchHandler<TReq, TRes>);
    /**
     * Enqueue a request and return a promise for its result.
     */
    enqueue(request: TReq): Promise<TRes>;
    /**
     * Flush the current batch immediately.
     */
    private _flush;
    /**
     * Force flush and return the number of remaining queued items.
     */
    flush(): Promise<void>;
    /**
     * Get the current queue length.
     */
    get queueLength(): number;
    /**
     * Destroy the batcher, rejecting all pending requests.
     */
    destroy(): void;
}
/**
 * Create a debounced function that delays invocation.
 */
export declare function debounce<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn, wait: number): (...args: TArgs) => void;
/**
 * Create a throttled function that limits invocation rate.
 */
export declare function throttle<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn, limit: number): (...args: TArgs) => void;
/**
 * Memoize a function with an optional key serializer.
 */
export declare function memoize<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn, keyFn?: (...args: TArgs) => string): (...args: TArgs) => TReturn;
//# sourceMappingURL=optimization.d.ts.map