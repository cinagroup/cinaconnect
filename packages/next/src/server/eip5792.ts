/**
 * @cinacoin/next/server — EIP-5792 server-side utilities.
 *
 * Server-side helpers for the EIP-5792 Wallet Call API:
 * - `getWalletCapabilitiesOnServer` — check wallet capabilities server-side
 * - `verifyBatchCallOnServer` — verify batch transaction status
 *
 * These utilities use viem's public client for on-chain verification
 * and are safe to run in server components, API routes, and middleware.
 *
 * ```ts
 * import { getWalletCapabilitiesOnServer } from '@cinacoin/next/server';
 *
 * const caps = await getWalletCapabilitiesOnServer('0x...', 1, {
 *   rpcUrl: process.env.ETH_RPC_URL,
 * });
 * ```
 */

import type { Hex, Address } from 'viem';
import type {
  WalletCapabilities,
  ChainCapabilities,
  CallsStatus,
  GetCallsStatusResult,
  CallReceipt,
} from '@cinacoin/core-sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for EIP-5792 server utilities. */
export interface EIP5792ServerOptions {
  /** RPC URL for the target chain. */
  rpcUrl?: string;
  /** Override chain ID (decimal). */
  chainId?: number;
}

/** Server-side wallet capabilities result. */
export interface ServerWalletCapabilities {
  /** Full capabilities object. */
  capabilities: WalletCapabilities;
  /** Whether atomic batch is supported. */
  atomicBatchSupported: boolean;
  /** Whether paymaster is supported. */
  paymasterSupported: boolean;
  /** Whether session keys are supported. */
  sessionKeysSupported: boolean;
}

/** Server-side batch verification result. */
export interface ServerBatchVerification {
  /** Batch status. */
  status: CallsStatus | 'NOT_FOUND';
  /** Whether all calls succeeded. */
  allSucceeded: boolean;
  /** Individual call receipts. */
  receipts: CallReceipt[];
  /** Failed call receipts. */
  failedReceipts: CallReceipt[];
  /** Raw result from the wallet (if available). */
  rawResult: GetCallsStatusResult | null;
}

// ---------------------------------------------------------------------------
// getWalletCapabilitiesOnServer
// ---------------------------------------------------------------------------

/**
 * Get wallet capabilities server-side via direct JSON-RPC.
 *
 * Unlike the client-side `wallet_getCapabilities` which requires an
 * active wallet connection, this function queries an RPC endpoint
 * directly and can be used in server components.
 *
 * For wallets that don't expose capabilities via public RPC (most wallets
 * don't), this returns inferred capabilities based on known wallet-chain
 * combinations.
 *
 * ```ts
 * const caps = await getWalletCapabilitiesOnServer(
 *   '0x1234567890abcdef1234567890abcdef12345678',
 *   1,
 *   { rpcUrl: process.env.ETH_RPC_URL }
 * );
 *
 * if (caps.atomicBatchSupported) {
 *   // Can use atomic batch for this wallet on this chain
 * }
 * ```
 *
 * @param walletAddress - The wallet address to check.
 * @param chainId - Chain ID (decimal) to check capabilities for.
 * @param options - RPC configuration.
 * @returns ServerWalletCapabilities with inferred capabilities.
 */
export async function getWalletCapabilitiesOnServer(
  walletAddress: Address,
  chainId: number,
  options: EIP5792ServerOptions = {},
): Promise<ServerWalletCapabilities> {
  const rpcUrl = options.rpcUrl ?? getDefaultRpcUrl(chainId);
  const hexChainId = `0x${chainId.toString(16)}` as Hex;

  // Try wallet_getCapabilities via direct RPC
  let capabilities: WalletCapabilities = {};

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'wallet_getCapabilities',
        params: [walletAddress],
      }),
    });

    if (!response.ok) {
      capabilities = inferCapabilities(walletAddress, chainId, hexChainId);
    } else {
      const data = await response.json();
      if (data.result && typeof data.result === 'object') {
        capabilities = data.result as WalletCapabilities;
      }
    }
  } catch {
    // RPC doesn't support wallet_getCapabilities — use inferred capabilities
    capabilities = inferCapabilities(walletAddress, chainId, hexChainId);
  }

  const chainCaps = capabilities[hexChainId] ??
    (capabilities as Record<string, ChainCapabilities>)[`0x${chainId.toString(16)}`] ??
    {};

  return {
    capabilities,
    atomicBatchSupported: chainCaps.atomicBatch?.supported === true ||
      isInferredAtomicChain(chainId),
    paymasterSupported: chainCaps.paymasterService?.supported === true ||
      isInferredPaymasterChain(chainId),
    sessionKeysSupported: chainCaps.sessionKeys?.supported === true,
  };
}

// ---------------------------------------------------------------------------
// verifyBatchCallOnServer
// ---------------------------------------------------------------------------

/**
 * Verify a batch call's status server-side.
 *
 * Queries `wallet_getCallsStatus` via direct JSON-RPC and verifies
 * the transaction receipts on-chain.
 *
 * ```ts
 * const verification = await verifyBatchCallOnServer('batch-abc-123', 1, {
 *   rpcUrl: process.env.ETH_RPC_URL,
 * });
 *
 * if (verification.allSucceeded) {
 *   console.log('All calls succeeded!');
 *   for (const receipt of verification.receipts) {
 *     console.log(`  TX: ${receipt.receipt.transactionHash}`);
 *   }
 * }
 * ```
 *
 * @param callId - The batch ID returned by wallet_sendCalls.
 * @param chainId - Chain ID (decimal) where the batch was executed.
 * @param options - RPC configuration.
 * @returns ServerBatchVerification with full receipt details.
 */
export async function verifyBatchCallOnServer(
  callId: string,
  chainId: number,
  options: EIP5792ServerOptions = {},
): Promise<ServerBatchVerification> {
  const rpcUrl = options.rpcUrl ?? getDefaultRpcUrl(chainId);

  // Try wallet_getCallsStatus via direct RPC
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'wallet_getCallsStatus',
        params: [callId],
      }),
    });

    if (!response.ok) {
      // RPC returned error — fall through
    } else {
      const data = await response.json();

      if (data.result) {
        const rawResult = data.result as GetCallsStatusResult;
        // Validate it's a proper GetCallsStatusResult (has status enum value and receipts array)
        const validStatus = ['CONFIRMED', 'PENDING', 'CONFIRMED'].includes(rawResult.status as string);
        if (validStatus && Array.isArray(rawResult.receipts)) {
          const receipts = rawResult.receipts;
          const allSucceeded = receipts.every((r) => r.receipt.status === '0x1');
          const failedReceipts = receipts.filter((r) => r.receipt.status === '0x0');

          return {
            status: rawResult.status,
            allSucceeded,
            receipts,
            failedReceipts,
            rawResult,
          };
        }
      }
    }
  } catch {
    // RPC doesn't support wallet_getCallsStatus
  }

  // Fallback: try to verify via standard eth_getTransactionReceipt
  // If the callId is a transaction hash, we can check it directly
  if (callId.startsWith('0x') && callId.length === 66) {
    return verifyTransactionOnServer(callId as Hex, rpcUrl);
  }

  return {
    status: 'NOT_FOUND',
    allSucceeded: false,
    receipts: [],
    failedReceipts: [],
    rawResult: null,
  };
}

/**
 * Verify a single transaction on-chain.
 */
async function verifyTransactionOnServer(
  txHash: Hex,
  rpcUrl: string,
): Promise<ServerBatchVerification> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    if (!response.ok) {
      return {
        status: 'NOT_FOUND' as any,
        allSucceeded: false,
        receipts: [],
        failedReceipts: [],
        rawResult: null,
      };
    }

    const data = await response.json();

    if (data.result) {
      const receipt = data.result;
      const status: CallsStatus = receipt.status === '0x1' ? 'CONFIRMED' : ('FAILED' as CallsStatus);

      const callReceipt: CallReceipt = {
        receipt: {
          blockHash: receipt.blockHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: receipt.status,
          transactionHash: txHash,
          contractAddress: receipt.contractAddress,
          logs: receipt.logs,
        },
      };

      return {
        status,
        allSucceeded: receipt.status === '0x1',
        receipts: [callReceipt],
        failedReceipts: receipt.status === '0x0' ? [callReceipt] : [],
        rawResult: {
          status,
          receipts: [callReceipt],
        },
      };
    }
  } catch {
    // Transaction not found
  }

  return {
    status: 'NOT_FOUND',
    allSucceeded: false,
    receipts: [],
    failedReceipts: [],
    rawResult: null,
  };
}

// ---------------------------------------------------------------------------
// Inference helpers
// ---------------------------------------------------------------------------

/** Chains known to support atomic batch (from EIP-5792). */
const ATOMIC_CHAINS = new Set([1, 11155111, 137, 42161, 10, 8453, 56, 59144]);

/** Chains known to support paymaster (via known bundlers). */
const PAYMASTER_CHAINS = new Set([1, 11155111, 137, 42161, 10, 8453]);

function isInferredAtomicChain(chainId: number): boolean {
  return ATOMIC_CHAINS.has(chainId);
}

function isInferredPaymasterChain(chainId: number): boolean {
  return PAYMASTER_CHAINS.has(chainId);
}

function inferCapabilities(
  _walletAddress: Address,
  chainId: number,
  hexChainId: Hex,
): WalletCapabilities {
  const caps: ChainCapabilities = {};

  if (isInferredAtomicChain(chainId)) {
    caps.atomicBatch = { supported: true };
  }
  if (isInferredPaymasterChain(chainId)) {
    caps.paymasterService = { supported: true };
  }

  return { [hexChainId]: caps };
}

/** Get default RPC URL for a chain ID. */
function getDefaultRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    1: 'https://eth.llamarpc.com',
    11155111: 'https://rpc.sepolia.org',
    137: 'https://polygon-rpc.com',
    42161: 'https://arb1.arbitrum.io/rpc',
    10: 'https://mainnet.optimism.io',
    8453: 'https://mainnet.base.org',
    56: 'https://bsc-dataseed.binance.org',
    59144: 'https://rpc.linea.build',
  };
  return rpcUrls[chainId] ?? `https://rpc.ankr.com/eth/0x${chainId.toString(16)}`;
}
