import { EmbeddedWallet } from './EmbeddedWallet';
import { backupWallet, recoverWallet as recoverBackup } from './backup';
import {
  AuthMethod,
  EmbeddedWalletConfig,
  LinkedProvider,
  WalletBackup,
  WalletSession,
} from './types';

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

// ─── Default storage prefix ──────────────────────────────────────────────────

const DEFAULT_PREFIX = '@cinacoin/embedded-wallet';

/**
 * High-level wallet lifecycle manager.
 *
 * - Creates / recovers wallets via deterministic key derivation.
 * - Persists metadata (salt, linked providers) to localStorage or IndexedDB.
 * - **Never** stores raw private keys on disk — only the derivation salt.
 */
export class WalletManager {
  private readonly _storagePrefix: string;
  private readonly _useIndexedDB: boolean;
  private readonly _sessions: Map<string, ActiveSession> = new Map();

  constructor(config: EmbeddedWalletConfig) {
    this._storagePrefix = `wallet:${config.id}`;
    // Storage mode can be toggled; default is localStorage
    this._useIndexedDB = false; // extend when needed
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

  private async _saveRecord(record: WalletRecord): Promise<void> {
    localStorage.setItem(this._keyFor(record.walletId), JSON.stringify(record));
    await this._indexAdd(record.walletId);
  }

  private async _loadRecord(walletId: string): Promise<WalletRecord | null> {
    const raw = localStorage.getItem(this._keyFor(walletId));
    return raw ? JSON.parse(raw) as WalletRecord : null;
  }

  private async _loadAllRecords(): Promise<WalletRecord[]> {
    const index = await this._indexGet();
    const records: WalletRecord[] = [];
    for (const id of index) {
      const r = await this._loadRecord(id);
      if (r) records.push(r);
    }
    return records;
  }

  private async _findRecordByIdentifier(identifier: string): Promise<WalletRecord | null> {
    const records = await this._loadAllRecords();
    return records.find((r) => r.identifier === identifier) ?? null;
  }

  // ─── Index (wallet id list) ───────────────────────────────────────────────

  private async _indexGet(): Promise<string[]> {
    const raw = localStorage.getItem(this._indexKey());
    return raw ? JSON.parse(raw) as string[] : [];
  }

  private async _indexSet(index: string[]): Promise<void> {
    localStorage.setItem(this._indexKey(), JSON.stringify(index));
  }

  private async _indexAdd(walletId: string): Promise<void> {
    const index = await this._indexGet();
    if (!index.includes(walletId)) {
      index.push(walletId);
      await this._indexSet(index);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _generateWalletId(authMethod: AuthMethod, identifier: string): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
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
