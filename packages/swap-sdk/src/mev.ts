/**
 * MEV Protection — Private RPC execution helpers.
 *
 * Sends transactions through Flashbots Protect, Eden Network, or other
 * private RPC endpoints to bypass the public mempool and protect
 * against frontrunning, sandwich attacks, and other MEV exploits.
 *
 * Supported private RPC providers:
 * - Flashbots Protect: https://rpc.flashbots.net
 * - Eden Network:     https://api.edennetwork.io/v1/rpc
 * - Manifold:         https://rpc.manifoldfinance.com
 */

import type {
  WalletClient,
  PublicClient,
  Transport,
  Chain,
  Account,
} from "viem";
import type { SwapTransaction, PrivateRpcConfig } from "./types.js";

// ============================================================
// Constants
// ============================================================

export const FLASHBOTS_RPC_URL = "https://rpc.flashbots.net";
export const FLASHBOTS_FAST_RPC_URL = "https://rpc.flashbots.net/fast";
export const EDEN_RPC_URL = "https://api.edennetwork.io/v1/rpc";

/**
 * Known private RPC provider identifiers.
 */
export type PrivateRpcProvider = "flashbots" | "flashbots-fast" | "eden" | "custom";

// ============================================================
// resolvePrivateRpcUrl
// ============================================================

/**
 * Resolve a provider name or config into a concrete RPC URL.
 */
export function resolvePrivateRpcUrl(
  provider: PrivateRpcProvider,
  customUrl?: string,
): string {
  switch (provider) {
    case "flashbots":
      return FLASHBOTS_RPC_URL;
    case "flashbots-fast":
      return FLASHBOTS_FAST_RPC_URL;
    case "eden":
      return EDEN_RPC_URL;
    case "custom":
      if (!customUrl) {
        throw new Error("Custom private RPC requires a URL");
      }
      return customUrl;
    default:
      throw new Error(`Unknown private RPC provider: ${provider}`);
  }
}

// ============================================================
// sendViaPrivateRpc
// ============================================================

/**
 * Send a transaction through a private RPC endpoint.
 *
 * Flow:
 * 1. Build and sign the transaction using the walletClient
 * 2. Submit the raw signed transaction to the private RPC
 * 3. Return the transaction hash
 *
 * The private RPC provider handles inclusion protection
 * (no public mempool exposure).
 */
export async function sendViaPrivateRpc(
  tx: SwapTransaction,
  walletClient: WalletClient<Transport, Chain, Account>,
  privateRpcUrl: string,
  options?: {
    apiKey?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    publicClient?: PublicClient<Transport, Chain>;
  },
): Promise<`0x${string}`> {
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelayMs = options?.retryDelayMs ?? 1000;

  // Get gas price and nonce
  let gasPrice: bigint;
  let nonce: number;

  if (options?.publicClient) {
    gasPrice = await options.publicClient.getGasPrice();
    nonce = await options.publicClient.getTransactionCount({
      address: walletClient.account.address,
      blockTag: "pending",
    });
  } else {
    // Fallback: reasonable defaults (user should provide publicClient in production)
    gasPrice = 20_000_000_000n;
    nonce = 0;
  }

  // Build and sign the transaction
  // Use gasPrice (legacy) to avoid EIP-1559 conflicts with signTransaction
  const signedTx = await walletClient.signTransaction({
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gas: tx.gasLimit,
    gasPrice,
    nonce,
  });

  // Submit to private RPC with retries
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (options?.apiKey) {
        headers["Authorization"] = `Bearer ${options.apiKey}`;
      }

      const res = await fetch(privateRpcUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_sendRawTransaction",
          params: [signedTx],
          id: 1,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Private RPC HTTP ${res.status}: ${body}`);
      }

      const result = await res.json();

      if (result.error) {
        throw new Error(`Private RPC error: ${result.error.message} (code: ${result.error.code})`);
      }

      return result.result as `0x${string}`;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError || new Error("Private RPC send failed after retries");
}

// ============================================================
// waitForTxReceiptViaRpc
// ============================================================

/**
 * Poll for a transaction receipt via direct RPC request.
 * Useful when you don't have a PublicClient handy and
 * need to confirm a transaction sent via private RPC.
 */
export async function waitForTxReceiptViaRpc(
  txHash: `0x${string}`,
  rpcUrl: string,
  options?: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    apiKey?: string;
  },
): Promise<{
  status: "success" | "reverted";
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 1_000;
  const startTime = Date.now();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.apiKey) {
    headers["Authorization"] = `Bearer ${options.apiKey}`;
  }

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers,
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
            txHash,
          };
        }
      }
    } catch {
      // Receipt not yet available, retry
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Transaction receipt timeout after ${timeoutMs}ms for ${txHash}`);
}

// ============================================================
// buildLegacyTxRequest
// ============================================================

/**
 * Build a legacy transaction request from a SwapTransaction.
 * Used for signing with gasPrice (legacy tx type).
 */
export function buildLegacyTxRequest(
  tx: SwapTransaction,
  gasPrice: bigint,
  nonce: number,
): {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gas: bigint;
  gasPrice: bigint;
  nonce: number;
} {
  return {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gas: tx.gasLimit,
    gasPrice,
    nonce,
  };
}
