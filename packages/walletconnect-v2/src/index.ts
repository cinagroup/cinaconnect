/**
 * @onchainux/walletconnect-v2
 *
 * WalletConnect v2 protocol implementation for OnChainUX.
 * Provides pairing, session management, crypto utilities,
 * relay client, JSON-RPC methods, and wallet registry.
 *
 * @packageDocumentation
 */

// Types
export type {
  Pairing,
  ParsedWcUri,
  Session,
  SessionNamespace,
  SessionProposal,
  SessionProposalResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  EncryptedEnvelope,
  RelayConfig,
  RelayMessage,
  WalletRegistryEntry,
  WcClientEvent,
} from './types.js';

// Crypto
export {
  generateKeypair,
  sharedSecret,
  serializeKeypair,
  deserializeKeypair,
  bytesToHex,
  hexToBytes,
  encrypt,
  decrypt,
  deriveSymmetricKey,
  deriveTopic,
  generateNonce,
  generateSymKey,
  generateTopic,
  deriveSharedSecret,
  deriveSessionTopic,
  deriveAuthKey,
} from './crypto.js';

export type { X25519Keypair } from '@onchainux/core';

// Relay
export { WcRelay } from './relay.js';
export type { RelayState } from './relay.js';

// Pairing
export {
  parseWcUri,
  formatWcUri,
  createPairing,
  encryptPairingMessage,
  decryptPairingMessage,
  isValidWcUri,
} from './pairing.js';

// Session
export { WcSessionManager } from './session.js';
export type { SessionManagerConfig } from './session.js';

// Methods
export {
  WC_METHODS,
  WC_EVENTS,
  getDefaultRequiredNamespaces,
  buildSendTransaction,
  buildPersonalSign,
  buildSignTypedDataV4,
  buildSwitchChain,
  buildAddChain,
  METHOD_REGISTRY,
  isEvmMethod,
  isWcInternalMethod,
} from './methods.js';
export type { NamespacesConfig, AddChainParams } from './methods.js';

// Wallets
export {
  WALLET_REGISTRY,
  getWalletById,
  buildWalletDeepLink,
  buildWalletUniversalLink,
  getWalletsForChain,
} from './wallets.js';

/**
 * SDK version.
 */
export const VERSION = '0.1.0';
