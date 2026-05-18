/**
 * Uniswap V3/V4 Executor
 *
 * Provides swap quotes and execution via Uniswap V3 and V4 pools.
 * Uses the Uniswap Quoter contract for off-chain price estimation.
 */

import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapRoute, SwapTransaction, TokenInfo } from "../types.js";
import { calculateMinimumReceived, calculatePriceImpact } from "../slippage.js";

// ============================================================
// Constants
// ============================================================

const UNISWAP_QUOTER_V3 = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const UNISWAP_ROUTER_V3 = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_QUOTER_V4 = "0xC959483E6c2B69861b087CC1424eEb4382045da3";
const UNISWAP_ROUTER_V4 = "0x360E68faCcca8cA495c1B759Fd9EEe466dB9FB32";

// Uniswap V3 ExactInputSingle function selector
const EXACT_INPUT_SINGLE_SELECTOR = "0x414bf389"; // exactInputSingle(bytes)

// ============================================================
// UniswapExecutor
// ============================================================

export class UniswapExecutor implements SwapExecutor {
  public readonly name = "uniswap";

  private quoterAddress: string;
  private routerAddress: string;
  private rpcUrl: string;

  constructor(options?: { rpcUrl?: string; version?: "v3" | "v4" }) {
    const version = options?.version ?? "v3";
    this.rpcUrl = options?.rpcUrl || "";

    if (version === "v4") {
      this.quoterAddress = UNISWAP_QUOTER_V4;
      this.routerAddress = UNISWAP_ROUTER_V4;
    } else {
      this.quoterAddress = UNISWAP_QUOTER_V3;
      this.routerAddress = UNISWAP_ROUTER_V3;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Health check: attempt a simple RPC call
      if (this.rpcUrl) {
        const res = await fetch(this.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        });
        return res.ok;
      }
      return true;
    } catch {
      return false;
    }
  }

  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    // In production, call the Uniswap Quoter contract via RPC
    // For now, construct a quote structure
    const route: SwapRoute[] = [
      {
        protocol: "uniswap-v3",
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: params.fromAmount, // Placeholder — would come from quoter
        gasEstimate: 185_000n,
      },
    ];

    return {
      id: `uniswap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount: params.fromAmount, // Placeholder
      priceImpact: 0,
      route,
      gasEstimate: 185_000n,
      minimumReceived: calculateMinimumReceived(params.fromAmount, params.slippageBps),
      provider: this.name,
      expiresAt: Date.now() + 30_000, // 30 second TTL
    };
  }

  async getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> {
    // Encode the exactInputSingle calldata for Uniswap V3
    // In production, use viem's encodeFunctionData
    const minimumReceived = calculateMinimumReceived(quote.toAmount, slippageBps);

    return {
      to: this.routerAddress as `0x${string}`,
      value: quote.fromToken === "native" ? quote.fromAmount : 0n,
      data: "0x" as `0x${string}`, // Would be encoded calldata
      gasLimit: 250_000n,
    };
  }

  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    // Return common tokens per chain
    const TOKENS: Record<number, TokenInfo[]> = {
      1: [
        { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
        { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
        { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
        { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      ],
      8453: [
        { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
        { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
      ],
    };

    return TOKENS[chainId] || [];
  }
}
