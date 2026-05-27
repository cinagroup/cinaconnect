/**
 * Event system — typed EventEmitter for SDK events.
 */

import type { EventHandler } from './types.js';

/**
 * Lightweight event emitter.
 *
 * Supports on/off/once/emit with typed event names.
 */
export class EventEmitter {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Register an event handler.
   */
  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Register a one-time event handler.
   */
  once(event: string, handler: EventHandler): void {
    const onceHandler = (...args: unknown[]) => {
      this.off(event, onceHandler);
      handler(...args);
    };
    this.on(event, onceHandler);
  }

  /**
   * Remove an event handler.
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with arbitrary arguments.
   */
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[Cinacoin] Event handler error for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners for an event (or all events if none specified).
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
