import { EmbeddedWallet } from './EmbeddedWallet';
import { backupWallet, recoverWallet as recoverBackup } from './backup';
import {
  AuthMethod,
  EmbeddedWalletConfig,
  LinkedProvider,
  WalletBackup,
  WalletSession,
} from './types';

// ─── Storage mode ────────────────────────────────────────────────────────────

export type StorageMode = 'localStorage' | 'indexedDB';

const DEFAULT_PREFIX = '@cinacoin/embedded-wallet';
const IDB_NAME = 'cinacoin-wallets';
const IDB_VERSION = 1;
const IDB_STORE = 'records';

/**
 * Check whether IndexedDB is available in the current environment.
 * Returns `false` in SSR / node / disabled-browser contexts.
 */
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Open (or reuse) the shared IndexedDB database connection. */
function _openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * IndexedDB helpers — thin wrappers over the key-value object store.
 *
 * Each record is stored under a composite key:
 *   `${storagePrefix}:${walletId}`  — wallet metadata
 *   `${storagePrefix}:index`        — array of walletIds
 */
async function idbGet<T>(key: string): Promise<T | null> {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(): Promise<void> {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Internal persisted record ───────────────────────────────────────────────

interface WalletRecord {
  walletId: string;
  authMethod: AuthMethod;
  identifier: string;
  salt: string;              // hex
  label?: string;
  linkedProviders: LinkedProvider[];
  createdAt: string;
  lastAccessedAt?: string;
}

// ─── In-memory active session ────────────────────────────────────────────────

interface ActiveSession {
  wallet: EmbeddedWallet;
  session: WalletSession;
}

/**
 * High-level wallet lifecycle manager.
 *
 * - Creates / recovers wallets via deterministic key derivation.
 * - Persists metadata (salt, linked providers) to IndexedDB (default) or localStorage.
 * - **Never** stores raw private keys on disk — only the derivation salt.
 */
export interface WalletManagerConfig {
  /** Storage backend — `'indexedDB'` (default) or `'localStorage'`. */
  storageMode?: StorageMode;
}

export class WalletManager {
  private readonly _storagePrefix: string;
  private readonly _storageMode: StorageMode;
  private readonly _sessions: Map<string, ActiveSession> = new Map();

  constructor(config: EmbeddedWalletConfig, managerConfig?: WalletManagerConfig) {
    this._storagePrefix = `wallet:${config.id}`;
    // Default to IndexedDB when available; fall back to localStorage for SSR / unsupported envs.
    this._storageMode =
      managerConfig?.storageMode ??
      (isIndexedDBAvailable() ? 'indexedDB' : 'localStorage');
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  /**
   * Create a new embedded wallet.
   */
  async create(authMethod: AuthMethod, identifier: string, label?: string): Promise<WalletSession> {
    const walletId = this._generateWalletId(authMethod, identifier);

    // Guard: already exists
    if (await this._loadRecord(walletId)) {
      throw new Error(`Wallet already exists for ${authMethod}:${identifier}. Use login() instead.`);
    }

    const wallet = EmbeddedWallet.create(walletId, authMethod, identifier);
    const now = new Date().toISOString();

    const record: WalletRecord = {
      walletId,
      authMethod,
      identifier,
      salt: bytesToHex(wallet.salt),
      label,
      linkedProviders: [],
      createdAt: now,
    };
    await this._saveRecord(record);

    const session: WalletSession = {
      walletId,
      authMethod,
      identifier,
      createdAt: now,
      expiresAt: null,
    };
    this._sessions.set(walletId, { wallet, session });
    return session;
  }

  // ─── Login / Recover ──────────────────────────────────────────────────────

  /**
   * Recover (log in to) an existing wallet by identifier.
   * The private key is re-derived from identifier + stored salt.
   */
  async login(identifier: string): Promise<WalletSession> {
    const record = await this._findRecordByIdentifier(identifier);
    if (!record) {
      throw new Error(`No wallet found for identifier: ${identifier}`);
    }

    const salt = hexToBytes(record.salt);
    const wallet = EmbeddedWallet.recover(record.walletId, record.authMethod, identifier, salt);

    const now = new Date().toISOString();
    record.lastAccessedAt = now;
    await this._saveRecord(record);

    const session: WalletSession = {
      walletId: record.walletId,
      authMethod: record.authMethod,
      identifier,
      createdAt: record.createdAt,
      expiresAt: null,
    };
    this._sessions.set(record.walletId, { wallet, session });
    return session;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  /**
   * Clear the active in-memory session(s). Does NOT delete persisted metadata.
   */
  logout(walletId?: string): void {
    if (walletId) {
      this._sessions.delete(walletId);
    } else {
      this._sessions.clear();
    }
  }

  // ─── List Wallets ─────────────────────────────────────────────────────────

  /**
   * Return all wallet sessions. Optionally filtered by identifier.
   */
  async listWallets(identifier?: string): Promise<WalletSession[]> {
    const records = await this._loadAllRecords();
    const filtered = identifier
      ? records.filter((r) => r.identifier === identifier)
      : records;

    return filtered.map((r) => {
      const active = this._sessions.get(r.walletId);
      if (active) return active.session;

      // Reconstruct from metadata (wallet not active in memory)
      return {
        walletId: r.walletId,
        authMethod: r.authMethod,
        identifier: r.identifier,
        createdAt: r.createdAt,
        expiresAt: null,
      } satisfies WalletSession;
    });
  }

  // ─── Provider Linking ─────────────────────────────────────────────────────

  /**
   * Link a social / external auth provider to a wallet.
   */
  async linkProvider(
    walletId: string,
    provider: string,
    externalId: string
  ): Promise<LinkedProvider> {
    const record = await this._loadRecord(walletId);
    if (!record) throw new Error(`Wallet not found: ${walletId}`);

    // Deduplicate
    const existing = record.linkedProviders.find(
      (p) => p.provider === provider && p.externalId === externalId
    );
    if (existing) return existing;

    const linked: LinkedProvider = {
      providerId: `lp_${provider}_${externalId}`,
      provider,
      externalId,
      linkedAt: new Date().toISOString(),
    };
    record.linkedProviders.push(linked);
    await this._saveRecord(record);
    return linked;
  }

  /**
   * Unlink (remove) a linked provider from a wallet.
   */
  async unlinkProvider(walletId: string, providerId: string): Promise<void> {
    const record = await this._loadRecord(walletId);
    if (!record) throw new Error(`Wallet not found: ${walletId}`);

    const idx = record.linkedProviders.findIndex((p) => p.providerId === providerId);
    if (idx === -1) throw new Error(`Provider link not found: ${providerId}`);

    record.linkedProviders.splice(idx, 1);
    await this._saveRecord(record);
  }

  // ─── Backup / Restore ─────────────────────────────────────────────────────

  /**
   * Create an encrypted backup of the active wallet's private key.
   */
  async backup(walletId: string, password: string): Promise<WalletBackup> {
    const active = this._sessions.get(walletId);
    if (!active) throw new Error(`No active session for wallet: ${walletId}`);

    const privateKeyHex = active.wallet.exportPrivateKey();
    return backupWallet(walletId, privateKeyHex, password);
  }

  /**
   * Recover a wallet from an encrypted backup.
   */
  async restoreFromBackup(backup: WalletBackup, password: string): Promise<WalletSession> {
    const privateKeyHex = await recoverBackup(backup.walletId, backup, password);

    const record = await this._loadRecord(backup.walletId);
    if (!record) throw new Error(`No wallet record for backup: ${backup.walletId}`);

    // Verify recovered key matches
    const salt = hexToBytes(record.salt);
    const wallet = EmbeddedWallet.recover(backup.walletId, record.authMethod, record.identifier, salt);
    if (wallet.exportPrivateKey() !== privateKeyHex) {
      throw new Error('Incorrect password or corrupted backup');
    }

    const session: WalletSession = {
      walletId: backup.walletId,
      authMethod: record.authMethod,
      identifier: record.identifier,
      createdAt: record.createdAt,
      expiresAt: null,
    };
    this._sessions.set(backup.walletId, { wallet, session });
    return session;
  }

  // ─── Direct Wallet Access ─────────────────────────────────────────────────

  /** Get the active `EmbeddedWallet` instance (if logged in). */
  getWallet(walletId: string): EmbeddedWallet | undefined {
    return this._sessions.get(walletId)?.wallet;
  }

  // ─── Storage Layer ────────────────────────────────────────────────────────

  private _keyFor(walletId: string): string {
    return `${this._storagePrefix}:${walletId}`;
  }

  private _indexKey(): string {
    return `${this._storagePrefix}:index`;
  }

  /** Save a wallet record via the active storage backend. */
  private async _saveRecord(record: WalletRecord): Promise<void> {
    const key = this._keyFor(record.walletId);
    const value = JSON.stringify(record);

    if (this._storageMode === 'indexedDB' && isIndexedDBAvailable()) {
      await idbSet(key, value);
    } else {
      localStorage.setItem(key, value);
    }
    await this._indexAdd(record.walletId);
  }

  /** Load a single wallet record via the active storage backend. */
  private async _loadRecord(walletId: string): Promise<WalletRecord | null> {
    const key = this._keyFor(walletId);
    let raw: string | null;

    if (this._storageMode === 'indexedDB' && isIndexedDBAvailable()) {
      raw = await idbGet<string>(key);
    } else {
      raw = localStorage.getItem(key);
    }

    return raw ? (JSON.parse(raw) as WalletRecord) : null;
  }

  /** Load all wallet records. */
  private async _loadAllRecords(): Promise<WalletRecord[]> {
    const index = await this._indexGet();
    const records: WalletRecord[] = [];
    for (const id of index) {
      const r = await this._loadRecord(id);
      if (r) records.push(r);
    }
    return records;
  }

  /** Find a record by user identifier. */
  private async _findRecordByIdentifier(identifier: string): Promise<WalletRecord | null> {
    const records = await this._loadAllRecords();
    return records.find((r) => r.identifier === identifier) ?? null;
  }

  // ─── Index (wallet id list) ───────────────────────────────────────────────

  private async _indexGet(): Promise<string[]> {
    const key = this._indexKey();
    let raw: string | null;

    if (this._storageMode === 'indexedDB' && isIndexedDBAvailable()) {
      raw = await idbGet<string>(key);
    } else {
      raw = localStorage.getItem(key);
    }

    return raw ? (JSON.parse(raw) as string[]) : [];
  }

  private async _indexSet(index: string[]): Promise<void> {
    const key = this._indexKey();
    const value = JSON.stringify(index);

    if (this._storageMode === 'indexedDB' && isIndexedDBAvailable()) {
      await idbSet(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  }

  private async _indexAdd(walletId: string): Promise<void> {
    const index = await this._indexGet();
    if (!index.includes(walletId)) {
      index.push(walletId);
      await this._indexSet(index);
    }
  }

  // ─── Public storage API ───────────────────────────────────────────────────

  /** Returns the active storage mode for this manager instance. */
  get storageMode(): StorageMode {
    return this._storageMode;
  }

  /**
   * Remove a single wallet record from persistent storage.
   * Does NOT touch the in-memory session — call `logout()` separately if needed.
   */
  async deleteRecord(walletId: string): Promise<void> {
    const key = this._keyFor(walletId);

    if (this._storageMode === 'indexedDB' && isIndexedDBAvailable()) {
      await idbRemove(key);
    } else {
      localStorage.removeItem(key);
    }

    // Update index
    const index = await this._indexGet();
    const filtered = index.filter((id) => id !== walletId);
    await this._indexSet(filtered);
  }

  /**
   * Wipe all persisted wallet data for this manager's prefix.
   * Does NOT touch in-memory sessions.
   */
  async clearAll(): Promise<void> {
    if (this._storageMode === 'indexedDB' && isIndexedDBAvailable()) {
      // Clear records belonging to this prefix
      const index = await this._indexGet();
      for (const id of index) {
        await idbRemove(this._keyFor(id));
      }
      await idbRemove(this._indexKey());
    } else {
      const index = await this._indexGet();
      for (const id of index) {
        localStorage.removeItem(this._keyFor(id));
      }
      localStorage.removeItem(this._indexKey());
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _generateWalletId(authMethod: AuthMethod, identifier: string): string {
    const ts = Date.now().toString(36);
    const rand = crypto.randomUUID().slice(0, 8);
    return `ew_${authMethod}_${ts}_${rand}`;
  }
}

// ─── Hex utils ───────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
