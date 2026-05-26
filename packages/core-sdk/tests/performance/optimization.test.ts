/**
 * Performance Optimization utilities tests.
 *
 * Tests cover ResultCache, RequestBatcher, debounce, throttle, and memoize.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ResultCache,
  RequestBatcher,
  debounce,
  throttle,
  memoize,
} from '../../src/performance/optimization.js';

/* ------------------------------------------------------------------ */
/*  ResultCache                                                         */
/* ------------------------------------------------------------------ */

describe('ResultCache', () => {
  it('get returns undefined for missing key', () => {
    const cache = new ResultCache();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('set and get work correctly', () => {
    const cache = new ResultCache();
    cache.set('key1', { value: 42 });
    expect(cache.get('key1')).toEqual({ value: 42 });
  });

  it('has returns true for existing key', () => {
    const cache = new ResultCache();
    cache.set('k', 'v');
    expect(cache.has('k')).toBe(true);
  });

  it('has returns false for missing key', () => {
    const cache = new ResultCache();
    expect(cache.has('k')).toBe(false);
  });

  it('delete removes an entry', () => {
    const cache = new ResultCache();
    cache.set('k', 'v');
    expect(cache.delete('k')).toBe(true);
    expect(cache.get('k')).toBeUndefined();
  });

  it('delete returns false for missing key', () => {
    const cache = new ResultCache();
    expect(cache.delete('nope')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new ResultCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('size returns correct count', () => {
    const cache = new ResultCache();
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
  });

  it('custom ttl overrides default', () => {
    vi.useFakeTimers();
    const cache = new ResultCache({ ttl: 10000 });
    cache.set('short', 'val', 100);
    expect(cache.get('short')).toBe('val');
    vi.advanceTimersByTime(101);
    expect(cache.get('short')).toBeUndefined();
    vi.useRealTimers();
  });

  it('expires entries after ttl', () => {
    vi.useFakeTimers();
    const cache = new ResultCache({ ttl: 100 });
    cache.set('exp', 'data');
    expect(cache.has('exp')).toBe(true);
    vi.advanceTimersByTime(101);
    expect(cache.has('exp')).toBe(false);
    expect(cache.get('exp')).toBeUndefined();
    vi.useRealTimers();
  });

  it('evicts oldest entry when at maxSize', () => {
    const cache = new ResultCache({ maxSize: 2 });
    cache.set('first', 1);
    cache.set('second', 2);
    cache.set('third', 3);
    expect(cache.size).toBe(2);
    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('second')).toBeDefined();
    expect(cache.get('third')).toBeDefined();
  });

  it('evicts oldest entries via prune', () => {
    vi.useFakeTimers();
    const cache = new ResultCache({ ttl: 100 });
    cache.set('a', 1);
    vi.advanceTimersByTime(50);
    cache.set('b', 2);
    vi.advanceTimersByTime(51); // 'a' expired, 'b' still valid
    cache.prune();
    expect(cache.size).toBe(1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    vi.useRealTimers();
  });

  it('has returns false for expired entry', () => {
    vi.useFakeTimers();
    const cache = new ResultCache({ ttl: 50 });
    cache.set('exp', 'x');
    vi.advanceTimersByTime(51);
    expect(cache.has('exp')).toBe(false);
    vi.useRealTimers();
  });

  it('overwrites existing key without evicting', () => {
    const cache = new ResultCache({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 3); // update existing
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/*  RequestBatcher                                                      */
/* ------------------------------------------------------------------ */

describe('RequestBatcher', () => {
  it('batches multiple requests', async () => {
    vi.useFakeTimers();
    const handler = {
      execute: vi.fn(async (reqs: number[]) => reqs.map((r) => r * 2)),
      batchSize: 5,
      batchWindow: 10,
    };
    const batcher = new RequestBatcher(handler);

    const p1 = batcher.enqueue(1);
    const p2 = batcher.enqueue(2);
    const p3 = batcher.enqueue(3);

    // Wait for batch window
    vi.advanceTimersByTime(20);
    await Promise.all([p1, p2, p3]);

    expect(handler.execute).toHaveBeenCalledWith([1, 2, 3]);
    vi.useRealTimers();
  });

  it('flushes immediately when batch is full', async () => {
    const handler = {
      execute: vi.fn(async (reqs: number[]) => reqs.map((r) => r * 10)),
      batchSize: 2,
      batchWindow: 1000,
    };
    const batcher = new RequestBatcher(handler);

    const p1 = batcher.enqueue(1);
    const p2 = batcher.enqueue(2);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(10);
    expect(r2).toBe(20);
    expect(handler.execute).toHaveBeenCalledWith([1, 2]);
  });

  it('queueLength returns current queue size', async () => {
    vi.useFakeTimers();
    const handler = {
      execute: vi.fn(async (reqs: number[]) => reqs.map((r) => r)),
      batchSize: 10,
      batchWindow: 5000,
    };
    const batcher = new RequestBatcher(handler);

    batcher.enqueue(1);
    batcher.enqueue(2);
    expect(batcher.queueLength).toBe(2);
    vi.useRealTimers();
  });

  it('destroy rejects all pending requests', async () => {
    const handler = {
      execute: vi.fn(async () => []),
      batchSize: 10,
      batchWindow: 5000,
    };
    const batcher = new RequestBatcher(handler);

    const p1 = batcher.enqueue(1);
    const p2 = batcher.enqueue(2);
    batcher.destroy();

    await expect(p1).rejects.toThrow('Batcher destroyed');
    await expect(p2).rejects.toThrow('Batcher destroyed');
  });

  it('propagates errors from handler', async () => {
    const handler = {
      execute: vi.fn(async () => {
        throw new Error('handler error');
      }),
      batchSize: 2,
      batchWindow: 50,
    };
    const batcher = new RequestBatcher(handler);

    const p1 = batcher.enqueue(1);
    const p2 = batcher.enqueue(2);

    await expect(p1).rejects.toThrow('handler error');
    await expect(p2).rejects.toThrow('handler error');
  });

  it('flushes remaining items after first batch', async () => {
    vi.useFakeTimers();
    const handler = {
      execute: vi.fn(async (reqs: number[]) => reqs.map((r) => r * 3)),
      batchSize: 2,
      batchWindow: 10,
    };
    const batcher = new RequestBatcher(handler);

    const p1 = batcher.enqueue(1);
    const p2 = batcher.enqueue(2);
    const p3 = batcher.enqueue(3);

    vi.advanceTimersByTime(20);
    await Promise.all([p1, p2, p3]);

    expect(handler.execute).toHaveBeenCalledTimes(2);
    expect(handler.execute).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(handler.execute).toHaveBeenNthCalledWith(2, [3]);
    vi.useRealTimers();
  });

  it('processes more than batchSize with multiple flushes', async () => {
    const handler = {
      execute: vi.fn(async (reqs: number[]) => reqs),
      batchSize: 2,
      batchWindow: 5000,
    };
    const batcher = new RequestBatcher(handler);

    const results = await Promise.all([
      batcher.enqueue(10),
      batcher.enqueue(20),
      batcher.enqueue(30),
      batcher.enqueue(40),
    ]);

    expect(results).toEqual([10, 20, 30, 40]);
  });

  it('flush method works', async () => {
    const handler = {
      execute: vi.fn(async (reqs: string[]) => reqs.map((r) => r.toUpperCase())),
      batchSize: 10,
      batchWindow: 5000,
    };
    const batcher = new RequestBatcher(handler);

    const p1 = batcher.enqueue('hello');
    await batcher.flush();
    await p1;

    expect(handler.execute).toHaveBeenCalledWith(['hello']);
  });

  it('flush does nothing when queue is empty', async () => {
    const handler = {
      execute: vi.fn(async () => []),
    };
    const batcher = new RequestBatcher(handler);
    await batcher.flush();
    expect(handler.execute).not.toHaveBeenCalled();
  });

  it('non-Error thrown in handler is wrapped', async () => {
    const handler = {
      execute: vi.fn(async () => {
        throw 'string error';
      }),
      batchSize: 1,
      batchWindow: 10,
    };
    const batcher = new RequestBatcher(handler);
    const p = batcher.enqueue('x');
    await expect(p).rejects.toThrow('string error');
  });
});

/* ------------------------------------------------------------------ */
/*  debounce                                                            */
/* ------------------------------------------------------------------ */

describe('debounce', () => {
  it('delays execution until wait period', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('resets timer on subsequent calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // resets timer
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled(); // only 50ms since last call
    vi.advanceTimersByTime(51);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('passes arguments to the debounced function', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('a', 'b');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('a', 'b');
    vi.useRealTimers();
  });
});

/* ------------------------------------------------------------------ */
/*  throttle                                                            */
/* ------------------------------------------------------------------ */

describe('throttle', () => {
  it('limits execution rate', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(101);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('passes arguments', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 50);

    throttled('x', 1);
    expect(fn).toHaveBeenCalledWith('x', 1);
    vi.useRealTimers();
  });
});

/* ------------------------------------------------------------------ */
/*  memoize                                                             */
/* ------------------------------------------------------------------ */

describe('memoize', () => {
  it('caches results for same arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memo = memoize(fn);

    expect(memo(1, 2)).toBe(3);
    expect(memo(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls function for different arguments', () => {
    const fn = vi.fn((n: number) => n * n);
    const memo = memoize(fn);

    memo(2);
    memo(3);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses custom key function', () => {
    const fn = vi.fn((obj: { id: number }) => obj.id * 10);
    const memo = memoize(fn, (obj) => String(obj.id));

    expect(memo({ id: 1 })).toBe(10);
    expect(memo({ id: 1 })).toBe(10); // different object, same key
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('works with complex arguments via default JSON key', () => {
    const fn = vi.fn((arr: number[]) => arr.reduce((a, b) => a + b, 0));
    const memo = memoize(fn);

    expect(memo([1, 2, 3])).toBe(6);
    expect(memo([1, 2, 3])).toBe(6);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
