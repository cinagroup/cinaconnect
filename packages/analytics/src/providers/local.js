/**
 * Local Storage Analytics Provider
 *
 * Stores analytics events in browser localStorage (or memory fallback).
 */
const STORAGE_KEY = "cinacoin-analytics-events";
const MAX_EVENTS = 1000;
export class LocalStorageProvider {
    constructor() {
        this.events = [];
        // Try to load from localStorage if available
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.events = JSON.parse(raw);
            }
        }
        catch {
            // localStorage not available (SSR), use in-memory
        }
    }
    async track(event) {
        this.events.push(event);
        // Keep only the most recent events
        if (this.events.length > MAX_EVENTS) {
            this.events = this.events.slice(-MAX_EVENTS);
        }
        this.persist();
    }
    async getEvents() {
        return [...this.events];
    }
    async clear() {
        this.events = [];
        this.persist();
    }
    persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
        }
        catch {
            // localStorage not available
        }
    }
}
/**
 * In-memory fallback provider for SSR testing.
 */
export class InMemoryProvider {
    constructor() {
        this.events = [];
    }
    async track(event) {
        this.events.push(event);
    }
    async getEvents() {
        return [...this.events];
    }
    async clear() {
        this.events = [];
    }
}
//# sourceMappingURL=local.js.map