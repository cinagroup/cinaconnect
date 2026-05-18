/**
 * 1inch API Executor
 *
 * Provides swap quotes and execution via the 1inch Aggregation Protocol API.
 * Documentation: https://docs.1inch.io/docs/aggregation-protocol/introduction
 */

import type { SwapExecutor } from "../router.js";
import type { SwapQuote, SwapQuoteParams, SwapRoute, SwapTransaction, TokenInfo } from "../types.js";
import { calculateMinimumReceived } from "../slippage.js";

// ============================================================
// Constants
// ============================================================

const ONEINCH_API_BASE = "https://api.1inch.dev/swap";
const ONEINCH_TOKENS_BASE = "https://api.1inch.dev/token";

// ============================================================
// 1inch API Response Types
// ============================================================

interface OneInchQuoteResponse {
  dstAmount: string;
  protocols: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
}

interface OneInchSwapResponse {
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
  dstAmount: string;
}

// ============================================================
// OneInchExecutor
// ============================================================

export class OneInchExecutor implements SwapExecutor {
  public readonly name = "1inch";

  private apiKey: string;
  private apiVersion: string;

  constructor(apiKey: string, version: string = "6.0") {
    this.apiKey = apiKey;
    this.apiVersion = version;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(
        `${ONEINCH_API_BASE}/v${this.apiVersion}/56/healthcheck`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const chainId = params.chainId;
    const url = new URL(
      `${ONEINCH_API_BASE}/v${this.apiVersion}/${chainId}/quote`,
    );
    url.searchParams.set("src", this.resolveAddress(params.fromToken));
    url.searchParams.set("dst", this.resolveAddress(params.toToken));
    url.searchParams.set("amount", params.fromAmount.toString());

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`1inch quote failed: ${res.status} ${res.statusText}`);
    }

    const data: OneInchQuoteResponse = await res.json();

    const toAmount = BigInt(data.dstAmount);

    const route: SwapRoute[] = data.protocols.map((p) => ({
      protocol: p.name,
      fromToken: this.fromApiAddress(p.fromTokenAddress),
      toToken: this.fromApiAddress(p.toTokenAddress),
      fromAmount: params.fromAmount,
      toAmount,
      gasEstimate: 200_000n,
    }));

    if (route.length === 0) {
      route.push({
        protocol: "1inch",
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        toAmount,
        gasEstimate: 200_000n,
      });
    }

    return {
      id: `1inch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      toAmount,
      priceImpact: 0,
      route,
      gasEstimate: 200_000n,
      minimumReceived: calculateMinimumReceived(toAmount, params.slippageBps),
      provider: this.name,
      expiresAt: Date.now() + 30_000,
    };
  }

  async getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> {
    const chainId = this.getChainId(quote);
    const url = new URL(
      `${ONEINCH_API_BASE}/v${this.apiVersion}/${chainId}/swap`,
    );
    url.searchParams.set("src", this.resolveAddress(quote.fromToken));
    url.searchParams.set("dst", this.resolveAddress(quote.toToken));
    url.searchParams.set("amount", quote.fromAmount.toString());
    url.searchParams.set("from", quote.route[0]?.fromToken || "");
    url.searchParams.set("slippage", (slippageBps / 100).toString());

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`1inch swap failed: ${res.status} ${res.statusText}`);
    }

    const data: OneInchSwapResponse = await res.json();

    return {
      to: data.tx.to as `0x${string}`,
      value: BigInt(data.tx.value),
      data: data.tx.data as `0x${string}`,
      gasLimit: BigInt(data.tx.gas),
    };
  }

  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    const res = await fetch(
      `${ONEINCH_TOKENS_BASE}/v1.2/${chainId}/tokens`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    return Object.values(data.tokens).map((t: any) => ({
      address: t.address as `0x${string}`,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoURI: t.logoURI,
    }));
  }

  // ============================================================
  // Helpers
  // ============================================================

  private resolveAddress(token: string | `0x${string}`): string {
    return token === "native" ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : token;
  }

  private fromApiAddress(addr: string): `0x${string}` | "native" {
    const native = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    return addr.toLowerCase() === native.toLowerCase() ? "native" : (addr as `0x${string}`);
  }

  private getChainId(quote: SwapQuote): number {
    // Infer from route or default
    return 1;
  }
}
