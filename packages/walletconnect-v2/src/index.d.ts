/**
 * @cinacoin/walletconnect-v2
 *
 * WalletConnect v2 protocol implementation for Cinacoin.
 * Provides pairing, session management, crypto utilities,
 * relay client, JSON-RPC methods, wallet registry, and
 * a unified WalletConnectClient.
 *
 * @packageDocumentation
 */
export type { Pairing, ParsedWcUri, Session, SessionNamespace, SessionProposal, SessionProposalResponse, SessionNotification, JsonRpcRequest, JsonRpcResponse, JsonRpcError, EncryptedEnvelope, Envelope, EnvelopeType0, EnvelopeType1, RelayConfig, RelayMessage, WalletRegistryEntry, WcClientEvent, } from './types.js';
export { WC_PAIRING_ERRORS, WC_SESSION_ERRORS, WC_JSON_RPC_ERRORS, } from './types.js';
export type { WcErrorCode } from './types.js';
export { generateKeypair, sharedSecret, serializeKeypair, deserializeKeypair, bytesToHex, hexToBytes, encrypt, decrypt, deriveSymmetricKey, deriveTopic, generateNonce, generateSymKey, generateTopic, deriveSharedSecret, deriveSessionTopic, deriveAuthKey, computeHmac, verifyHmac, encodeType0Envelope, decodeType0Envelope, encodeType1Envelope, decodeType1Envelope, isValidTopic, isValidSymKey, base64ToHex, hexToBase64, coreEncrypt, coreDecrypt, } from './crypto.js';
export type { X25519Keypair } from '@cinacoin/core-sdk';
export { WcRelay } from './relay.js';
export type { RelayState } from './relay.js';
export { parseWcUri, formatWcUri, createPairing, approvePairing, deletePairing, rejectPairing, pairingPing, encryptPairingMessage, decryptPairingMessage, isValidWcUri, isPairingExpired, isPairingValid, } from './pairing.js';
export type { PairingConfig } from './pairing.js';
export { WcSessionManager } from './session.js';
export type { SessionManagerConfig } from './session.js';
export { WalletConnectClient, WcClientError } from './client.js';
export type { WalletConnectClientConfig } from './client.js';
export { WC_METHODS, WC_EVENTS, SOLANA_METHODS, SOLANA_EVENTS, getDefaultRequiredNamespaces, buildSendTransaction, buildSignTransaction, buildPersonalSign, buildEthSign, buildSignTypedDataV4, buildSwitchChain, buildAddChain, buildWatchAsset, buildScanQRCode, buildSolanaSignMessage, buildSolanaSignTransaction, METHOD_REGISTRY, isEvmMethod, isSolanaMethod, isWcInternalMethod, getMethodDescription, } from './methods.js';
export type { NamespacesConfig, AddChainParams } from './methods.js';
export { WALLET_REGISTRY, getWalletById, getWalletIds, searchWallets, buildWalletDeepLink, buildWalletUniversalLink, getWalletsForChain, getWcV2Wallets, getRecommendedWalletOrder, } from './wallets.js';
/**
 * SDK version.
 */
export declare const VERSION = "0.1.0";
//# sourceMappingURL=index.d.ts.map