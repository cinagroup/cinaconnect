/**
 * Performance Optimization Utilities for @cinacoin/core-sdk
 *
 * Provides request batching, result caching, and other performance
 * primitives used across the SDK to minimize latency and redundant work.
 */
// ─── Result Caching ────────────────────────────────────────────────
/**
 * In-memory result cache with TTL and LRU eviction.
 */
export class ResultCache {
    constructor(options = {}) {
        this._store = new Map();
        this._defaultTtl = options.ttl ?? 5000;
        this._maxSize = options.maxSize ?? 100;
    }
    /**
     * Get a cached value. Returns undefined if not found or expired.
     */
    get(key) {
        const entry = this._store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this._store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Set a value in the cache with optional TTL override.
     */
    set(key, value, ttl) {
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
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * Delete a specific entry.
     */
    delete(key) {
        return this._store.delete(key);
    }
    /**
     * Clear all entries.
     */
    clear() {
        this._store.clear();
    }
    /**
     * Get the current number of entries.
     */
    get size() {
        return this._store.size;
    }
    /**
     * Evict all expired entries.
     */
    prune() {
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
export class RequestBatcher {
    constructor(handler) {
        this._queue = [];
        this._timer = null;
        this._processing = false;
        this._handler = handler;
        this._batchSize = handler.batchSize ?? 10;
        this._batchWindow = handler.batchWindow ?? 50;
    }
    /**
     * Enqueue a request and return a promise for its result.
     */
    enqueue(request) {
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
    async _flush() {
        if (this._processing || this._queue.length === 0)
            return;
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
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            batch.forEach((item) => item.reject(err));
        }
        finally {
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
    flush() {
        return this._flush();
    }
    /**
     * Get the current queue length.
     */
    get queueLength() {
        return this._queue.length;
    }
    /**
     * Destroy the batcher, rejecting all pending requests.
     */
    destroy() {
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
export function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
        if (timer)
            clearTimeout(timer);
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
export function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
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
export function memoize(fn, keyFn) {
    const cache = new Map();
    return (...args) => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}
//# sourceMappingURL=optimization.js.map