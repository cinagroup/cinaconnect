/**
 * Event deduplication using KV storage
 * Prevents duplicate event ingestion based on eventId
 */

import type { AnalyticsEvent } from "./validator.js";

const DEDUP_TTL = 86400; // 24 hours in seconds

export class EventDeduplicator {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Filter out duplicate events based on eventId.
   * Returns only events that haven't been seen before.
   */
  async filterDuplicates(events: AnalyticsEvent[]): Promise<AnalyticsEvent[]> {
    if (events.length === 0) return [];

    // Step 1: Remove intra-batch duplicates (take first occurrence)
    const seenInBatch = new Set<string>();
    const dedupedInBatch: AnalyticsEvent[] = [];
    for (const event of events) {
      if (!seenInBatch.has(event.eventId)) {
        seenInBatch.add(event.eventId);
        dedupedInBatch.push(event);
      }
    }

    // Step 2: Check KV for cross-batch deduplication
    const unique: AnalyticsEvent[] = [];
    const writeOps: { key: string; value: string }[] = [];

    const checks = dedupedInBatch.map(async (event) => {
      const key = `dedup:${event.eventId}`;
      try {
        const existing = await this.kv.get(key);
        if (!existing) {
          writeOps.push({ key, value: String(event.timestamp) });
          unique.push(event);
        }
      } catch {
        // KV failure: allow the event through (fail open)
        unique.push(event);
      }
    });

    await Promise.allSettled(checks);

    // Write dedup keys in parallel (fire and forget)
    if (writeOps.length > 0) {
      const writes = writeOps.map((op) =>
        this.kv.put(op.key, op.value, { expirationTtl: DEDUP_TTL }).catch(() => {})
      );
      void Promise.allSettled(writes);
    }

    return unique;
  }
}
