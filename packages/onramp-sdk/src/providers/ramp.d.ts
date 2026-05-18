/**
 * Ramp Provider
 *
 * Integration with Ramp Network's on-ramp API and widget.
 * Documentation: https://ramp.network/
 */
import type { OnRampProviderAdapter } from "../aggregator.js";
import type { OnRampProvider, OnRampQuote, OnRampQuoteParams, OnRampWidgetParams } from "../types.js";
export interface RampConfig {
    /** Ramp partner ID / API key */
    apiKey: string;
    /** Partner name for branding */
    partnerName?: string;
}
export declare class RampProvider implements OnRampProviderAdapter {
    readonly id = "ramp";
    private config;
    constructor(config: RampConfig);
    getProviderInfo(): OnRampProvider;
    getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>;
    getWidgetUrl(params: OnRampWidgetParams): string;
    private estimateQuote;
}
//# sourceMappingURL=ramp.d.ts.map