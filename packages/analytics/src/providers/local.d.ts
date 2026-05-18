/**
 * Local Storage Analytics Provider
 *
 * Stores analytics events in browser localStorage (or memory fallback).
 */
import type { AnalyticsEvent, AnalyticsProvider } from "./types.js";
export declare class LocalStorageProvider implements AnalyticsProvider {
    private events;
    constructor();
    track(event: AnalyticsEvent): Promise<void>;
    getEvents(): Promise<AnalyticsEvent[]>;
    clear(): Promise<void>;
    private persist;
}
/**
 * In-memory fallback provider for SSR testing.
 */
export declare class InMemoryProvider implements AnalyticsProvider {
    private events;
    track(event: AnalyticsEvent): Promise<void>;
    getEvents(): Promise<AnalyticsEvent[]>;
    clear(): Promise<void>;
}
//# sourceMappingURL=local.d.ts.map