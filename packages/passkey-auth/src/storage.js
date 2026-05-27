/**
 * In-memory passkey storage implementation.
 * For production, replace with a persistent storage backend.
 */
export class MemoryStorage {
    constructor() {
        this.store = new Map();
    }
    async save(credential) {
        this.store.set(credential.id, { ...credential });
    }
    async load(id) {
        return this.store.get(id) ?? null;
    }
    async list() {
        return [...this.store.values()];
    }
    async remove(id) {
        return this.store.delete(id);
    }
    async clear() {
        this.store.clear();
    }
}
/**
 * localStorage-based passkey storage for browser environments.
 */
export class BrowserStorage {
    constructor(prefix = 'cinacoin:passkey:') {
        this.prefix = prefix;
    }
    async save(credential) {
        localStorage.setItem(`${this.prefix}${credential.id}`, JSON.stringify(credential));
    }
    async load(id) {
        const raw = localStorage.getItem(`${this.prefix}${id}`);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    async list() {
        const results = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    results.push(JSON.parse(raw));
                }
            }
        }
        return results;
    }
    async remove(id) {
        const exists = localStorage.getItem(`${this.prefix}${id}`) !== null;
        if (exists) {
            localStorage.removeItem(`${this.prefix}${id}`);
        }
        return exists;
    }
    async clear() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        keys.forEach((k) => localStorage.removeItem(k));
    }
}
export const defaultStorage = typeof localStorage !== 'undefined'
    ? new BrowserStorage()
    : new MemoryStorage();
//# sourceMappingURL=storage.js.map