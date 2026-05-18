/**
 * Transak Provider
 *
 * Integration with Transak's on-ramp API and widget.
 * Documentation: https://docs.transak.com/
 */
import type { OnRampProviderAdapter } from "../aggregator.js";
import type { OnRampProvider, OnRampQuote, OnRampQuoteParams, OnRampWidgetParams } from "../types.js";
export interface TransakConfig {
    /** Transak API key */
    apiKey: string;
    /** Environment */
    environment: "sandbox" | "production";
}
export declare class TransakProvider implements OnRampProviderAdapter {
    readonly id = "transak";
    private config;
    constructor(config: TransakConfig);
    getProviderInfo(): OnRampProvider;
    getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>;
    getWidgetUrl(params: OnRampWidgetParams): string;
    private estimateQuote;
}
//# sourceMappingURL=transak.d.ts.map