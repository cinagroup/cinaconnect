import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventDeduplicator } from "../src/deduplicator.js";
import type { AnalyticsEvent } from "../src/validator.js";

function createMockKV(): KVNamespace {
  const store = new Map<string, { value: string; expiration?: number }>();
  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiration && Date.now() > entry.expiration * 1000) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
      const expiration = opts?.expirationTtl
        ? Math.floor(Date.now() / 1000) + opts.expirationTtl
        : undefined;
      store.set(key, { value, expiration });
    },
    async delete(): Promise<void> {},
    async list(): Promise<KVNamespaceListResult<string, string>> {
      return { keys: [], list_complete: true };
    },
  } as unknown as KVNamespace;
}

function makeEvent(id: string, ts?: number): AnalyticsEvent {
  return {
    eventId: id,
    type: "page_viewed",
    timestamp: ts ?? Date.now(),
    sessionId: "sess_test",
  };
}

describe("EventDeduplicator", () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createMockKV();
  });

  it("passes all unique events", async () => {
    const dedup = new EventDeduplicator(kv);
    const events = [makeEvent("evt_1"), makeEvent("evt_2"), makeEvent("evt_3")];
    const result = await dedup.filterDuplicates(events);
    expect(result).toHaveLength(3);
  });

  it("filters duplicate eventIds", async () => {
    const dedup = new EventDeduplicator(kv);
    const events = [makeEvent("evt_1"), makeEvent("evt_1"), makeEvent("evt_2")];
    const result = await dedup.filterDuplicates(events);
    expect(result).toHaveLength(2);
  });

  it("returns empty for empty input", async () => {
    const dedup = new EventDeduplicator(kv);
    const result = await dedup.filterDuplicates([]);
    expect(result).toHaveLength(0);
  });

  it("remembers seen events across calls", async () => {
    const dedup = new EventDeduplicator(kv);
    const first = await dedup.filterDuplicates([makeEvent("evt_1")]);
    expect(first).toHaveLength(1);

    const second = await dedup.filterDuplicates([makeEvent("evt_1"), makeEvent("evt_2")]);
    expect(second).toHaveLength(1); // evt_1 is duplicate, evt_2 is new
  });

  it("fails open on KV error", async () => {
    const badKV = {
      get: vi.fn().mockRejectedValue(new Error("KV unavailable")),
      put: vi.fn().mockRejectedValue(new Error("KV unavailable")),
    } as unknown as KVNamespace;
    const dedup = new EventDeduplicator(badKV);
    const events = [makeEvent("evt_1"), makeEvent("evt_2")];
    const result = await dedup.filterDuplicates(events);
    expect(result).toHaveLength(2); // all events pass on failure
  });

  it("preserves event data", async () => {
    const dedup = new EventDeduplicator(kv);
    const events: AnalyticsEvent[] = [
      {
        eventId: "evt_1",
        type: "wallet_connected",
        timestamp: 1700000000000,
        sessionId: "sess_abc",
        wallet: "metamask",
        chainId: 1,
      },
    ];
    const result = await dedup.filterDuplicates(events);
    expect(result[0].eventId).toBe("evt_1");
    expect(result[0].wallet).toBe("metamask");
    expect(result[0].chainId).toBe(1);
  });
});
