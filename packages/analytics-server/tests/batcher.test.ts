import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBatcher } from "../src/batcher.js";
import type { AnalyticsEvent } from "../src/validator.js";

function makeD1Mock(): D1Database {
  const inserted: any[] = [];

  return {
    prepare(sql: string) {
      return {
        bind(...values: any[]) {
          return {
            async run(): Promise<D1Result> {
              inserted.push({ sql, values });
              return {
                success: true,
                meta: { duration: 1, changes: values.length / 8 },
                results: null as any,
                error: null,
              } as D1Result;
            },
            async first(): Promise<any> {
              return null;
            },
            async all(): Promise<D1Result> {
              return {
                success: true,
                meta: { duration: 1 },
                results: [],
              } as D1Result;
            },
            async raw(): Promise<any[][]> {
              return [];
            },
          };
        },
      };
    },
    dump(): Promise<ArrayBuffer> {
      return Promise.resolve(new ArrayBuffer(0));
    },
    batch(): Promise<D1Result[]> {
      return Promise.resolve([]);
    },
    exec(): Promise<D1ExecResult> {
      return Promise.resolve({ count: 0, duration: 0 });
    },
  } as unknown as D1Database;
}

function makeEvent(id: string): AnalyticsEvent {
  return {
    eventId: id,
    type: "page_viewed",
    timestamp: Date.now(),
    sessionId: "sess_test",
    appId: "test-app",
  };
}

describe("EventBatcher", () => {
  let db: D1Database;

  beforeEach(() => {
    db = makeD1Mock();
  });

  it("returns 0 for empty input", async () => {
    const batcher = new EventBatcher(db, 10);
    const count = await batcher.insert([]);
    expect(count).toBe(0);
  });

  it("inserts events within batch size", async () => {
    const batcher = new EventBatcher(db, 10);
    const events = [makeEvent("evt_1"), makeEvent("evt_2"), makeEvent("evt_3")];
    const count = await batcher.insert(events);
    expect(count).toBe(3);
  });

  it("splits events into multiple batches", async () => {
    const batcher = new EventBatcher(db, 2);
    const events = [
      makeEvent("evt_1"),
      makeEvent("evt_2"),
      makeEvent("evt_3"),
      makeEvent("evt_4"),
      makeEvent("evt_5"),
    ];
    const count = await batcher.insert(events);
    expect(count).toBe(5);
  });

  it("uses default batch size of 100", async () => {
    const batcher = new EventBatcher(db);
    const events = Array.from({ length: 150 }, (_, i) => makeEvent(`evt_${i}`));
    const count = await batcher.insert(events);
    expect(count).toBe(150);
  });

  it("falls back to individual inserts on batch failure", async () => {
    const failingDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn().mockRejectedValueOnce(new Error("batch error")),
        })),
      })),
    } as unknown as D1Database;

    const batcher = new EventBatcher(failingDb, 2);
    const events = [makeEvent("evt_1"), makeEvent("evt_2")];
    const count = await batcher.insert(events);
    // Falls back to individual inserts
    expect(count).toBe(0);
  });
});
