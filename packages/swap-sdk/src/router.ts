/**
 * Smart Router — Best price selection across DEX providers.
 *
 * The SwapRouter manages executor lifecycle, caches quotes,
 * and provides a unified interface for fetching and executing swaps.
 */

import type {
  Address,
  WalletClient,
  PublicClient,
  Transport,
  Chain,
  Account,
} from "viem";
import type {
  BestQuote,
  SwapQuote,
  SwapQuoteParams,
  SwapReceipt,
  SwapTransaction,
  TokenInfo,
  SwapExecuteParams,
} from "./types.js";
import type { SwapQuoter } from "./quoter.js";
import { calculateMinimumReceived } from "./slippage.js";
import { ensureAllowance } from "./approve.js";

// ============================================================
// Optional GasEstimator Integration
// ============================================================

/**
 * Minimal interface compatible with @cinacoin/gas-estimator's GasEstimator.
 * Allows the swap SDK to fetch real EIP-1559 gas prices without a hard dependency.
 */
export interface GasEstimatorLike {
  getEip1559GasPrices(chainId: number): Promise<{
    baseFee: bigint;
    priorityFee: bigint;
    gasPrice: bigint;
  }>;
}

// ============================================================
// Executor Interface
// ============================================================

/**
 * Interface that all DEX executors must implement.
 */
export interface SwapExecutor {
  /** Unique executor name */
  name: string;
  /** Whether this executor is currently available */
  isAvailable(): Promise<boolean>;
  /** Get a swap quote */
  getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
  /** Get encoded transaction data for execution */
  getTransaction(quote: SwapQuote, slippageBps: number): Promise<SwapTransaction>;
  /**
   * Execute a swap transaction on-chain via viem WalletClient.
   *
   * @param tx The transaction data to send
   * @param walletClient viem WalletClient for signing and sending
   * @returns Transaction hash
   */
  executeTransaction(
    tx: SwapTransaction,
    walletClient: WalletClient<Transport, Chain, Account>,
  ): Promise<`0x${string}`>;
  /** Get supported tokens on a chain */
  getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
}

// ============================================================
// RouterExecuteParams (legacy alias — use SwapExecuteParams from types.js)
// ============================================================

/**
 * @deprecated Use `SwapExecuteParams` from `./types.js` instead.
 * Kept for backward compatibility.
 */
export interface RouterExecuteParams {
  /** The quote to execute */
  quote: SwapQuote;
  /** Override slippage (defaults to quote's original) */
  slippageBps?: number;
  /** Max gas price to accept (wei) */
  maxGasPrice?: bigint;
  /** Transaction timeout (ms) */
  timeoutMs?: number;
}

// ============================================================
// SwapRouter
// ============================================================

export class SwapRouter {
  private quoter: SwapQuoter;
  private executors: SwapExecutor[];
  private executionEnabled: boolean;
  private gasEstimator: GasEstimatorLike | null;

  constructor(quoter: SwapQuoter, executors?: SwapExecutor[], options?: { gasEstimator?: GasEstimatorLike }) {
    this.quoter = quoter;
    this.executors = executors ?? [];
    this.executionEnabled = false;
    this.gasEstimator = options?.gasEstimator ?? null;
  }

  /**
   * Set a gas estimator for real gas price fetching during execution.
   */
  setGasEstimator(estimator: GasEstimatorLike | null): void {
    this.gasEstimator = estimator;
  }

  /**
   * Register executors for execution resolution.
   * This enables the router to look up the correct executor by provider name.
   */
  setExecutors(executors: SwapExecutor[]): void {
    this.executors = executors;
  }

  /**
   * Get the best quote across all providers.
   */
  async getBestQuote(params: SwapQuoteParams): Promise<BestQuote> {
    return this.quoter.getBestQuote(params);
  }

  /**
   * Compare quotes from all providers.
   */
  async compareQuotes(params: SwapQuoteParams): Promise<SwapQuote[]> {
    const best = await this.getBestQuote(params);
    return best.allQuotes;
  }

  /**
   * Enable or disable swap execution.
   * When disabled, only quotes are returned (dry-run mode).
   */
  setExecutionEnabled(enabled: boolean): void {
    this.executionEnabled = enabled;
  }

  /**
   * Execute a swap with the best available quote.
   *
   * @param params Swap parameters
   * @param executeParams Execution configuration (must include walletClient)
   * @returns Swap receipt
   */
  async executeSwap(
    params: SwapQuoteParams,
    executeParams: SwapExecuteParams,
  ): Promise<SwapReceipt> {
    if (!this.executionEnabled) {
      throw new Error("Swap execution is disabled. Call setExecutionEnabled(true) first.");
    }

    if (!executeParams.walletClient) {
      throw new Error("walletClient is required for swap execution");
    }

    const best = await this.getBestQuote(params);
    const slippageBps = executeParams.slippageBps ?? params.slippageBps;

    // Validate quote freshness
    if (Date.now() > best.quote.expiresAt) {
      throw new Error("Quote has expired. Please request a new quote.");
    }

    // Slippage check: verify the quote's minimum received is within tolerance
    const minimumReceived = calculateMinimumReceived(best.quote.toAmount, slippageBps);
    if (best.quote.minimumReceived < minimumReceived) {
      throw new Error(
        `Quote minimum received (${best.quote.minimumReceived}) is below the configured slippage threshold (${minimumReceived})`,
      );
    }

    // Determine which executor handles this quote
    const executor = this.getExecutorForProvider(best.quote.provider);
    if (!executor) {
      throw new Error(`No executor found for provider: ${best.quote.provider}`);
    }

    // ERC-20 approval: check allowance before swap
    let approveTxHash: `0x${string}` | undefined;
    if (best.quote.fromToken !== "native" && executeParams.publicClient) {
      // Determine the spender (DEX router / aggregator contract)
      const spender = best.quote.tx?.to ?? this.getSpenderFromProvider(best.quote.provider);

      if (spender) {
        const approval = await ensureAllowance(
          best.quote.fromToken,
          spender,
          best.quote.fromAmount,
          executeParams.walletClient,
          executeParams.publicClient,
          { approveExact: executeParams.approveExact ?? false },
        );

        if (approval.approved) {
          approveTxHash = approval.txHash!;

          // Wait for approve to be mined before proceeding with swap
          await executeParams.publicClient.waitForTransactionReceipt({
            hash: approveTxHash,
            timeout: executeParams.timeoutMs ?? 60_000,
          });
        }
      }
    }

    // Get the transaction data from the executor
    const tx = await executor.getTransaction(best.quote, slippageBps);

    // Apply value override if provided
    const txValue = executeParams.valueOverride ?? tx.value;

    // MEV protection: use private RPC if requested
    let txHash: `0x${string}`;
    if (executeParams.usePrivateRpc) {
      if (!executeParams.privateRpc?.url) {
        throw new Error("privateRpc.url is required when usePrivateRpc is true");
      }
      txHash = await this.sendViaPrivateRpc(
        tx,
        txValue,
        executeParams.walletClient,
        executeParams.publicClient,
        executeParams.privateRpc.url,
        executeParams.privateRpc.apiKey,
      );
    } else {
      // Gas price check: use gas estimator if available, fall back to publicClient
      let currentGasPrice: bigint | undefined;
      if (this.gasEstimator) {
        const prices = await this.gasEstimator.getEip1559GasPrices(best.quote.chainId);
        currentGasPrice = prices.gasPrice;
      } else if (executeParams.publicClient) {
        currentGasPrice = await executeParams.publicClient.getGasPrice();
      }

      if (executeParams.maxGasPrice && currentGasPrice !== undefined) {
        if (currentGasPrice > executeParams.maxGasPrice) {
          throw new Error(
            `Current gas price (${currentGasPrice}) exceeds max (${executeParams.maxGasPrice})`,
          );
        }
      }
      txHash = await executor.executeTransaction(tx, executeParams.walletClient);
    }

    // Wait for transaction confirmation and build receipt
    const receipt = await this.waitForReceipt(executeParams, txHash);

    return {
      txHash,
      quoteId: best.quote.id,
      fromAmount: best.quote.fromAmount,
      toAmount: best.quote.toAmount,
      gasUsed: BigInt(receipt.gasUsed),
      gasPrice: receipt.effectiveGasPrice ?? 0n,
      blockNumber: BigInt(receipt.blockNumber),
      success: receipt.status === "success",
      approveTxHash,
    };
  }

  /**
   * Get the executor responsible for a given provider.
   */
  private getExecutorForProvider(provider: string): SwapExecutor | undefined {
    return this.executors.find((e) => e.name === provider);
  }

  /**
   * Resolve the spender address (DEX router / aggregator contract) for a provider.
   * Used for allowance checks before swap execution.
   */
  private getSpenderFromProvider(provider: string): Address | undefined {
    // Map provider names to their known spender addresses (mainnet defaults)
    // In production, these should be chain-aware and executor-derived
    const SPENDERS: Record<string, Address> = {
      uniswap: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
      "1inch": "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch Aggregation Router v5
      "0x": "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x Exchange Proxy
    };
    return SPENDERS[provider];
  }

  /**
   * Send a transaction via a private RPC endpoint (Flashbots Protect / Eden).
   * This bypasses the public mempool to protect against MEV.
   */
  private async sendViaPrivateRpc(
    tx: SwapTransaction,
    value: bigint,
    walletClient: WalletClient<Transport, Chain, Account>,
    publicClient: PublicClient<Transport, Chain> | undefined,
    privateRpcUrl: string,
    apiKey?: string,
  ): Promise<`0x${string}`> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Get gas price and nonce via public client or direct RPC
    let gasPrice: bigint;
    let nonce: number;

    if (publicClient) {
      gasPrice = await publicClient.getGasPrice();
      nonce = await publicClient.getTransactionCount({
        address: walletClient.account.address,
        blockTag: "pending",
      });
    } else {
      // Fallback: use raw RPC requests
      gasPrice = await (walletClient as any).getGasPrice?.() ?? 20_000_000_000n;
      nonce = 0; // Would need raw RPC call in production
    }

    // Sign the transaction
    const signedTx = await walletClient.signTransaction({
      to: tx.to,
      value: value,
      data: tx.data,
      gas: tx.gasLimit,
      gasPrice,
      nonce,
    });

    // Send via eth_sendRawTransaction to private RPC
    const sendRes = await fetch(privateRpcUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [signedTx],
        id: 1,
      }),
    });

    if (!sendRes.ok) {
      throw new Error(`Private RPC send failed: ${sendRes.status} ${sendRes.statusText}`);
    }

    const result = await sendRes.json();
    if (result.error) {
      throw new Error(`Private RPC error: ${result.error.message}`);
    }

    return result.result as `0x${string}`;
  }

  /**
   * Wait for a transaction receipt.
   */
  private async waitForReceipt(
    executeParams: SwapExecuteParams,
    txHash: `0x${string}`,
    timeoutMs?: number,
  ): Promise<{
    status: "success" | "reverted";
    gasUsed: bigint;
    effectiveGasPrice: bigint;
    blockNumber: bigint;
  }> {
    const timeout = timeoutMs ?? executeParams.timeoutMs ?? 60_000;
    const startTime = Date.now();

    // Use publicClient if available (proper viem API)
    if (executeParams.publicClient) {
      const receipt = await executeParams.publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: timeout,
      });

      return {
        status: receipt.status,
        gasUsed: BigInt(receipt.gasUsed),
        effectiveGasPrice: receipt.effectiveGasPrice ?? 0n,
        blockNumber: BigInt(receipt.blockNumber),
      };
    }

    // Fallback: manual polling via raw RPC
    while (Date.now() - startTime < timeout) {
      try {
        const rpcUrl =
          executeParams.privateRpc?.url ?? "https://eth-rpc.example.com";
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: [txHash],
            id: 1,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          const receipt = result.result;

          if (receipt) {
            return {
              status: receipt.status === "0x1" ? "success" : "reverted",
              gasUsed: BigInt(receipt.gasUsed),
              effectiveGasPrice: BigInt(receipt.effectiveGasPrice || "0x0"),
              blockNumber: BigInt(receipt.blockNumber),
            };
          }
        }
      } catch {
        // Receipt not yet available, retry
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Transaction receipt timeout after ${timeout}ms for ${txHash}`);
  }

  /**
   * Get supported tokens from all providers for a chain.
   */
  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    const tokenSets = await Promise.all(
      this.quoter.getAvailableProviders().map(async (_name) => {
        // Token lists would be fetched per-provider
        return [] as TokenInfo[];
      }),
    );

    // Deduplicate by address
    const tokenMap = new Map<string, TokenInfo>();
    for (const tokens of tokenSets.flat()) {
      tokenMap.set(tokens.address.toLowerCase(), tokens);
    }

    return Array.from(tokenMap.values());
  }

  /**
   * Calculate price impact for a given swap.
   */
  async getPriceImpact(params: SwapQuoteParams): Promise<number> {
    const best = await this.getBestQuote(params);
    return best.quote.priceImpact;
  }
}
