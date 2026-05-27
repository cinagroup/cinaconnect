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
// Sync
export { StateSync } from "./sync.js.js";
// Identity
export { CrossChainIdentityManager, generateIdentityHash, verifyLinkingProof, createLinkingProof, } from "./identity.js.js";
// Adapters
export { syncEvmState, getEvmSession } from "./adapters/evm.js.js";
export { syncSolanaState, getSolanaSession } from "./adapters/solana.js.js";
export { syncBitcoinState, getBitcoinSession } from "./adapters/bitcoin.js.js";
// Storage
export { InMemoryStorage, LocalStorage } from "./storage.js.js";
//# sourceMappingURL=index.js.map