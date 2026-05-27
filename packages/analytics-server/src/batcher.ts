/**
 * Batch event inserter for D1 database
 */

import type { AnalyticsEvent } from "./validator.js";
import { GdprAnonymizer } from "./anonymizer.js";

export class EventBatcher {
  private db: D1Database;
  private batchSize: number;

  constructor(db: D1Database, batchSize: number = 100) {
    this.db = db;
    this.batchSize = batchSize;
  }

  /**
   * Insert events in batches to D1.
   * Returns the number of successfully inserted events.
   */
  async insert(events: AnalyticsEvent[]): Promise<number> {
    if (events.length === 0) return 0;

    let inserted = 0;

    for (let i = 0; i < events.length; i += this.batchSize) {
      const batch = events.slice(i, i + this.batchSize);
      try {
        // Build batched INSERT with placeholders
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        const values: (string | number | null)[] = [];

        for (const event of batch) {
          const ipHash = typeof event.properties?.ip_hash === "string"
            ? event.properties.ip_hash
            : GdprAnonymizer.hashIp("");
          values.push(
            event.eventId,
            event.appId ?? "default",
            event.type,
            event.sessionId, // used as hashed user_id
            JSON.stringify(event.properties ?? {}),
            event.timestamp,
            ipHash,
            Date.now(), // created_at
          );
        }

        const sql = `
          INSERT OR IGNORE INTO events
          (id, app_id, event_type, user_id, properties, timestamp, ip_hash, created_at)
          VALUES ${placeholders}
        `;

        await this.db.prepare(sql).bind(...values).run();
        inserted += batch.length;
      } catch (err) {
        // Fall back to individual inserts on batch failure
        for (const event of batch) {
          try {
            const ipHash = typeof event.properties?.ip_hash === "string"
              ? event.properties.ip_hash
              : GdprAnonymizer.hashIp("");
            await this.db.prepare(`
              INSERT OR IGNORE INTO events
              (id, app_id, event_type, user_id, properties, timestamp, ip_hash, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              event.eventId,
              event.appId ?? "default",
              event.type,
              event.sessionId,
              JSON.stringify(event.properties ?? {}),
              event.timestamp,
              ipHash,
              Date.now(),
            ).run();
            inserted++;
          } catch {
            // Individual insert also failed, skip this event
          }
        }
      }
    }

    return inserted;
  }
}
