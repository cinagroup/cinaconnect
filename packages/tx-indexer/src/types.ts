/**
 * Types for @cinacoin/tx-indexer
 */

import type { Address, Hash, Hex } from 'viem';

// ---------------------------------------------------------------------------
// Indexed Event
// ---------------------------------------------------------------------------

/** Canonical event type that maps to on-chain signatures. */
export type EventType = 'transfer' | 'swap' | 'deposit' | 'withdrawal';

/** A single indexed blockchain event. */
export interface IndexedEvent {
  id: string;
  chainId: number;
  eventType: EventType;
  blockNumber: number;
  timestamp: number;
  transactionHash: Hash;
  logIndex: number;
  fromAddress: Address;
  toAddress: Address;
  tokenAddress?: Address;
  amount: bigint;
  formattedAmount: string;
  decimals: number;
  symbol?: string;
  raw: Hex;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export interface EventQuery {
  /** Wallet address to filter by (either fromAddress or toAddress). */
  address?: Address;
  /** Filter by chain ID. */
  chainId?: number;
  /** Filter by event type. */
  eventType?: EventType;
  /** Filter by token address. */
  tokenAddress?: Address;
  /** Unix timestamp — start of range (inclusive). */
  timeFrom?: number;
  /** Unix timestamp — end of range (inclusive). */
  timeTo?: number;
  /** Minimum block number. */
  blockFrom?: number;
  /** Maximum block number. */
  blockTo?: number;
  /** Page size (default 50, max 200). */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
  /** Sort order: 'desc' (newest first, default) or 'asc'. */
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEvents {
  events: IndexedEvent[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Chain Config
// ---------------------------------------------------------------------------

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  /** Block to start indexing from (default: current - 10000). */
  startBlock?: number;
  /** Polling interval in ms (default: 12000). */
  pollIntervalMs?: number;
  /** Block batch size for scanning (default: 500). */
  batchSize?: number;
}

export interface IndexerConfig {
  /** Path to the SQLite database file. */
  dbPath: string;
  /** Chains to index. */
  chains: ChainConfig[];
  /** Whether to start indexing automatically on init. */
  autoStart?: boolean;
  /** Known token addresses with metadata for faster formatting. */
  knownTokens?: Record<number, Record<string, { symbol: string; decimals: number }>>;
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

export interface RestApiConfig {
  port: number;
  host?: string;
  /** Base path prefix (default: '/api/v1'). */
  basePath?: string;
}

export interface ApiHealthStatus {
  status: 'ok' | 'syncing' | 'error';
  indexedChains: {
    chainId: number;
    name: string;
    latestIndexedBlock: number;
    chainHeadBlock: number;
    lag: number;
    lastUpdated: number;
  }[];
  totalEvents: number;
  uptime: number;
}

// ---------------------------------------------------------------------------
// ABI Definitions
// ---------------------------------------------------------------------------

/** Minimal ERC-20 ABI for Transfer event decoding. */
export const ERC20_TRANSFER_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

/** Minimal Uniswap V2 ABI for Swap event decoding. */
export const UNISWAP_V2_SWAP_ABI = [
  {
    type: 'event',
    name: 'Swap',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'amount0In', type: 'uint256', indexed: false },
      { name: 'amount1In', type: 'uint256', indexed: false },
      { name: 'amount0Out', type: 'uint256', indexed: false },
      { name: 'amount1Out', type: 'uint256', indexed: false },
      { name: 'to', type: 'address', indexed: true },
    ],
  },
] as const;

/** Common deposit/withdrawal event signatures. */
export const BRIDGE_DEPOSIT_ABI = [
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const BRIDGE_WITHDRAWAL_ABI = [
  {
    type: 'event',
    name: 'Withdrawal',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
