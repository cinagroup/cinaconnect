/**
 * @cinacoin/cross-chain-sync
 *
 * Cinacoin Cross-Chain Account Sync — unified state and identity across
 * EVM/Solana/BTC/TON/TRON/Polkadot.
 *
 * @example
 * ```ts
 * import {
 *   StateSync,
 *   CrossChainIdentityManager,
 *   syncEvmState,
 *   InMemoryStorage,
 * } from '@cinacoin/cross-chain-sync';
 *
 * const storage = new InMemoryStorage();
 * const sync = new StateSync(storage);
 *
 * // Register EVM adapter
 * sync.registerAdapter('evm', async () => {
 *   return syncEvmState({
 *     chain: 'evm',
 *     chainId: 1,
 *     address: '0x...',
 *     addedAt: Date.now(),
 *   }, storage);
 * });
 * ```
 */

// Types
export type {
  ChainFamily,
  ChainAccount,
  CrossChainState,
  SessionState,
  SyncResult,
  LinkingProof,
  StateStorage,
} from "./types.js";

export type { UnifiedIdentity } from "./identity.js";
export type { EvmAccount } from "./adapters/evm.js";
export type { SolanaAccount } from "./adapters/solana.js";
export type { BitcoinAccount } from "./adapters/bitcoin.js";

// Sync
export { StateSync } from "./sync.js";

// Identity
export {
  CrossChainIdentityManager,
  generateIdentityHash,
  verifyLinkingProof,
  createLinkingProof,
} from "./identity.js";

// Adapters
export { syncEvmState, getEvmSession } from "./adapters/evm.js";
export { syncSolanaState, getSolanaSession } from "./adapters/solana.js";
export { syncBitcoinState, getBitcoinSession } from "./adapters/bitcoin.js";

// Storage
export { InMemoryStorage, LocalStorage } from "./storage.js";
