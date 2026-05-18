/**
 * On-Ramp Aggregator — Fetches quotes from multiple fiat-to-crypto providers
 * and selects the best one based on cost, speed, and user preferences.
 *
 * Supported providers: MoonPay, Ramp, Transak, Stripe, Coinbase.
 */
import type { OnRampQuote, OnRampQuoteParams, OnRampProvider, OnRampResult, OnRampWidgetParams, UserPreferences } from "./types.js";
export interface OnRampProviderAdapter {
    /** Provider ID */
    id: string;
    /** Get provider metadata */
    getProviderInfo(): OnRampProvider;
    /** Get a quote for the given parameters */
    getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>;
    /** Get the widget URL for a quote */
    getWidgetUrl(params: OnRampWidgetParams): string;
}
export interface AggregatorConfig {
    /** Maximum time to wait for all quotes (ms) */
    quoteTimeoutMs: number;
    /** Default user region */
    defaultRegion: string;
    /** Cache TTL for provider info (ms) */
    providerInfoTTL: number;
}
export declare class OnRampAggregator {
    private providers;
    private config;
    constructor(config?: Partial<AggregatorConfig>);
    /**
     * Register a provider adapter.
     */
    registerProvider(provider: OnRampProviderAdapter): void;
    /**
     * Unregister a provider by ID.
     */
    unregisterProvider(id: string): void;
    /**
     * Get all registered providers.
     */
    getProviders(region?: string): OnRampProvider[];
    /**
     * Fetch quotes from all available providers concurrently.
     */
    getQuotes(params: OnRampQuoteParams): Promise<OnRampQuote[]>;
    /**
     * Get the best quote based on user preferences.
     *
     * Selection priority:
     * 1. Lowest total cost
     * 2. Shortest delivery time
     * 3. Preferred payment method match
     */
    getBestQuote(params: OnRampQuoteParams, preferences?: UserPreferences): Promise<OnRampQuote | null>;
    /**
     * Sort quotes by preference.
     */
    private sortQuotes;
    /**
     * Get the widget URL for the best available quote.
     */
    getWidgetUrl(params: OnRampWidgetParams): string | null;
    /**
     * Handle the result of a widget session.
     */
    handleWidgetResult(result: OnRampResult): void;
}
//# sourceMappingURL=aggregator.d.ts.map