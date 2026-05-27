/**
 * Local Storage Analytics Provider
 *
 * Stores analytics events in browser localStorage (or memory fallback).
 */

import type { AnalyticsEvent, AnalyticsProvider } from "./types.js";

const STORAGE_KEY = "cinacoin-analytics-events";
const MAX_EVENTS = 1000;

export class LocalStorageProvider implements AnalyticsProvider {
  private events: AnalyticsEvent[] = [];

  constructor() {
    // Try to load from localStorage if available
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.events = JSON.parse(raw);
      }
    } catch {
      // localStorage not available (SSR), use in-memory
    }
  }

  async track(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
    // Keep only the most recent events
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
    this.persist();
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return [...this.events];
  }

  async clear(): Promise<void> {
    this.events = [];
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // localStorage not available
    }
  }
}

/**
 * In-memory fallback provider for SSR testing.
 */
export class InMemoryProvider implements AnalyticsProvider {
  private events: AnalyticsEvent[] = [];

  async track(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return [...this.events];
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}
