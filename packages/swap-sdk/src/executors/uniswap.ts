/**
 * Uniswap V3/V4 Executor
 *
 * Provides swap quotes and execution via Uniswap V3 and V4 pools.
 * Uses the Uniswap QuoterV2 contract for on-chain price estimation.
 */

import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapRoute, SwapTransaction, TokenInfo } from "../types.js";
import { calculateMinimumReceived } from "../slippage.js";
import type {
  WalletClient,
  PublicClient,
  Transport,
  Chain,
  Account,
} from "viem";
import { encodeFunctionData, zeroAddress } from "viem";

// ============================================================
// Constants
// ============================================================

const UNISWAP_QUOTER_V3 = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"; // QuoterV2 (mainnet)
const UNISWAP_ROUTER_V3 = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const UNISWAP_QUOTER_V4 = "0xC959483E6c2B69861b087CC1424eEb4382045da3";
const UNISWAP_ROUTER_V4 = "0x360E68faCcca8cA495c1B759Fd9EEe466dB9FB32";

// Uniswap V3 QuoterV2 ABI — quoteExactInputSingle
const QUOTER_V2_ABI = [
  {
    type: "function" as const,
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable" as const,
    inputs: [
      {
        type: "tuple" as const,
        name: "params",
        components: [
          { type: "address" as const, name: "tokenIn" },
          { type: "address" as const, name: "tokenOut" },
          { type: "uint256" as const, name: "amountIn" },
          { type: "uint24" as const, name: "fee" },
          { type: "uint160" as const, name: "sqrtPriceLimitX96" },
        ],
      },
    ],
    outputs: [
      { type: "uint256" as const, name: "amountOut" },
      { type: "uint160" as const, name: "sqrtPriceX96After" },
      { type: "uint32" as const, name: "initializedTicksCrossed" },
      { type: "uint256" as const, name: "gasEstimate" },
    ],
  },
];

// Uniswap V3 Router ABI
const UNISWAP_ROUTER_ABI = [
  {
    type: "function" as const,
    name: "exactInputSingle",
    stateMutability: "payable" as const,
    inputs: [
      {
        type: "tuple" as const,
        name: "params",
        components: [
          { type: "address" as const, name: "tokenIn" },
          { type: "address" as const, name: "tokenOut" },
          { type: "uint24" as const, name: "fee" },
          { type: "address" as const, name: "recipient" },
          { type: "uint256" as const, name: "amountIn" },
          { type: "uint256" as const, name: "amountOutMinimum" },
          { type: "uint160" as const, name: "sqrtPriceLimitX96" },
        ],
      },
    ],
    outputs: [{ type: "uint256" as const }],
  },
  {
    type: "function" as const,
    name: "exactInput",
    stateMutability: "payable" as const,
    inputs: [
      {
        type: "tuple" as const,
        name: "params",
        components: [
          { type: "bytes" as const, name: "path" },
          { type: "address" as const, name: "recipient" },
          { type: "uint256" as const, name: "amountIn" },
          { type: "uint256" as const, name: "amountOutMinimum" },
        ],
      },
    ],
    outputs: [{ type: "uint256" as const }],
  },
];

// Fee tiers commonly used in Uniswap V3
const FEE_TIERS = [500, 3000, 10000] as const;

// ============================================================
// UniswapExecutor
// ============================================================

export class UniswapExecutor implements SwapExecutor {
  public readonly name = "uniswap";

  private quoterAddress: string;
  private routerAddress: string;
  private rpcUrl: string;
  private publicClient: PublicClient<Transport, Chain> | null;

  constructor(options?: {
    rpcUrl?: string;
    version?: "v3" | "v4";
    publicClient?: PublicClient<Transport, Chain>;
  }) {
    const version = options?.version ?? "v3";
    this.rpcUrl = options?.rpcUrl || "";
    this.publicClient = options?.publicClient ?? null;

    if (version === "v4") {
      this.quoterAddress = UNISWAP_QUOTER_V4;
      this.routerAddress = UNISWAP_ROUTER_V4;
    } else {
      this.quoterAddress = UNISWAP_QUOTER_V3;
      this.routerAddress = UNISWAP_ROUTER_V3;
    }
  }

  /**
   * Set a PublicClient for on-chain quote fetching.
   */
  setPublicClient(client: PublicClient<Transport, Chain>): void {
    this.publicClient = client;
  }

  async isAvailable(): Promise<boolean> {
    try {
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
      return this.publicClient !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get a swap quote.
   *
   * If a publicClient is available, calls QuoterV2.quoteExactInputSingle
   * on-chain for real price data across multiple fee tiers. Falls back to
   * a placeholder quote if on-chain call is unavailable.
   */
  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    if (this.publicClient && params.fromToken !== "native" && params.toToken !== "native") {
      try {
        return await this.getQuoteOnChain(params);
      } catch (err) {
        console.warn(`Uniswap on-chain quote failed, falling back:`, err);
      }
    }

    // Fallback: construct a placeholder quote
    // When no on-chain quote is available, we return a structural quote
    // with toAmount = 0 (caller must verify before execution)
    const route: SwapRoute[] = [
      {
        protocol: "uniswap-v3",
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: 0n,
        gasEstimate: 185_000n,
      },
    ];

    return {
      id: `uniswap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount: 0n,
      priceImpact: 0,
      route,
      gasEstimate: 185_000n,
      minimumReceived: calculateMinimumReceived(0n, params.slippageBps),
      provider: this.name,
      expiresAt: Date.now() + 30_000,
      chainId: params.chainId,
    };
  }

  /**
   * Call QuoterV2.quoteExactInputSingle on-chain across fee tiers
   * to find the best price.
   */
  private async getQuoteOnChain(params: SwapQuoteParams): Promise<SwapQuote> {
    const tokenIn = params.fromToken === "native"
      ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`
      : params.fromToken;
    const tokenOut = params.toToken === "native"
      ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`
      : params.toToken;

    // Try each fee tier, pick the best output
    let bestAmountOut = 0n;
    let bestFee = 3000;
    let bestGasEstimate = 185_000n;

    for (const fee of FEE_TIERS) {
      try {
        const result = await this.publicClient!.readContract({
          address: this.quoterAddress as `0x${string}`,
          abi: QUOTER_V2_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn,
              tokenOut,
              amountIn: params.fromAmount,
              fee,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });

        const amountOut = result[0] as bigint;
        const gasEstimate = result[3] as bigint;

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestFee = fee;
          bestGasEstimate = gasEstimate;
        }
      } catch {
        // Pool may not exist for this fee tier; skip
        continue;
      }
    }

    if (bestAmountOut === 0n) {
      throw new Error("No liquidity found for this token pair on Uniswap V3");
    }

    const route: SwapRoute[] = [
      {
        protocol: `uniswap-v3-${bestFee}`,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount: bestAmountOut,
        gasEstimate: bestGasEstimate,
      },
    ];

    return {
      id: `uniswap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount: bestAmountOut,
      priceImpact: 0,
      route,
      gasEstimate: bestGasEstimate,
      minimumReceived: calculateMinimumReceived(bestAmountOut, params.slippageBps),
      provider: this.name,
      expiresAt: Date.now() + 30_000,
      chainId: params.chainId,
    };
  }

  async getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> {
    const minimumReceived = calculateMinimumReceived(quote.toAmount, slippageBps);
    const route = quote.route[0];
    if (!route) {
      throw new Error("No route found in quote for Uniswap execution");
    }

    const data = this.encodeUniswapCalldata(quote, route, slippageBps);

    return {
      to: this.routerAddress as `0x${string}`,
      value: quote.fromToken === "native" ? quote.fromAmount : 0n,
      data,
      gasLimit: quote.gasEstimate > 0n ? quote.gasEstimate * 12n / 10n : 250_000n, // 20% buffer
    };
  }

  async executeTransaction(
    tx: SwapTransaction,
    walletClient: WalletClient<Transport, Chain, Account>,
  ): Promise<`0x${string}`> {
    const txHash = await walletClient.sendTransaction({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gas: tx.gasLimit,
    });

    return txHash;
  }

  /**
   * Encode Uniswap V3 exactInputSingle calldata using viem's encodeFunctionData.
   */
  private encodeUniswapCalldata(
    quote: SwapQuote,
    route: SwapRoute,
    slippageBps: number,
  ): `0x${string}` {
    const minimumReceived = calculateMinimumReceived(quote.toAmount, slippageBps);

    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const fromToken = route.fromToken === "native" ? WETH : (route.fromToken as `0x${string}`);
    const toToken = route.toToken === "native" ? WETH : (route.toToken as `0x${string}`);

    if (quote.route.length === 1) {
      return encodeFunctionData({
        abi: UNISWAP_ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: fromToken,
            tokenOut: toToken,
            fee: this.extractFeeFromRoute(route) ?? 3000,
            recipient: quote.route[0].toToken === "native"
              ? quote.route[quote.route.length - 1].toToken === "native" ? zeroAddress : (quote.route[quote.route.length - 1].toToken as `0x${string}`)
              : route.toToken === "native" ? zeroAddress : (route.toToken as `0x${string}`),
            amountIn: quote.fromAmount,
            amountOutMinimum: minimumReceived,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
    } else {
      return this.encodeExactInputMultiHop(quote, minimumReceived);
    }
  }

  /**
   * Encode multi-hop exactInput calldata.
   */
  private encodeExactInputMultiHop(
    quote: SwapQuote,
    minimumReceived: bigint,
  ): `0x${string}` {
    let path = "";
    for (let i = 0; i < quote.route.length; i++) {
      const hop = quote.route[i];
      const token = (hop.fromToken as `0x${string}`).slice(2);
      path += token;
      if (i < quote.route.length - 1) {
        const fee = this.extractFeeFromRoute(hop) ?? 3000;
        path += fee.toString(16).padStart(6, "0");
      }
    }
    // Add final token
    const lastHop = quote.route[quote.route.length - 1];
    const lastToken = (lastHop.toToken as `0x${string}`).slice(2);
    path += lastToken;

    const lastRouteToken = quote.route[quote.route.length - 1].toToken;
    const recipient = lastRouteToken === "native" ? zeroAddress : (lastRouteToken as `0x${string}`);

    return encodeFunctionData({
      abi: UNISWAP_ROUTER_ABI,
      functionName: "exactInput",
      args: [
        {
          path: (`0x${path}` as `0x${string}`),
          recipient,
          amountIn: quote.fromAmount,
          amountOutMinimum: minimumReceived,
        },
      ],
    });
  }

  /**
   * Extract fee tier from a route protocol string (e.g., 'uniswap-v3-3000' → 3000).
   */
  private extractFeeFromRoute(route: { protocol: string }): number | null {
    const match = route.protocol.match(/-(\d{3,6})$/);
    return match ? parseInt(match[1], 10) : null;
  }

  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
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
