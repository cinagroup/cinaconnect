/**
 * Tests for @cinacoin/tx-indexer — EventStore, TxIndexer, and server.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { EventStore } from './storage.js';
import type { IndexedEvent, EventQuery, EventType } from './types.js';

// ---------------------------------------------------------------------------
// EventStore Tests
// ---------------------------------------------------------------------------

describe('EventStore', () => {
  let store: EventStore;
  const DB_PATH = ':memory:';

  beforeEach(() => {
    store = new EventStore(DB_PATH);
  });

  afterEach(() => {
    store.close();
  });

  it('creates tables on init', () => {
    const states = store.getAllChainStates();
    expect(Array.isArray(states)).toBe(true);
    expect(store.getTotalEvents()).toBe(0);
  });

  it('returns 0 for unknown chain', () => {
    expect(store.getLatestBlock(1)).toBe(0);
    expect(store.getLatestBlock(999)).toBe(0);
  });

  it('saves and retrieves events', () => {
    const events: IndexedEvent[] = [
      {
        id: '1-0xabc-0',
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100,
        timestamp: 1700000000,
        transactionHash: '0xabc',
        logIndex: 0,
        fromAddress: '0x1111111111111111111111111111111111111111',
        toAddress: '0x2222222222222222222222222222222222222222',
        tokenAddress: '0x3333333333333333333333333333333333333333',
        amount: 1000000000000000000n,
        formattedAmount: '1.0',
        decimals: 18,
        symbol: 'TEST',
        raw: '0x',
      },
    ];

    store.saveEvents(events);
    expect(store.getTotalEvents()).toBe(1);

    const result = store.queryEvents({});
    expect(result.events.length).toBe(1);
    expect(result.events[0].eventType).toBe('transfer');
    expect(result.events[0].chainId).toBe(1);
    expect(result.events[0].fromAddress.toLowerCase()).toBe('0x1111111111111111111111111111111111111111');
  });

  it('updates chain state correctly', () => {
    store.updateChainState(1, 500);
    expect(store.getLatestBlock(1)).toBe(500);

    store.updateChainState(1, 1000);
    expect(store.getLatestBlock(1)).toBe(1000);

    store.updateChainState(137, 200);
    expect(store.getLatestBlock(137)).toBe(200);
    expect(store.getLatestBlock(1)).toBe(1000); // chain 1 unchanged
  });

  it('handles batch saves', () => {
    const events: IndexedEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push({
        id: `1-0xtx-${i}`,
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100 + i,
        timestamp: 1700000000 + i,
        transactionHash: '0xtx',
        logIndex: i,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: BigInt(1000 + i),
        formattedAmount: String(1000 + i),
        decimals: 18,
        raw: '0x',
      });
    }

    store.saveEvents(events);
    expect(store.getTotalEvents()).toBe(10);
  });

  it('upserts by id (no duplicates)', () => {
    const event: IndexedEvent = {
      id: 'dup-001',
      chainId: 1,
      eventType: 'transfer',
      blockNumber: 100,
      timestamp: 1700000000,
      transactionHash: '0xdup',
      logIndex: 0,
      fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
      toAddress: '0xbbbb00000000000000000000000000000000bbbb',
      amount: 100n,
      formattedAmount: '100',
      decimals: 18,
      raw: '0x',
    };

    store.saveEvents([event]);
    expect(store.getTotalEvents()).toBe(1);

    // Save again with updated amount
    event.amount = 200n;
    event.formattedAmount = '200';
    store.saveEvents([event]);
    expect(store.getTotalEvents()).toBe(1);

    const result = store.queryEvents({});
    expect(result.events[0].amount).toBe(200n);
  });

  it('saves empty array without error', () => {
    store.saveEvents([]);
    expect(store.getTotalEvents()).toBe(0);
  });

  it('queryEvents returns pagination info', () => {
    const events: IndexedEvent[] = [];
    for (let i = 0; i < 25; i++) {
      events.push({
        id: `1-pag-${i}`,
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100 + i,
        timestamp: 1700000000 + i,
        transactionHash: '0xpag',
        logIndex: i,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: BigInt(i),
        formattedAmount: String(i),
        decimals: 18,
        raw: '0x',
      });
    }
    store.saveEvents(events);

    const result = store.queryEvents({ limit: 10, offset: 0 });
    expect(result.events.length).toBe(10);
    expect(result.total).toBe(25);
    expect(result.hasMore).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);

    const page2 = store.queryEvents({ limit: 10, offset: 10 });
    expect(page2.events.length).toBe(10);
    expect(page2.hasMore).toBe(true);

    const page3 = store.queryEvents({ limit: 10, offset: 20 });
    expect(page3.events.length).toBe(5);
    expect(page3.hasMore).toBe(false);
  });

  it('filters events by chainId', () => {
    const events: IndexedEvent[] = [
      {
        id: '1-fc-1',
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100,
        timestamp: 1700000000,
        transactionHash: '0xfc1',
        logIndex: 0,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: 100n,
        formattedAmount: '100',
        decimals: 18,
        raw: '0x',
      },
      {
        id: '137-fc-1',
        chainId: 137,
        eventType: 'swap',
        blockNumber: 200,
        timestamp: 1700000001,
        transactionHash: '0xfc2',
        logIndex: 0,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: 200n,
        formattedAmount: '200',
        decimals: 18,
        raw: '0x',
      },
    ];
    store.saveEvents(events);

    const ethResult = store.queryEvents({ chainId: 1 });
    expect(ethResult.events.length).toBe(1);
    expect(ethResult.events[0].chainId).toBe(1);

    const polyResult = store.queryEvents({ chainId: 137 });
    expect(polyResult.events.length).toBe(1);
    expect(polyResult.events[0].chainId).toBe(137);
  });

  it('filters events by eventType', () => {
    const events: IndexedEvent[] = [
      {
        id: '1-fe-1',
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100,
        timestamp: 1700000000,
        transactionHash: '0xfe1',
        logIndex: 0,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: 100n,
        formattedAmount: '100',
        decimals: 18,
        raw: '0x',
      },
      {
        id: '1-fe-2',
        chainId: 1,
        eventType: 'swap',
        blockNumber: 101,
        timestamp: 1700000001,
        transactionHash: '0xfe2',
        logIndex: 0,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: 200n,
        formattedAmount: '200',
        decimals: 18,
        raw: '0x',
      },
    ];
    store.saveEvents(events);

    const transfers = store.queryEvents({ eventType: 'transfer' });
    expect(transfers.events.length).toBe(1);
    expect(transfers.events[0].eventType).toBe('transfer');

    const swaps = store.queryEvents({ eventType: 'swap' });
    expect(swaps.events.length).toBe(1);
    expect(swaps.events[0].eventType).toBe('swap');
  });

  it('filters events by address (from or to)', () => {
    const events: IndexedEvent[] = [
      {
        id: '1-fa-1',
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100,
        timestamp: 1700000000,
        transactionHash: '0xfa1',
        logIndex: 0,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: 100n,
        formattedAmount: '100',
        decimals: 18,
        raw: '0x',
      },
      {
        id: '1-fa-2',
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 101,
        timestamp: 1700000001,
        transactionHash: '0xfa2',
        logIndex: 0,
        fromAddress: '0xcccc00000000000000000000000000000000cccc',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: 200n,
        formattedAmount: '200',
        decimals: 18,
        raw: '0x',
      },
      {
        id: '1-fa-3',
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 102,
        timestamp: 1700000002,
        transactionHash: '0xfa3',
        logIndex: 0,
        fromAddress: '0xdddd00000000000000000000000000000000dddd',
        toAddress: '0xeeee00000000000000000000000000000000eeee',
        amount: 300n,
        formattedAmount: '300',
        decimals: 18,
        raw: '0x',
      },
    ];
    store.saveEvents(events);

    const addrB = store.queryEvents({ address: '0xbbbb00000000000000000000000000000000bbbb' });
    expect(addrB.events.length).toBe(2);

    const addrD = store.queryEvents({ address: '0xdddd00000000000000000000000000000000dddd' });
    expect(addrD.events.length).toBe(1);

    const addrNone = store.queryEvents({ address: '0xffff00000000000000000000000000000000ffff' });
    expect(addrNone.events.length).toBe(0);
  });

  it('sorts events by timestamp descending by default', () => {
    const events: IndexedEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push({
        id: `1-sort-${i}`,
        chainId: 1,
        eventType: 'transfer',
        blockNumber: 100 + i,
        timestamp: 1700000000 + i,
        transactionHash: '0xsort',
        logIndex: i,
        fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
        toAddress: '0xbbbb00000000000000000000000000000000bbbb',
        amount: BigInt(i),
        formattedAmount: String(i),
        decimals: 18,
        raw: '0x',
      });
    }
    store.saveEvents(events);

    const desc = store.queryEvents({ sortOrder: 'desc' });
    expect(desc.events[0].timestamp).toBe(1700000004);
    expect(desc.events[4].timestamp).toBe(1700000000);

    const asc = store.queryEvents({ sortOrder: 'asc' });
    expect(asc.events[0].timestamp).toBe(1700000000);
    expect(asc.events[4].timestamp).toBe(1700000004);
  });

  it('getAllChainStates returns updated states', () => {
    store.updateChainState(1, 500);
    store.updateChainState(137, 200);

    const states = store.getAllChainStates();
    expect(states.length).toBe(2);

    const ethState = states.find((s) => s.chainId === 1);
    expect(ethState).toBeDefined();
    expect(ethState!.latestBlock).toBe(500);

    const polyState = states.find((s) => s.chainId === 137);
    expect(polyState).toBeDefined();
    expect(polyState!.latestBlock).toBe(200);
  });

  it('handles multiple event types', () => {
    const types: EventType[] = ['transfer', 'swap', 'deposit', 'withdrawal'];
    const events: IndexedEvent[] = types.map((type, i) => ({
      id: `1-mt-${i}`,
      chainId: 1,
      eventType: type,
      blockNumber: 100 + i,
      timestamp: 1700000000 + i,
      transactionHash: '0xmt',
      logIndex: i,
      fromAddress: '0xaaaa00000000000000000000000000000000aaaa',
      toAddress: '0xbbbb00000000000000000000000000000000bbbb',
      amount: BigInt(100 * (i + 1)),
      formattedAmount: String(100 * (i + 1)),
      decimals: 18,
      raw: '0x',
    }));

    store.saveEvents(events);
    expect(store.getTotalEvents()).toBe(4);

    for (const type of types) {
      const result = store.queryEvents({ eventType: type });
      expect(result.events.length).toBe(1);
      expect(result.events[0].eventType).toBe(type);
    }
  });
});
