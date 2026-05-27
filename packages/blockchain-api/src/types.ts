/** Shared type definitions for the blockchain-api package. */

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

/** On-chain token balance with optional USD pricing. */
export interface Balance {
  /** ERC-20 contract address (undefined for native token). */
  tokenAddress?: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Raw on-chain balance (in smallest unit / wei). */
  balance: bigint;
  /** Human-readable balance string. */
  formatted: string;
  /** Token logo URL (if available). */
  logo?: string;
  /** Current USD price per unit. */
  priceUsd?: number;
  /** USD value of this balance. */
  valueUsd?: number;
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

/** Simplified transaction record. */
export interface Transaction {
  hash: string;
  from: string;
  to?: string;
  /** Transfer value in wei. */
  value: bigint;
  status: "success" | "failed" | "pending";
  blockNumber?: number;
  /** Unix timestamp of the block (if available). */
  timestamp?: number;
  /** Gas consumed. */
  gasUsed?: bigint;
  /** Decoded function name (if available). */
  method?: string;
  /** Chain ID where the transaction occurred. */
  chainId?: number;
  /** Transaction type ("native" | "erc20" | "nft"). */
  type?: "native" | "erc20" | "nft";
  /** Token address for ERC-20 transfers. */
  tokenAddress?: string;
  /** Token amount for ERC-20/NFT transfers (in smallest unit). */
  tokenValue?: bigint;
  /** Formatted token amount. */
  formattedValue?: string;
  /** Gas price in wei. */
  gasPrice?: bigint;
  /** Transaction fee in wei. */
  fee?: bigint;
  /** Block hash. */
  blockHash?: string;
  /** Transaction index in the block. */
  transactionIndex?: number;
  /** Nonce of the sender. */
  nonce?: number;
  /** Input data (raw). */
  input?: string;
}

// ---------------------------------------------------------------------------
// Transaction history query parameters
// ---------------------------------------------------------------------------

/** Parameters for querying transaction history. */
export interface TransactionHistoryQuery {
  /** Wallet address to query transactions for. */
  address: string;
  /** List of chain IDs to query (default: [1, 137, 56] = ETH, Polygon, BSC). */
  chainIds?: number[];
  /** Maximum number of transactions per chain (default: 20). */
  limit?: number;
  /** Pagination cursor (block number or hash from previous response). */
  cursor?: string;
  /** Filter by transaction type. */
  type?: "native" | "erc20" | "nft";
  /** Only include transactions involving this token address. */
  tokenAddress?: string;
  /** Unix timestamp — only include transactions after this time. */
  timeFrom?: number;
  /** Unix timestamp — only include transactions before this time. */
  timeTo?: number;
  /** Filter by status. */
  status?: "success" | "failed" | "pending";
  /** Sort order ("desc" = newest first, "asc" = oldest first). */
  sortOrder?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Transaction history cache
// ---------------------------------------------------------------------------

/** Cache entry for transaction history. */
export interface TransactionCacheEntry {
  /** Cached transactions. */
  transactions: Transaction[];
  /** Timestamp when the entry was cached. */
  cachedAt: number;
  /** Cursor for next page. */
  nextCursor?: string;
  /** Whether there are more transactions. */
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Token metadata
// ---------------------------------------------------------------------------

/** ERC-20 token information. */
export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  totalSupply?: bigint;
}

// ---------------------------------------------------------------------------
// NFT
// ---------------------------------------------------------------------------

/** NFT portfolio item. */
export interface NFTItem {
  contractAddress: string;
  tokenId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  tokenType?: "ERC721" | "ERC1155";
  balance?: bigint; // ERC-1155 quantity
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Generic paginated result. */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Configuration for `BlockchainApiClient`. */
export interface BlockchainApiConfig {
  /**
   * RPC URL keyed by chain id.
   * Falls back to viem default public clients if omitted.
   */
  rpcUrls?: Record<number, string>;
  /** Optional ENS resolver address override (per-chain). */
  ensResolvers?: Record<number, `0x${string}`>;
  /** Base URL for metadata services (price, logo, etc.). */
  metadataBaseUrl?: string;
  /** Default chain id for calls that omit `chainId`. */
  defaultChainId?: number;
  /** Optional Alchemy API key for transaction history indexing. */
  alchemyApiKey?: string;
  /** Optional Covalent (GoldRush) API key for transaction history. */
  covalentApiKey?: string;
}
