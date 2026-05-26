/**
 * core-sdk/tests/events.test.ts
 *
 * Tests for the EventEmitter class: on, off, emit, once, removeAllListeners, listenerCount.
 */

import { describe, it, expect } from 'vitest';
import { EventEmitter } from '../src/events.js';

describe('EventEmitter', () => {
  it('on + emit', () => {
    const ee = new EventEmitter();
    let result: unknown;
    ee.on('test', (val) => { result = val; });
    ee.emit('test', 'hello');
    expect(result).toBe('hello');
  });

  it('multiple listeners', () => {
    const ee = new EventEmitter();
    const order: number[] = [];
    ee.on('data', () => order.push(1));
    ee.on('data', () => order.push(2));
    ee.on('data', () => order.push(3));
    ee.emit('data');
    expect(order.length).toBe(3);
    expect(order).toEqual([1, 2, 3]);
  });

  it('off', () => {
    const ee = new EventEmitter();
    let count = 0;
    const handler = () => { count++; };
    ee.on('inc', handler);
    ee.emit('inc');
    expect(count).toBe(1);
    ee.off('inc', handler);
    ee.emit('inc');
    expect(count).toBe(1);
  });

  it('once', () => {
    const ee = new EventEmitter();
    let count = 0;
    ee.once('once_event', () => { count++; });
    ee.emit('once_event');
    expect(count).toBe(1);
    ee.emit('once_event');
    expect(count).toBe(1);
  });

  it('emit multiple args', () => {
    const ee = new EventEmitter();
    let a: unknown, b: unknown, c: unknown;
    ee.on('multi', (x, y, z) => { a = x; b = y; c = z; });
    ee.emit('multi', 1, 'two', { three: true });
    expect(a).toBe(1);
    expect(b).toBe('two');
    expect((c as any).three).toBe(true);
  });

  it('listenerCount', () => {
    const ee = new EventEmitter();
    expect(ee.listenerCount('x')).toBe(0);
    const h1 = () => {};
    ee.on('x', h1);
    expect(ee.listenerCount('x')).toBe(1);
    const h2 = () => {};
    ee.on('x', h2);
    expect(ee.listenerCount('x')).toBe(2);
    ee.off('x', h1);
    expect(ee.listenerCount('x')).toBe(1);
  });

  it('removeAllListeners', () => {
    const ee = new EventEmitter();
    ee.on('a', () => {});
    ee.on('a', () => {});
    ee.on('b', () => {});
    expect(ee.listenerCount('a')).toBe(2);
    expect(ee.listenerCount('b')).toBe(1);

    ee.removeAllListeners('a');
    expect(ee.listenerCount('a')).toBe(0);
    expect(ee.listenerCount('b')).toBe(1);

    ee.removeAllListeners();
    expect(ee.listenerCount('b')).toBe(0);
  });

  it('emit with no listeners', () => {
    const ee = new EventEmitter();
    // Should not throw
    ee.emit('nothing', 'ignored');
  });

  it('handler error isolation', () => {
    const ee = new EventEmitter();
    let secondFired = false;
    ee.on('err', () => { throw new Error('boom'); });
    ee.on('err', () => { secondFired = true; });
    ee.emit('err');
    expect(secondFired).toBe(true);
  });

  it('off cleans up empty listener set', () => {
    const ee = new EventEmitter();
    const h = () => {};
    ee.on('x', h);
    ee.off('x', h);
    expect(ee.listenerCount('x')).toBe(0);
  });
});
