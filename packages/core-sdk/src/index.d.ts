/**
 * Cinacoin Core SDK — Self-hosted wallet connection toolkit.
 *
 * A complete replacement for Reown/WalletConnect infrastructure,
 * providing self-hosted relay, RPC proxy, and client-side SDK.
 *
 * @packageDocumentation
 */
export type { Chain, ChainNamespace, ChainReference, ConnectParams, ConnectionResult, AppMetadata, TransactionRequest, EventHandler, PairingData, SessionProposal, RequiredNamespace, } from './types.js';
export { Connector } from './connector.js';
export { SessionManager } from './session.js';
export type { SessionState } from './session.js';
export { createCinacoinStore, initializeStore } from './store.js';
export type { CinacoinState, ConnectionStatus, StoreConfig } from './store.js';
export { EventEmitter } from './events.js';
export { discoverWallets, watchWallets, findWalletByRdns } from './eip6963.js';
export type { EIP6963ProviderInfo, EIP1193Provider, EIP6963ProviderDetail } from './eip6963.js';
export { RelayTransport } from './transports/relay.js';
export type { RelayTransportConfig } from './transports/relay.js';
export { InjectedProvider } from './transports/injected.js';
export { QRTransport } from './transports/qr.js';
export type { QRTransportConfig } from './transports/qr.js';
export { EvmAdapter } from './adapters/evm.js';
export type { EthCallParams } from './adapters/evm.js';
export { ViemChainAdapter, createViemAdapter } from './adapters/viem.js';
export type { ViemClient, ViemAccount, ViemChain, ViemTransport } from './adapters/viem.js';
export { WagmiConnector, MultiChainConnector, createWagmiConnector, createMultiChainConnector, } from './adapters/wagmi.js';
export type { WagmiConfig, WagmiChain, WagmiTransport, WagmiConnectorInstance, WagmiStorage, CreateWagmiConfig, } from './adapters/wagmi.js';
export { Ethers5Adapter } from './adapters/ethers5.js';
export type { Ethers5Provider, Ethers5Network, Ethers5BigNumber, Ethers5Signer, Ethers5TransactionRequest, Ethers5TransactionResponse, Ethers5TransactionReceipt, Ethers5Log, } from './adapters/ethers5.js';
export { Ethers6Adapter } from './adapters/ethers6.js';
export type { Ethers6Provider, Ethers6Network, Ethers6BigInt, Ethers6Signer, Ethers6TransactionRequest, Ethers6TransactionResponse, Ethers6TransactionReceipt, Ethers6Log, } from './adapters/ethers6.js';
export type { ChainAdapter, ChainAdapterMethods, AdapterFactoryConfig, } from './adapters/types.js';
export { SolanaChainAdapter, SOLANA_CHAINS, SOLANA_WALLETS, isValidSolanaAddress, base58Decode, } from './adapters/solana.js';
export type { SolanaWalletInfo } from './adapters/solana.js';
export { BitcoinChainAdapter, BITCOIN_CHAINS, BITCOIN_WALLETS, validateBitcoinAddress, } from './adapters/bitcoin.js';
export type { UTXO, AddressFormat, BitcoinWalletInfo } from './adapters/bitcoin.js';
export { TONChainAdapter, TON_CHAINS, TON_WALLETS, isValidTONAddress, parseTONAddress, hexToBase64url, base64urlToHex, } from './adapters/ton.js';
export type { TONAddress, TONTransaction, TONJettonTransfer, TONConnectParams, TONWalletInfo as TONWalletInfoType, } from './adapters/ton.js';
export { TRONChainAdapter, TRON_CHAINS, TRON_WALLETS, isValidTRONAddress, base58ToHex, hexToBase58, } from './adapters/tron.js';
export type { TRONTransaction, TRC20Transfer, TRONTransactionRaw, TRONWalletInfo as TRONWalletInfoType, } from './adapters/tron.js';
export { generateKeypair, sharedSecret, serializeKeypair, deserializeKeypair, bytesToHex, hexToBytes, } from './crypto/keypair.js';
export type { X25519Keypair } from './crypto/keypair.js';
export { encrypt, decrypt, deriveSymmetricKey, deriveTopic, generateNonce } from './crypto/encrypt.js';
export { SIWEAuth } from './auth/siwe.js';
export type { SIWEAuthConfig, SIWESignInResult } from './auth/siwe.js';
/**
 * Create a ChainAdapter from factory config.
 *
 * @param config - Adapter factory configuration.
 * @returns ChainAdapter instance.
 */
export declare function createAdapter(config: import('./adapters/types.js').AdapterFactoryConfig | NewChainAdapterFactoryConfig): Promise<unknown>;
/**
 * Factory configuration for new chain adapters (TON, TRON, Polkadot).
 */
export interface NewChainAdapterFactoryConfig {
    type: 'ton' | 'tron' | 'polkadot';
    client?: unknown;
    connector?: import('./connector.js').Connector;
    chains?: import('./types.js').Chain[];
}
export { generateDeepLink, registerWalletDeepLink, getAppStoreUrl, WALLET_DEEP_LINKS, generateUniversalLink, generateWalletConnectUniversalLink, smartRedirect, detectPlatform, } from './links/index.js';
export type { DeepLinkParams, Platform as DeepLinkPlatform, RedirectResult, RedirectOptions, WalletDeepLinkConfig, UniversalLinkParams, } from './links/index.js';
/**
 * SDK version.
 */
export declare const VERSION = "0.1.0";
export * from './eip5792';
//# sourceMappingURL=index.d.ts.map