/**
 * 0x Protocol Executor
 *
 * Provides swap quotes and execution via the 0x API v2.
 * Documentation: https://0x.org/docs/api
 */

import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapRoute, SwapTransaction, TokenInfo } from "../types.js";
import { calculateMinimumReceived } from "../slippage.js";
import type {
  WalletClient,
  Transport,
  Chain,
  Account,
} from "viem";

// ============================================================
// Constants
// ============================================================

const ZEROX_API_BASE = "https://api.0x.org";
const ZEROX_NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

// ============================================================
// 0x API Response Types
// ============================================================

interface ZeroxQuoteResponse {
  sellAmount: string;
  buyAmount: string;
  allowanceTarget: string;
  to: string;
  data: string;
  value: string;
  estimatedGas: string;
  gasPrice: string;
  price: string;
  guaranteedPrice: string;
  sources: Array<{ name: string; proportion: string }>;
  buyTokenAddress: string;
  sellTokenAddress: string;
}

// ============================================================
// ZeroxExecutor
// ============================================================

export class ZeroxExecutor implements SwapExecutor {
  public readonly name = "0x";

  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey: string, options?: { timeoutMs?: number }) {
    this.apiKey = apiKey;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${ZEROX_API_BASE}/swap/v1/quote`, {
        method: "POST",
        headers: {
          "0x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellToken: "USDC",
          buyToken: "WETH",
          sellAmount: "1000000",
        }),
      });
      return res.ok || res.status === 400; // 400 is fine (validation error means API is up)
    } catch {
      return false;
    }
  }

  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const url = new URL(`${ZEROX_API_BASE}/swap/v1/quote`);
    url.searchParams.set("chainId", params.chainId.toString());
    url.searchParams.set("sellToken", this.resolveAddress(params.fromToken));
    url.searchParams.set("buyToken", this.resolveAddress(params.toToken));
    url.searchParams.set("sellAmount", params.fromAmount.toString());

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url.toString(), {
          headers: { "0x-api-key": this.apiKey },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`0x quote failed: ${res.status} ${res.statusText} — ${body}`);
        }

        const data: ZeroxQuoteResponse = await res.json();
        return this.buildQuoteFromResponse(params, data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.message.includes("4")) break;
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("0x quote failed after retries");
  }

  /**
   * Build a SwapQuote from a 0x API response.
   */
  private buildQuoteFromResponse(
    params: SwapQuoteParams,
    data: ZeroxQuoteResponse,
  ): SwapQuote {
    const toAmount = BigInt(data.buyAmount);

    const route: SwapRoute[] = data.sources.map((source) => ({
      protocol: source.name,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount,
      gasEstimate: BigInt(data.estimatedGas),
    }));

    if (route.length === 0) {
      route.push({
        protocol: "0x",
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount,
        gasEstimate: BigInt(data.estimatedGas),
      });
    }

    return {
      id: `0x-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount,
      priceImpact: 0,
      route,
      gasEstimate: BigInt(data.estimatedGas),
      minimumReceived: calculateMinimumReceived(toAmount, params.slippageBps),
      provider: this.name,
      expiresAt: Date.now() + 30_000,
      chainId: params.chainId,
    };
  }

  async getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> {
    const chainId = quote.chainId || 1;
    const url = new URL(`${ZEROX_API_BASE}/swap/v1/quote`);
    url.searchParams.set("chainId", chainId.toString());
    url.searchParams.set("sellToken", this.resolveAddress(quote.fromToken));
    url.searchParams.set("buyToken", this.resolveAddress(quote.toToken));
    url.searchParams.set("sellAmount", quote.fromAmount.toString());
    url.searchParams.set("slippagePercentage", (slippageBps / 10_000).toString());

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url.toString(), {
          headers: { "0x-api-key": this.apiKey },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`0x transaction failed: ${res.status} ${res.statusText} — ${body}`);
        }

        const data: ZeroxQuoteResponse = await res.json();

        return {
          to: data.to as `0x${string}`,
          value: BigInt(data.value),
          data: data.data as `0x${string}`,
          gasLimit: BigInt(data.estimatedGas),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("0x transaction failed after retries");
  }

  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    // 0x doesn't have a direct tokens endpoint; use metadata from quotes
    // In production, maintain a token list or use a separate service
    return [];
  }

  /**
   * Execute a 0x swap transaction on-chain.
   *
   * The 0x API returns a fully-formed transaction in getTransaction().
   * We send it via viem walletClient.sendTransaction.
   */
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

  private resolveAddress(token: string | `0x${string}`): string {
    return token === "native" ? ZEROX_NATIVE : token;
  }
}
