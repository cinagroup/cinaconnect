/**
 * 1inch API Executor
 *
 * Provides swap quotes and execution via the 1inch Aggregation Protocol API.
 * Documentation: https://docs.1inch.io/docs/aggregation-protocol/introduction
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

const ONEINCH_API_BASE = "https://api.1inch.dev/swap";
const ONEINCH_TOKENS_BASE = "https://api.1inch.dev/token";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

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
// Response Validation
// ============================================================

const HEX_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function isValidHexAddress(addr: unknown): addr is string {
  return typeof addr === "string" && HEX_ADDRESS_RE.test(addr);
}

function isPositiveBigIntString(val: unknown): val is string {
  if (typeof val !== "string") return false;
  try {
    const n = BigInt(val);
    return n > 0n;
  } catch {
    return false;
  }
}

/**
 * Validate a 1inch quote API response.
 * Throws a descriptive error on invalid or missing fields.
 */
function validateQuoteResponse(data: unknown): OneInchQuoteResponse {
  if (!data || typeof data !== "object") {
    throw new Error("1inch API: expected object response for quote, got " + typeof data);
  }
  const d = data as Record<string, unknown>;

  if (!isPositiveBigIntString(d.dstAmount)) {
    throw new Error(
      "1inch API: invalid or missing dstAmount in quote response (expected positive numeric string)"
    );
  }

  if (!Array.isArray(d.protocols)) {
    // protocols may legitimately be empty array — that's ok
    return { dstAmount: d.dstAmount as string, protocols: [] };
  }

  const protocols = d.protocols.map((p: unknown, i: number) => {
    if (!p || typeof p !== "object") {
      throw new Error(`1inch API: protocols[${i}] is not an object`);
    }
    const pp = p as Record<string, unknown>;
    if (typeof pp.name !== "string") {
      throw new Error(`1inch API: protocols[${i}].name is missing or not a string`);
    }
    if (typeof pp.part !== "number" || pp.part < 0 || pp.part > 100) {
      throw new Error(`1inch API: protocols[${i}].part is invalid (expected 0-100)`);
    }
    if (!isValidHexAddress(pp.fromTokenAddress)) {
      throw new Error(`1inch API: protocols[${i}].fromTokenAddress is not a valid hex address`);
    }
    if (!isValidHexAddress(pp.toTokenAddress)) {
      throw new Error(`1inch API: protocols[${i}].toTokenAddress is not a valid hex address`);
    }
    return pp as OneInchQuoteResponse["protocols"][number];
  });

  return { dstAmount: d.dstAmount as string, protocols };
}

/**
 * Validate a 1inch swap API response.
 * Throws a descriptive error on invalid or missing fields.
 */
function validateSwapResponse(data: unknown): OneInchSwapResponse {
  if (!data || typeof data !== "object") {
    throw new Error("1inch API: expected object response for swap, got " + typeof data);
  }
  const d = data as Record<string, unknown>;

  // Validate tx object
  if (!d.tx || typeof d.tx !== "object") {
    throw new Error("1inch API: missing or invalid tx object in swap response");
  }
  const tx = d.tx as Record<string, unknown>;

  if (!isValidHexAddress(tx.to)) {
    throw new Error("1inch API: tx.to is not a valid hex address");
  }
  if (typeof tx.data !== "string" || !tx.data.startsWith("0x")) {
    throw new Error("1inch API: tx.data is missing or not a valid hex string");
  }
  if (typeof tx.value !== "string") {
    throw new Error("1inch API: tx.value is missing or not a string");
  }
  if (typeof tx.gas !== "number" || tx.gas <= 0) {
    throw new Error("1inch API: tx.gas is invalid (expected positive number)");
  }

  if (!isPositiveBigIntString(d.dstAmount)) {
    throw new Error(
      "1inch API: invalid or missing dstAmount in swap response (expected positive numeric string)"
    );
  }

  return {
    tx: {
      from: (tx.from as string) ?? "",
      to: tx.to as string,
      data: tx.data as string,
      value: tx.value as string,
      gas: tx.gas as number,
      gasPrice: (tx.gasPrice as string) ?? "0",
    },
    dstAmount: d.dstAmount as string,
  };
}

// ============================================================
// OneInchExecutor
// ============================================================

export class OneInchExecutor implements SwapExecutor {
  public readonly name = "1inch";

  private apiKey: string;
  private apiVersion: string;
  private timeoutMs: number;

  constructor(apiKey: string, options?: { version?: string; timeoutMs?: number }) {
    this.apiKey = apiKey;
    this.apiVersion = options?.version ?? "6.0";
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`1inch quote failed: ${res.status} ${res.statusText} — ${body}`);
        }

        const raw = await res.json();
        const data = validateQuoteResponse(raw);
        return this.buildQuoteFromResponse(params, data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on client errors (4xx)
        if (lastError.message.includes("4")) break;

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("1inch quote failed after retries");
  }

  /**
   * Build a SwapQuote from a 1inch API response.
   */
  private buildQuoteFromResponse(
    params: SwapQuoteParams,
    data: OneInchQuoteResponse,
  ): SwapQuote {
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
      id: `1inch-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
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
      chainId: params.chainId,
    };
  }

  async getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction> {
    const chainId = quote.chainId || this.getChainId(quote);
    const url = new URL(
      `${ONEINCH_API_BASE}/v${this.apiVersion}/${chainId}/swap`,
    );
    url.searchParams.set("src", this.resolveAddress(quote.fromToken));
    url.searchParams.set("dst", this.resolveAddress(quote.toToken));
    url.searchParams.set("amount", quote.fromAmount.toString());
    url.searchParams.set("from", quote.route[0]?.fromToken || "");
    url.searchParams.set("slippage", (slippageBps / 100).toString());

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`1inch swap failed: ${res.status} ${res.statusText} — ${body}`);
        }

        const raw = await res.json();
        const data = validateSwapResponse(raw);

        return {
          to: data.tx.to as `0x${string}`,
          value: BigInt(data.tx.value),
          data: data.tx.data as `0x${string}`,
          gasLimit: BigInt(data.tx.gas),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("1inch swap transaction failed after retries");
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
    return (Object.values(data.tokens) as Array<Record<string, unknown>>).map((t) => ({
      address: t.address as `0x${string}`,
      symbol: t.symbol as string,
      name: t.name as string,
      decimals: t.decimals as number,
      logoURI: t.logoURI as string | undefined,
    }));
  }

  /**
   * Execute a 1inch swap transaction on-chain.
   *
   * The 1inch API returns a fully-formed transaction in getTransaction().
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
