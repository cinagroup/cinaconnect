import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export interface KeyManagerConfig {
  /** Encryption key for at-rest key storage */
  encryptionKey?: string;
  /** Storage backend identifier */
  storageUri?: string;
  /** Session TTL in milliseconds */
  sessionTtlMs?: number;
}

export interface StoredKey {
  id: string;
  label: string;
  encrypted: string;
  algorithm: string;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  permissions: string[];
  expiresAt: number;
}

export interface DecryptResult {
  key: Uint8Array;
  metadata: Record<string, string>;
}

/**
 * KeyManager — handles key storage, encryption/decryption, and session management.
 * Uses AES-256-GCM for encryption with keys derived via scrypt.
 */
export class KeyManager {
  private encryptionKey: Buffer;
  private store: Map<string, StoredKey> = new Map();
  private sessions: Map<string, Session> = new Map();
  private readonly sessionTtlMs: number;

  constructor(config?: KeyManagerConfig) {
    const keyPhrase = config?.encryptionKey ?? 'default-dev-key-do-not-use-in-production';
    this.encryptionKey = scryptSync(keyPhrase, 'onux-salt', 32);
    this.sessionTtlMs = config?.sessionTtlMs ?? 3600_000; // 1 hour default
  }

  /** Store an encrypted key with a label */
  async storeKey(id: string, label: string, keyData: Uint8Array): Promise<StoredKey> {
    const { ciphertext, iv, authTag } = this.encrypt(keyData);
    const encrypted = Buffer.concat([iv, authTag, ciphertext]).toString('base64');
    const stored: StoredKey = {
      id,
      label,
      encrypted,
      algorithm: 'aes-256-gcm',
      createdAt: Date.now(),
    };
    this.store.set(id, stored);
    return stored;
  }

  /** Retrieve and decrypt a stored key */
  async getKey(id: string): Promise<StoredKey | null> {
    const stored = this.store.get(id);
    if (!stored) return null;
    return stored;
  }

  /** Decrypt an encrypted key value */
  decryptKey(encrypted: string): Uint8Array {
    const data = Buffer.from(encrypted, 'base64');
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const ciphertext = data.subarray(32);
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /** Delete a stored key */
  deleteKey(id: string): boolean {
    return this.store.delete(id);
  }

  /** List all stored keys (metadata only, no key material) */
  listKeys(): Omit<StoredKey, 'encrypted'>[] {
    return Array.from(this.store.values()).map(({ encrypted, ...rest }) => rest);
  }

  /** Create a new session with permissions */
  createSession(userId: string, permissions: string[]): Session {
    const id = randomBytes(16).toString('hex');
    const session: Session = {
      id,
      userId,
      permissions,
      expiresAt: Date.now() + this.sessionTtlMs,
    };
    this.sessions.set(id, session);
    return session;
  }

  /** Validate a session token */
  validateSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  /** Revoke a session */
  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  private encrypt(data: Uint8Array): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { ciphertext, iv, authTag };
  }
}
