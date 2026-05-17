/**
 * OnChainUX Core SDK — Self-hosted wallet connection toolkit.
 *
 * A complete replacement for Reown/WalletConnect infrastructure,
 * providing self-hosted relay, RPC proxy, and client-side SDK.
 *
 * @packageDocumentation
 */

// Types
export type {
  Chain,
  ChainNamespace,
  ChainReference,
  ConnectParams,
  ConnectionResult,
  AppMetadata,
  TransactionRequest,
  EventHandler,
  PairingData,
  SessionProposal,
  RequiredNamespace,
} from './types.js';

// Connector
export { Connector } from './connector.js';

// Session
export { SessionManager } from './session.js';
export type { SessionState } from './session.js';

// State management
export { createOnChainUXStore, initializeStore } from './store.js';
export type { OnChainUXState, ConnectionStatus, StoreConfig } from './store.js';

// Events
export { EventEmitter } from './events.js';

// EIP-6963
export { discoverWallets, watchWallets, findWalletByRdns } from './eip6963.js';
export type { EIP6963ProviderInfo, EIP1193Provider, EIP6963ProviderDetail } from './eip6963.js';

// Transports
export { RelayTransport } from './transports/relay.js';
export type { RelayTransportConfig } from './transports/relay.js';

export { InjectedProvider } from './transports/injected.js';

export { QRTransport } from './transports/qr.js';
export type { QRTransportConfig } from './transports/qr.js';

// EVM Adapter
export { EvmAdapter } from './adapters/evm.js';
export type { EthCallParams } from './adapters/evm.js';

// viem Adapter
export { ViemChainAdapter, createViemAdapter } from './adapters/viem.js';
export type { ViemClient, ViemAccount, ViemChain, ViemTransport } from './adapters/viem.js';

// wagmi Adapter
export {
  WagmiConnector,
  MultiChainConnector,
  createWagmiConnector,
  createMultiChainConnector,
} from './adapters/wagmi.js';
export type {
  WagmiConfig,
  WagmiChain,
  WagmiTransport,
  WagmiConnectorInstance,
  WagmiStorage,
  CreateWagmiConfig,
} from './adapters/wagmi.js';

// ethers v5 Adapter
export { Ethers5Adapter } from './adapters/ethers5.js';
export type {
  Ethers5Provider,
  Ethers5Network,
  Ethers5BigNumber,
  Ethers5Signer,
  Ethers5TransactionRequest,
  Ethers5TransactionResponse,
  Ethers5TransactionReceipt,
  Ethers5Log,
} from './adapters/ethers5.js';

// ethers v6 Adapter
export { Ethers6Adapter } from './adapters/ethers6.js';
export type {
  Ethers6Provider,
  Ethers6Network,
  Ethers6BigInt,
  Ethers6Signer,
  Ethers6TransactionRequest,
  Ethers6TransactionResponse,
  Ethers6TransactionReceipt,
  Ethers6Log,
} from './adapters/ethers6.js';

// Adapter types
export type {
  ChainAdapter,
  ChainAdapterMethods,
  AdapterFactoryConfig,
} from './adapters/types.js';

// Solana Adapter
export {
  SolanaChainAdapter,
  SOLANA_CHAINS,
  SOLANA_WALLETS,
  isValidSolanaAddress,
  base58Decode,
} from './adapters/solana.js';
export type { SolanaWalletInfo } from './adapters/solana.js';

// Bitcoin Adapter
export {
  BitcoinChainAdapter,
  BITCOIN_CHAINS,
  BITCOIN_WALLETS,
  validateBitcoinAddress,
} from './adapters/bitcoin.js';
export type { UTXO, AddressFormat, BitcoinWalletInfo } from './adapters/bitcoin.js';

// TON Adapter
export {
  TONChainAdapter,
  TON_CHAINS,
  TON_WALLETS,
  isValidTONAddress,
  parseTONAddress,
  hexToBase64url,
  base64urlToHex,
} from './adapters/ton.js';
export type {
  TONAddress,
  TONTransaction,
  TONJettonTransfer,
  TONConnectParams,
  TONWalletInfo as TONWalletInfoType,
} from './adapters/ton.js';

// TRON Adapter
export {
  TRONChainAdapter,
  TRON_CHAINS,
  TRON_WALLETS,
  isValidTRONAddress,
  base58ToHex,
  hexToBase58,
} from './adapters/tron.js';
export type {
  TRONTransaction,
  TRC20Transfer,
  TRONTransactionRaw,
  TRONWalletInfo as TRONWalletInfoType,
} from './adapters/tron.js';

// Polkadot Adapter
export {
  PolkadotChainAdapter,
  POLKADOT_CHAINS,
  POLKADOT_WALLETS,
  decodeSS58,
  isValidSS58Address,
} from './adapters/polkadot.js';
export type {
  PolkadotTransaction,
  PolkadotAssetTransfer,
  SS58AddressInfo,
  PolkadotWalletInfo as PolkadotWalletInfoType,
} from './adapters/polkadot.js';

// Crypto
export {
  generateKeypair,
  sharedSecret,
  serializeKeypair,
  deserializeKeypair,
  bytesToHex,
  hexToBytes,
} from './crypto/keypair.js';
export type { X25519Keypair } from './crypto/keypair.js';

export { encrypt, decrypt, deriveSymmetricKey, deriveTopic, generateNonce } from './crypto/encrypt.js';

// SIWE Authentication
export { SIWEAuth } from './auth/siwe.js';
export type { SIWEAuthConfig, SIWESignInResult } from './auth/siwe.js';

/**
 * Create a ChainAdapter from factory config.
 *
 * @param config - Adapter factory configuration.
 * @returns ChainAdapter instance.
 */
export async function createAdapter(
  config: import('./adapters/types.js').AdapterFactoryConfig | NewChainAdapterFactoryConfig,
): Promise<unknown> {
  switch (config.type) {
    case 'viem': {
      const mod = await import('./adapters/viem.js');
      return mod.createViemAdapter(config.client as any, config.connector);
    }
    case 'wagmi': {
      const mod = await import('./adapters/wagmi.js');
      return mod.createMultiChainConnector(config.client as any);
    }
    case 'ethers5': {
      const mod = await import('./adapters/ethers5.js');
      return new mod.Ethers5Adapter(config.client as any);
    }
    case 'ethers6': {
      const mod = await import('./adapters/ethers6.js');
      return new mod.Ethers6Adapter(config.client as any);
    }
    case 'ton': {
      const mod = await import('./adapters/ton.js');
      const adapter = new mod.TONChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'tron': {
      const mod = await import('./adapters/tron.js');
      const adapter = new mod.TRONChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'polkadot': {
      const mod = await import('./adapters/polkadot.js');
      const adapter = new mod.PolkadotChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    default:
      throw new Error(`Unknown adapter type: ${(config as any).type}`);
  }
}

/**
 * Factory configuration for new chain adapters (TON, TRON, Polkadot).
 */
export interface NewChainAdapterFactoryConfig {
  type: 'ton' | 'tron' | 'polkadot';
  client?: unknown;
  connector?: import('./connector.js').Connector;
  chains?: import('./types.js').Chain[];
}

// Deep Linking
export {
  generateDeepLink,
  registerWalletDeepLink,
  getAppStoreUrl,
  WALLET_DEEP_LINKS,
  generateUniversalLink,
  generateWalletConnectUniversalLink,
  smartRedirect,
  detectPlatform,
} from './links.js';
export type {
  DeepLinkParams,
  Platform as DeepLinkPlatform,
  RedirectResult,
  RedirectOptions,
  WalletDeepLinkConfig,
  UniversalLinkParams,
} from './links.js';

/**
 * SDK version.
 */
export const VERSION = '0.1.0';
export * from './eip5792';
