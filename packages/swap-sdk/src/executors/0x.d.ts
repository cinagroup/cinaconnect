/**
 * 0x Protocol Executor
 *
 * Provides swap quotes and execution via the 0x API v2.
 * Documentation: https://0x.org/docs/api
 */
import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapTransaction, TokenInfo } from "../types.js";
export declare class ZeroxExecutor implements SwapExecutor {
    readonly name = "0x";
    private apiKey;
    constructor(apiKey: string);
    isAvailable(): Promise<boolean>;
    getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
    getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction>;
    getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
    private resolveAddress;
}
//# sourceMappingURL=0x.d.ts.map