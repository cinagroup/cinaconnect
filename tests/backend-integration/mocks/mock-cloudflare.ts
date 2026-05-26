/**
 * Mock in-memory KV store for simulating Cloudflare KV Namespace.
 * Used in integration tests to replace RPC_CACHE, SESSIONS, RELAY_CACHE.
 */

export class MockKVNamespace {
  private store: Map<string, { value: string; expirationTtl?: number; expiresAt?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; expiration?: number }
  ): Promise<void> {
    const now = Date.now();
    this.store.set(key, {
      value,
      expirationTtl: options?.expirationTtl,
      expiresAt: options?.expirationTtl ? now + options.expirationTtl * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  reset(): void {
    this.store.clear();
  }
}

/**
 * Mock in-memory D1 database for simulating Cloudflare D1.
 * Uses a simple Map-based table implementation for test purposes.
 */

export interface D1Row {
  [column: string]: unknown;
}

export interface D1Result {
  results: D1Row[];
  success: boolean;
  meta: { duration: number; changes: number };
}

export class MockD1Database {
  private tables: Map<string, D1Row[]> = new Map();

  prepare(sql: string): MockD1Statement {
    return new MockD1Statement(this, sql);
  }

  getTable(name: string): D1Row[] {
    return this.tables.get(name) ?? [];
  }

  setTable(name: string, rows: D1Row[]): void {
    this.tables.set(name, rows);
  }

  reset(): void {
    this.tables.clear();
  }
}

class MockD1Statement {
  private db: MockD1Database;
  private sql: string;
  private boundParams: unknown[] = [];

  constructor(db: MockD1Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...params: unknown[]): MockD1Statement {
    this.boundParams = params;
    return this;
  }

  async run(): Promise<D1Result> {
    const lower = this.sql.toLowerCase();

    if (lower.startsWith('insert')) {
      // Simple INSERT parser
      const tableMatch = this.sql.match(/INSERT INTO (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const rows = this.db.getTable(tableName);
        const valuesMatch = this.sql.match(/VALUES \(([^)]+)\)/i);
        if (valuesMatch) {
          const columns: string[] = [];
          const colMatch = this.sql.match(/\(([^)]+)\)\s*VALUES/i);
          if (colMatch) {
            columns.push(...colMatch[1].split(',').map((c) => c.trim()));
          }
          const row: D1Row = {};
          this.boundParams.forEach((val, i) => {
            const col = columns[i] ?? `col_${i}`;
            row[col] = val;
          });
          rows.push(row);
          this.db.setTable(tableName, rows);
        }
        return { results: [], success: true, meta: { duration: 0, changes: 1 } };
      }
    }

    if (lower.startsWith('select')) {
      const tableMatch = this.sql.match(/FROM (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        let results = this.db.getTable(tableName);

        // Simple WHERE filter
        if (lower.includes('where')) {
          const whereMatch = this.sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
          if (whereMatch && this.boundParams.length > 0) {
            const column = whereMatch[1];
            const value = this.boundParams[0];
            results = results.filter((r) => r[column] === value);
          }
        }

        return { results, success: true, meta: { duration: 0, changes: 0 } };
      }
    }

    return { results: [], success: true, meta: { duration: 0, changes: 0 } };
  }

  async all(): Promise<D1Result> {
    return this.run();
  }

  async first<T>(): Promise<T | null> {
    const result = await this.all();
    return (result.results[0] as T) ?? null;
  }
}

/** Singleton mock KV for RPC cache. */
export const mockRpcCache = new MockKVNamespace();

/** Singleton mock KV for sessions. */
export const mockSessionsKV = new MockKVNamespace();

/** Singleton mock KV for relay cache. */
export const mockRelayCache = new MockKVNamespace();

/** Singleton mock D1 database for keys server. */
export const mockD1DB = new MockD1Database();
