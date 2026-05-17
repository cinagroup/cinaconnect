/**
 * @onchainux/siwx — Sign-In with Cross-chain (SIWX)
 *
 * Unified authentication across EVM (EIP-4361), Solana (ed25519),
 * and Bitcoin (BIP-322) chains.
 *
 * @packageDocumentation
 */

// Core SIWX functions
export { createSignInMessage, verifySignIn, SIWXAdapter, SIWXRegistry, defaultRegistry } from './siwx.js';

// Chain adapters
export {
  createEvmSignInMessage,
  verifyEvmSignature,
  parseEvmMessage,
} from './chains/evm.js';

export {
  createSolanaSignInMessage,
  verifySolanaSignature,
  parseSolanaMessage,
} from './chains/solana.js';

export {
  createBitcoinSignInMessage,
  verifyBitcoinSignature,
  parseBitcoinMessage,
} from './chains/bitcoin.js';

// Types
export type {
  ChainType,
  SIWXParams,
  SIWXResult,
  SIWXFormatOptions,
  SIWXVerifyInput,
} from './types.js';
