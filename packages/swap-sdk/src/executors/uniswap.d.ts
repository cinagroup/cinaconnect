/**
 * Uniswap V3/V4 Executor
 *
 * Provides swap quotes and execution via Uniswap V3 and V4 pools.
 * Uses the Uniswap Quoter contract for off-chain price estimation.
 */
import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapTransaction, TokenInfo } from "../types.js";
export declare class UniswapExecutor implements SwapExecutor {
    readonly name = "uniswap";
    private quoterAddress;
    private routerAddress;
    private rpcUrl;
    constructor(options?: {
        rpcUrl?: string;
        version?: "v3" | "v4";
    });
    isAvailable(): Promise<boolean>;
    getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
    getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction>;
    getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
}
//# sourceMappingURL=uniswap.d.ts.map