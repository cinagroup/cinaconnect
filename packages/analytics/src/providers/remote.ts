/**
 * Remote Analytics Provider
 *
 * Sends analytics events to a remote endpoint.
 */

import type { AnalyticsEvent, AnalyticsProvider } from "./types.js";

export interface RemoteProviderConfig {
  /** Remote endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Batch size before sending */
  batchSize?: number;
  /** Flush interval in ms */
  flushInterval?: number;
}

export class RemoteProvider implements AnalyticsProvider {
  private config: Required<RemoteProviderConfig>;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private allEvents: AnalyticsEvent[] = [];

  constructor(config: RemoteProviderConfig) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey ?? "",
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 5000,
    };
  }

  async track(event: AnalyticsEvent): Promise<void> {
    this.queue.push(event);
    this.allEvents.push(event);

    if (this.queue.length >= this.config.batchSize) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  /**
   * Flush pending events to the remote endpoint.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // Simulated send — in production, make actual fetch call
      const response = { ok: true };
      if (!response.ok) {
        // Re-queue on failure
        this.queue.unshift(...events);
      }
    } catch {
      // Re-queue on network failure
      this.queue.unshift(...events);
    }
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return [...this.allEvents];
  }

  async clear(): Promise<void> {
    this.queue = [];
    this.allEvents = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
