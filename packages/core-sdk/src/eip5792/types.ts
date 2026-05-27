/**
 * EIP-5792: Wallet Call API types.
 *
 * Defines the types for the Wallet Call API which enables
 * embedded wallet interactions including atomic batch calls,
 * capabilities discovery, and asynchronous call tracking.
 *
 * @see https://eips.ethereum.org/EIPS/eip-5792
 */

import type { Hex, Address } from 'viem';

// ---------------------------------------------------------------------------
// Client Abstraction
// ---------------------------------------------------------------------------

/** Minimal EIP-5792 client interface — any object with a JSON-RPC request method. */
export interface EIP5792Client {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Capability information for a specific chain. */
export interface ChainCapabilities {
  /** Whether the wallet supports paymaster service. */
  paymasterService?: {
    supported: boolean;
  };
  /** Whether the wallet supports session keys. */
  sessionKeys?: {
    supported: boolean;
  };
  /** Whether the wallet supports atomic batch transactions. */
  atomicBatch?: {
    supported: boolean;
  };
  /** Whether the wallet supports deferred calls. */
  deferred?: {
    supported: boolean;
  };
}

/** Wallet capabilities keyed by chain ID (hex string). */
export interface WalletCapabilities {
  [chainId: Hex]: ChainCapabilities;
}

// ---------------------------------------------------------------------------
// Calls (EIP-5792)
// ---------------------------------------------------------------------------

/** A single call within a batch. */
export interface Call {
  /** Destination contract address. */
  to: Address;
  /** ETH value to send (in wei, hex string). */
  value?: Hex;
  /** Calldata / function selector + args (hex string). */
  data?: Hex;
  /** Optional call identifier for status tracking. */
  id?: string;
}

/** Parameters for wallet_sendCalls. */
export interface SendCallsParams {
  /** Semantic version string, e.g. "1.0.0". */
  version: string;
  /** Array of calls to execute atomically or sequentially. */
  calls: Call[];
  /** Chain ID (hex string) on which to execute calls. */
  chainId?: Hex;
  /** Account address initiating the calls. */
  from: Address;
  /** Optional capabilities (paymaster, session keys, etc.). */
  capabilities?: WalletCapabilities;
}

/** Response from wallet_sendCalls. */
export interface SendCallsResult {
  /** Opaque batch identifier for status polling. */
  id: string;
}

// ---------------------------------------------------------------------------
// Call Status (EIP-5792)
// ---------------------------------------------------------------------------

/** Status of an individual call within a batch. */
export interface CallReceipt {
  /** Call identifier (matches the `id` in the Call). */
  id?: string;
  /** Transaction receipt for this call. */
  receipt: {
    /** Block hash. */
    blockHash?: Hex;
    /** Block number. */
    blockNumber?: Hex;
    /** Gas used. */
    gasUsed?: Hex;
    /** Status: "0x1" = success, "0x0" = failure. */
    status: Hex;
    /** Transaction hash. */
    transactionHash: Hex;
    /** Contract address created (if applicable). */
    contractAddress?: Address | null;
    /** Logs from this transaction. */
    logs?: Array<{
      address: Address;
      data: Hex;
      topics: Hex[];
    }>;
  };
}

/** Possible states for a batch of calls. */
export type CallsStatus = 'PENDING' | 'CONFIRMED';

/** Response from wallet_getCallsStatus. */
export interface GetCallsStatusResult {
  /** Current status of the batch. */
  status: CallsStatus;
  /** Receipts for individual calls (only when CONFIRMED). */
  receipts?: CallReceipt[];
}

// ---------------------------------------------------------------------------
// Capabilities RPC types
// ---------------------------------------------------------------------------

/** Parameters for wallet_getCapabilities (none — returns wallet's own caps). */
export interface GetCapabilitiesParams {
  /** Account address to query capabilities for. */
  address: Address;
}

// ---------------------------------------------------------------------------
// Atomic batch builder
// ---------------------------------------------------------------------------

/** Configuration for atomic batch transaction builder. */
export interface AtomicBatchConfig {
  /** Chain ID (hex) for the batch. */
  chainId: Hex;
  /** Sender address. */
  from: Address;
  /** Calls to include in the batch. */
  calls: Call[];
  /** Optional capabilities. */
  capabilities?: WalletCapabilities;
  /** If true, simulate the batch before sending. */
  simulate?: boolean;
  /** EIP-5792 version string. */
  version?: string;
}

/** Result of building an atomic batch. */
export interface AtomicBatchResult {
  /** The SendCallsParams ready to pass to wallet_sendCalls. */
  params: SendCallsParams;
  /** Estimated gas for the entire batch (if simulated). */
  estimatedGas?: Hex;
  /** Whether all calls are atomic on this chain. */
  isAtomic: boolean;
}
