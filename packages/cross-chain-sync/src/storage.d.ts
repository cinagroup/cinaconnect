/**
 * State Storage Abstraction
 *
 * Provides a pluggable storage backend for cross-chain state.
 */
import type { StateStorage } from "./types.js";
/**
 * In-memory storage implementation (for testing and server-side use).
 */
export declare class InMemoryStorage implements StateStorage {
    private store;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * LocalStorage implementation (for browser use).
 */
export declare class LocalStorage implements StateStorage {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=storage.d.ts.map