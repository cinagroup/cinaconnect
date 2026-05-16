/**
 * Tests for EventEmitter — event emission, subscription, and cleanup.
 */

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../../src/events';

describe('EventEmitter', () => {
  it('should register and emit events', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('test', fn);
    emitter.emit('test', 'hello');
    expect(fn).toHaveBeenCalledWith('hello');
  });

  it('should support multiple handlers for the same event', () => {
    const emitter = new EventEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on('test', fn1);
    emitter.on('test', fn2);
    emitter.emit('test', 'a', 'b');
    expect(fn1).toHaveBeenCalledWith('a', 'b');
    expect(fn2).toHaveBeenCalledWith('a', 'b');
  });

  it('should remove handlers with off()', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('test', fn);
    emitter.off('test', fn);
    emitter.emit('test');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should call once() handler exactly one time', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.once('test', fn);
    emitter.emit('test', 1);
    emitter.emit('test', 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('should removeAllListeners for a specific event', () => {
    const emitter = new EventEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on('test', fn1);
    emitter.on('other', fn2);
    emitter.removeAllListeners('test');
    emitter.emit('test');
    emitter.emit('other');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
  });

  it('should removeAllListeners for all events', () => {
    const emitter = new EventEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on('test', fn1);
    emitter.on('other', fn2);
    emitter.removeAllListeners();
    emitter.emit('test');
    emitter.emit('other');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('should report listenerCount correctly', () => {
    const emitter = new EventEmitter();
    expect(emitter.listenerCount('test')).toBe(0);
    const fn = vi.fn();
    emitter.on('test', fn);
    expect(emitter.listenerCount('test')).toBe(1);
    emitter.on('test', fn);
    // Using same fn in Set means count stays 1 (Set deduplicates)
    expect(emitter.listenerCount('test')).toBe(1);
    const fn2 = vi.fn();
    emitter.on('test', fn2);
    expect(emitter.listenerCount('test')).toBe(2);
  });

  it('should not throw when emitting to handlers that throw', () => {
    const emitter = new EventEmitter();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = vi.fn();
    emitter.on('test', () => { throw new Error('boom'); });
    emitter.on('test', good);
    emitter.emit('test');
    expect(good).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should handle emitting with no registered handlers', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.emit('nonexistent')).not.toThrow();
  });

  it('should handle off for non-existent event', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    expect(() => emitter.off('nonexistent', fn)).not.toThrow();
  });
});
