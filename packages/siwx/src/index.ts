/**
 * @cinacoin/siwx — Sign-In with Cross-chain (SIWX)
 *
 * Unified authentication across EVM (EIP-4361), Solana (ed25519),
 * Bitcoin (BIP-322), TON (SIWT), and TRON (SIWTR).
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

export {
  createTonSignInMessage,
  verifyTonSignature,
  parseTonMessage,
  isValidTonAddress,
} from './chains/ton.js';

export {
  createTronSignInMessage,
  verifyTronSignature,
  parseTronMessage,
  isValidTronAddress,
} from './chains/tron.js';

// Verifier Registry
export {
  VerifierRegistry,
  defaultVerifierRegistry,
} from './verifier-registry.js';

export type {
  VerifierFn,
  VerifierDescriptor,
  RegisterVerifierOptions,
} from './verifier-registry.js';

// Cloud Authentication (Reown Dashboard compatible)
export { CloudAuth, useCloudAuth } from './cloud-auth.js';

export type {
  CloudSession,
  VerifyResult,
  CloudAuthConfig,
  CloudAuthEvent,
  CloudAuthEventHandler,
} from './cloud-auth.js';

// React Hooks for Cloud Auth
export { useCloudSession, useCloudAuthEvents } from './cloud-hooks.js';

// Types
export type {
  ChainType,
  SIWXParams,
  SIWXResult,
  SIWXFormatOptions,
  SIWXVerifyInput,
} from './types.js';
