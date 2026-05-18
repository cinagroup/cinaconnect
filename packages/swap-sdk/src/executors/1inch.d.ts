/**
 * 1inch API Executor
 *
 * Provides swap quotes and execution via the 1inch Aggregation Protocol API.
 * Documentation: https://docs.1inch.io/docs/aggregation-protocol/introduction
 */
import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapTransaction, TokenInfo } from "../types.js";
export declare class OneInchExecutor implements SwapExecutor {
    readonly name = "1inch";
    private apiKey;
    private apiVersion;
    constructor(apiKey: string, version?: string);
    isAvailable(): Promise<boolean>;
    getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
    getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction>;
    getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
    private resolveAddress;
    private fromApiAddress;
    private getChainId;
}
//# sourceMappingURL=1inch.d.ts.map