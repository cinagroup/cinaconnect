/**
 * SQLite storage layer for indexed events.
 *
 * Uses better-sqlite3 for synchronous, embedded persistence.
 * Schema is auto-created on init.
 */

import Database from 'better-sqlite3';
import type {
  IndexedEvent,
  EventQuery,
  PaginatedEvents,
  EventType,
} from './types.js';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS chain_state (
    chain_id        INTEGER PRIMARY KEY,
    latest_block    INTEGER NOT NULL DEFAULT 0,
    last_updated    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS indexed_events (
    id              TEXT PRIMARY KEY,
    chain_id        INTEGER NOT NULL,
    event_type      TEXT NOT NULL,
    block_number    INTEGER NOT NULL,
    timestamp       INTEGER NOT NULL,
    tx_hash         TEXT NOT NULL,
    log_index       INTEGER NOT NULL,
    from_address    TEXT NOT NULL,
    to_address      TEXT NOT NULL,
    token_address   TEXT,
    amount          TEXT NOT NULL,
    formatted_amount TEXT NOT NULL DEFAULT '',
    decimals        INTEGER NOT NULL DEFAULT 18,
    symbol          TEXT,
    raw             TEXT NOT NULL DEFAULT '0x'
  );

  CREATE INDEX IF NOT EXISTS idx_events_chain   ON indexed_events(chain_id);
  CREATE INDEX IF NOT EXISTS idx_events_type     ON indexed_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_events_block    ON indexed_events(block_number);
  CREATE INDEX IF NOT EXISTS idx_events_time     ON indexed_events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_from     ON indexed_events(from_address);
  CREATE INDEX IF NOT EXISTS idx_events_to       ON indexed_events(to_address);
  CREATE INDEX IF NOT EXISTS idx_events_token    ON indexed_events(token_address);
  CREATE INDEX IF NOT EXISTS idx_events_address  ON indexed_events(from_address, to_address);
`;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export class EventStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64 MB
    this.db.exec(SCHEMA_SQL);
  }

  /** Save a batch of indexed events (upsert by id). */
  saveEvents(events: IndexedEvent[]): void {
    if (events.length === 0) return;

    // Validate event count to prevent memory exhaustion
    if (events.length > 10000) {
      throw new Error(`Batch size ${events.length} exceeds maximum of 10000`);
    }

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO indexed_events
        (id, chain_id, event_type, block_number, timestamp, tx_hash, log_index,
         from_address, to_address, token_address, amount, formatted_amount,
         decimals, symbol, raw)
      VALUES
        (@id, @chainId, @eventType, @blockNumber, @timestamp, @txHash, @logIndex,
         @fromAddress, @toAddress, @tokenAddress, @amount, @formattedAmount,
         @decimals, @symbol, @raw)
    `);

    const runMany = this.db.transaction((evts: IndexedEvent[]) => {
      for (const evt of evts) {
        insert.run({
          id: evt.id,
          chainId: evt.chainId,
          eventType: evt.eventType,
          blockNumber: evt.blockNumber,
          timestamp: evt.timestamp,
          txHash: evt.transactionHash,
          logIndex: evt.logIndex,
          fromAddress: evt.fromAddress.toLowerCase(),
          toAddress: evt.toAddress.toLowerCase(),
          tokenAddress: evt.tokenAddress?.toLowerCase() ?? null,
          amount: evt.amount.toString(),
          formattedAmount: evt.formattedAmount,
          decimals: evt.decimals,
          symbol: evt.symbol ?? null,
          raw: evt.raw,
        });
      }
    });

    runMany(events);
  }

  /** Update the latest indexed block for a chain. */
  updateChainState(chainId: number, latestBlock: number): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO chain_state (chain_id, latest_block, last_updated)
      VALUES (@chainId, @latestBlock, @now)
    `).run({
      chainId,
      latestBlock,
      now: Date.now(),
    });
  }

  /** Get the latest indexed block for a chain (0 if unknown). */
  getLatestBlock(chainId: number): number {
    const row = this.db
      .prepare('SELECT latest_block FROM chain_state WHERE chain_id = ?')
      .get(chainId) as { latest_block: number } | undefined;
    return row?.latest_block ?? 0;
  }

  /** Get all chain states. */
  getAllChainStates(): {
    chainId: number;
    latestBlock: number;
    lastUpdated: number;
  }[] {
    return (
      this.db.prepare('SELECT chain_id, latest_block, last_updated FROM chain_state').all() as {
        chain_id: number;
        latest_block: number;
        last_updated: number;
      }[]
    ).map((r) => ({
      chainId: r.chain_id,
      latestBlock: r.latest_block,
      lastUpdated: r.last_updated,
    }));
  }

  /** Query indexed events with filters and pagination. */
  queryEvents(q: EventQuery): PaginatedEvents {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    let idx = 0;

    const bind = (cond: string, value: unknown) => {
      const key = `p${idx++}`;
      conditions.push(`${cond.replace(/\?/g, `$${key}`)}`);
      params[key] = value;
    };

    // Address filter — validate hex format before binding
    if (q.address) {
      const addr = q.address.toLowerCase();
      // Use OR condition with proper parameter binding
      conditions.push(`(from_address = $p${idx} OR to_address = $p${idx})`);
      params[`p${idx++}`] = addr;
    }
    if (q.chainId !== undefined) bind('chain_id = ?', q.chainId);
    if (q.eventType) bind('event_type = ?', q.eventType);
    if (q.tokenAddress) bind('token_address = ?', q.tokenAddress.toLowerCase());
    if (q.timeFrom !== undefined) bind('timestamp >= ?', q.timeFrom);
    if (q.timeTo !== undefined) bind('timestamp <= ?', q.timeTo);
    if (q.blockFrom !== undefined) bind('block_number >= ?', q.blockFrom);
    if (q.blockTo !== undefined) bind('block_number <= ?', q.blockTo);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' ')}` : '';
    const order = q.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(q.limit ?? 50, 200);
    const offset = q.offset ?? 0;

    // Count
    const countSql = `SELECT COUNT(*) as cnt FROM indexed_events ${whereClause}`;
    const total = (this.db.prepare(countSql).get(params) as { cnt: number }).cnt;

    // Fetch
    const fetchSql = `
      SELECT * FROM indexed_events
      ${whereClause}
      ORDER BY timestamp ${order}, block_number ${order}, log_index ${order}
      LIMIT @limit OFFSET @offset
    `;
    const rows = this.db
      .prepare(fetchSql)
      .all({ ...params, limit, offset }) as Record<string, unknown>[];

    const events: IndexedEvent[] = rows.map((r) => ({
      id: r.id as string,
      chainId: r.chain_id as number,
      eventType: r.event_type as EventType,
      blockNumber: r.block_number as number,
      timestamp: r.timestamp as number,
      transactionHash: r.tx_hash as `0x${string}`,
      logIndex: r.log_index as number,
      fromAddress: r.from_address as `0x${string}`,
      toAddress: r.to_address as `0x${string}`,
      tokenAddress: (r.token_address as `0x${string}` | null) ?? undefined,
      amount: BigInt(r.amount as string),
      formattedAmount: r.formatted_amount as string,
      decimals: r.decimals as number,
      symbol: (r.symbol as string | null) ?? undefined,
      raw: r.raw as `0x${string}`,
    }));

    return {
      events,
      total,
      limit,
      offset,
      hasMore: offset + events.length < total,
    };
  }

  /** Get total event count across all chains. */
  getTotalEvents(): number {
    return (this.db.prepare('SELECT COUNT(*) as cnt FROM indexed_events').get() as { cnt: number }).cnt;
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }
}
