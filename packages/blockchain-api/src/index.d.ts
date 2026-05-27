/**
 * @cinacoin/blockchain-api — public API surface.
 *
 * Provides a `BlockchainApiClient` for reading on-chain data
 * (balances, transactions, ENS, tokens, NFTs) via viem and
 * the @cinacoin/core-sdk transport layer.
 */
export type { Balance, Transaction, TokenMetadata, NFTItem, PaginatedResult, BlockchainApiConfig, } from "./types.js";
export { BlockchainApiClient, createBlockchainApi } from "./client.js";
//# sourceMappingURL=index.d.ts.map