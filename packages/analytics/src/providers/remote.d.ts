/**
 * Remote Analytics Provider
 *
 * Sends analytics events to a remote endpoint.
 */
import type { AnalyticsEvent, AnalyticsProvider } from "./types.js";
export interface RemoteProviderConfig {
    /** Remote endpoint URL */
    endpoint: string;
    /** API key for authentication */
    apiKey?: string;
    /** Batch size before sending */
    batchSize?: number;
    /** Flush interval in ms */
    flushInterval?: number;
}
export declare class RemoteProvider implements AnalyticsProvider {
    private config;
    private queue;
    private flushTimer;
    private allEvents;
    constructor(config: RemoteProviderConfig);
    track(event: AnalyticsEvent): Promise<void>;
    /**
     * Flush pending events to the remote endpoint.
     */
    flush(): Promise<void>;
    getEvents(): Promise<AnalyticsEvent[]>;
    clear(): Promise<void>;
}
//# sourceMappingURL=remote.d.ts.map