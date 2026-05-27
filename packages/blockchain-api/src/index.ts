/**
 * @cinacoin/blockchain-api — public API surface.
 *
 * Provides a `BlockchainApiClient` for reading on-chain data
 * (balances, transactions, ENS, tokens, NFTs) via viem and
 * the @cinacoin/core-sdk transport layer.
 */

export type {
  Balance,
  Transaction,
  TokenMetadata,
  NFTItem,
  PaginatedResult,
  BlockchainApiConfig,
  TransactionHistoryQuery,
  TransactionCacheEntry,
} from "./types.js";

export { BlockchainApiClient, createBlockchainApi } from "./client.js";
export { clearTxCached } from "./client.js";
