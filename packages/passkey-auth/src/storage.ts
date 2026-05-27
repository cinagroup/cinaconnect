import type { PasskeyConfig, PasskeyStorage } from './types.js';

/**
 * In-memory passkey storage implementation.
 * For production, replace with a persistent storage backend.
 */
export class MemoryStorage implements PasskeyStorage {
  private store = new Map<string, import('./types.js').StoredPasskey>();

  async save(credential: import('./types.js').StoredPasskey): Promise<void> {
    this.store.set(credential.id, { ...credential });
  }

  async load(id: string): Promise<import('./types.js').StoredPasskey | null> {
    return this.store.get(id) ?? null;
  }

  async list(): Promise<import('./types.js').StoredPasskey[]> {
    return [...this.store.values()];
  }

  async remove(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * localStorage-based passkey storage for browser environments.
 */
export class BrowserStorage implements PasskeyStorage {
  private prefix: string;

  constructor(prefix = 'cinacoin:passkey:') {
    this.prefix = prefix;
  }

  async save(credential: import('./types.js').StoredPasskey): Promise<void> {
    localStorage.setItem(
      `${this.prefix}${credential.id}`,
      JSON.stringify(credential),
    );
  }

  async load(id: string): Promise<import('./types.js').StoredPasskey | null> {
    const raw = localStorage.getItem(`${this.prefix}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as import('./types.js').StoredPasskey;
  }

  async list(): Promise<import('./types.js').StoredPasskey[]> {
    const results: import('./types.js').StoredPasskey[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          results.push(
            JSON.parse(raw) as import('./types.js').StoredPasskey,
          );
        }
      }
    }
    return results;
  }

  async remove(id: string): Promise<boolean> {
    const exists = localStorage.getItem(`${this.prefix}${id}`) !== null;
    if (exists) {
      localStorage.removeItem(`${this.prefix}${id}`);
    }
    return exists;
  }

  async clear(): Promise<void> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  }
}

export const defaultStorage =
  typeof localStorage !== 'undefined'
    ? new BrowserStorage()
    : new MemoryStorage();
