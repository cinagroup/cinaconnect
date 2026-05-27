/**
 * Cinacoin Core SDK — Self-hosted wallet connection toolkit.
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
export { createCinacoinStore, initializeStore } from './store.js';
export type { CinacoinState, ConnectionStatus, StoreConfig } from './store.js';

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

// viem Adapter (optional — requires viem peer dep)
export { ViemChainAdapter, createViemAdapter } from './adapters/viem.js';
export type { ViemClient, ViemAccount, ViemChain, ViemTransport } from './adapters/viem.js';

// wagmi Adapter (optional — requires wagmi peer dep)
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

// ethers v5 Adapter (optional — requires ethers@5 peer dep)
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

// ethers v6 Adapter (optional — requires ethers@6 peer dep)
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

// Solana Adapter (optional)
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

// Polkadot Adapter (optional)
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

// Cosmos Adapter (optional)
export {
  CosmosChainAdapter,
  COSMOS_CHAINS,
  COSMOS_WALLETS,
  bech32Encode,
  bech32Decode,
  bech32FromBytes,
  bech32ToBytes,
  isValidCosmosAddress,
} from './adapters/cosmos.js';
export type {
  CosmosMsg,
  CosmosFee,
  CosmosCoin,
  CosmosTransaction,
  CosmosTransfer,
  CosmWasmExecute,
  CosmosWalletInfo as CosmosWalletInfoType,
} from './adapters/cosmos.js';

// Hedera Adapter (optional)
export {
  HederaChainAdapter,
  HEDERA_CHAINS,
  HEDERA_WALLETS,
  isValidHederaAccountId,
  isValidHederaEvmAddress,
  normalizeHederaAddress,
  isValidHederaTokenId,
  isValidHederaContractId,
  accountIdToEvmAddress,
  parseAccountId,
  formatHbar,
  parseHbarAmount,
  HederaTxType,
  encodeFunctionCall,
  decodeUint256,
  decodeAddress,
  decodeString,
} from './adapters/hedera.js';
export type {
  HederaAccountBalance,
  HederaAccountInfo,
  HederaTransactionRecord,
  HederaTokenInfo,
  HederaTokenBalance,
  HederaNftInfo,
  HederaWalletProvider,
  HederaWalletInfo as HederaWalletInfoType,
  HederaTransactionRequest,
  HederaSignedTransaction,
  HashPackProvider,
  BladeProvider,
  KaibanProvider,
} from './adapters/hedera.js';

// Sui Adapter (optional)
export {
  SuiChainAdapter,
  SUI_CHAINS,
  SUI_WALLETS,
  isValidSuiAddress,
  normalizeSuiAddress,
  isValidSuiObjectId,
  formatSuiBalance,
  parseSuiAmount,
  BcsWriter,
  BcsReader,
  encodeTypeTag,
  TransactionBuilder,
  CommandKind,
  bytesToBase58,
} from './adapters/sui.js';
export type {
  SuiObject,
  SuiCoinBalance,
  SuiTransactionResponse,
  SuiGasBudget,
  SuiTransactionRequest,
  SuiWalletProvider,
  SuiWalletInfo as SuiWalletInfoType,
  SuiTransactionInput,
  BuiltTransactionBlock,
  SuiCommand,
  TransferObjectsCommand,
  SplitCoinCommand,
  MergeCoinsCommand,
  MoveCallCommand,
  PublishCommand,
} from './adapters/sui.js';

// XRPL Adapter (optional)
export {
  XrplChainAdapter,
  XRPL_CHAINS,
  XRPL_WALLETS,
  isValidXrplAddress,
  isValidXAddress,
  isValidAnyXrplAddress,
  normalizeXrplAddress,
  bytesToBase58 as xrplBytesToBase58,
  encodeDrops,
  decodeDrops,
  parseXrpAmount,
  buildPayment,
  buildOfferCreate,
  buildOfferCancel,
  buildTrustSet,
  buildNftMint,
  buildNftBurn,
  buildNftCreateOffer,
  XrplBinaryWriter,
  XrplFieldType,
  XrplTxType,
} from './adapters/xrpl.js';
export type {
  XrplAccountBalance,
  XrplAccountInfo,
  XrplTrustLine,
  XrplIssuedAmount,
  XrplOffer,
  XrplNft,
  XrplNftOffer,
  XrplTransactionResponse,
  XrplFeeEstimate,
  XrplTransactionRequest,
  XrplWalletProvider,
  XrplWalletInfo as XrplWalletInfoType,
} from './adapters/xrpl.js';

// NEAR Adapter (optional)
export {
  NearChainAdapter,
  NEAR_CHAINS,
  NEAR_WALLETS,
  isValidNearAccount,
  normalizeNearAccount,
  isSubAccount,
  getParentAccount,
  formatNearBalance,
  parseNearAmount,
  BorshWriter,
  BorshReader,
  base58Encode,
  sha256,
  AccessKeyPermission,
  KeyKind,
  ActionKind,
  createTransferAction,
  createFunctionCallAction,
  createAccountAction,
  buildNearFunctionCall,
  buildNearTransfer,
  buildFtTransferCall,
  buildFtTransferCallWithCallback,
  buildNftTransferCall,
  buildNftMintCall,
  DEFAULT_NEAR_GAS,
  DEFAULT_FT_GAS,
  DEFAULT_NFT_GAS,
  MIN_TRANSFER_DEPOSIT,
} from './adapters/near.js';
export type {
  NearAccountInfo,
  NearAccessKeyInfo,
  NearBlockInfo,
  NearTxStatusResult,
  NearViewStateResult,
  NearCallResult,
  NearAction,
  NearTransactionRequest,
  NearFunctionCall,
  NearFtTransfer,
  NearFtMetadata,
  NearNftMetadata,
  NearNftToken,
  NearNftTransfer,
  NearNftMint,
  NearSignedTransaction,
  NearTransactionResponse,
  NearWalletProvider,
  NearWalletSelector,
  NearWalletInfo as NearWalletInfoType,
} from './adapters/near.js';

// Starknet Adapter (optional)
export {
  StarknetChainAdapter,
  STARKNET_CHAINS,
  STARKNET_WALLETS,
  isValidStarknetAddress,
  normalizeStarknetAddress,
  isValidFelt,
  padHex,
  encodeFelt252,
  encodeCalldata,
  encodeStruct,
  encodeCairoArray,
  encodeByteArray,
  encodeSnip12Message,
  encodeMultiCall,
  buildInvokeTx,
  buildMultiInvokeTx,
  formatStarknetBalance,
  parseStarknetAmount,
  buildErc20BalanceCalldata,
  buildErc20TransferCalldata,
  buildErc20ApproveCalldata,
  STRK_TOKEN_ADDRESS,
  ETH_TOKEN_ADDRESS,
  STRK_DECIMALS,
  ETH_DECIMALS,
} from './adapters/starknet.js';
export type {
  StarknetAccount,
  StarknetWalletProvider,
  StarknetWalletInfo as StarknetWalletInfoType,
  StarknetTokenInfo,
  StarknetTxStatus,
  StarknetCall,
  StarknetInvokeTransaction,
  BlockReference,
  CairoCalldataItem,
} from './adapters/starknet.js';

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

// SIWE Authentication (optional — requires @cinacoin/siwe)
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
    case 'cosmos': {
      const mod = await import('./adapters/cosmos.js');
      const adapter = new mod.CosmosChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'hedera': {
      const mod = await import('./adapters/hedera.js');
      const adapter = new mod.HederaChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'sui': {
      const mod = await import('./adapters/sui.js');
      const adapter = new mod.SuiChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'starknet': {
      const mod = await import('./adapters/starknet.js');
      const adapter = new mod.StarknetChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'near': {
      const mod = await import('./adapters/near.js');
      const adapter = new mod.NearChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'solana': {
      const mod = await import('./adapters/solana.js');
      return new mod.SolanaChainAdapter();
    }
    case 'bitcoin': {
      const mod = await import('./adapters/bitcoin.js');
      const adapter = new mod.BitcoinChainAdapter();
      if (config.chains) adapter.registerChains(config.chains);
      return adapter;
    }
    case 'xrpl': {
      const mod = await import('./adapters/xrpl.js');
      const adapter = new mod.XrplChainAdapter();
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
  type: 'ton' | 'tron' | 'polkadot' | 'solana' | 'cosmos' | 'sui' | 'hedera' | 'starknet' | 'near' | 'bitcoin' | 'xrpl';
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
} from './links/index.js';
export type {
  DeepLinkParams,
  Platform as DeepLinkPlatform,
  RedirectResult,
  RedirectOptions,
  WalletDeepLinkConfig,
  UniversalLinkParams,
} from './links/index.js';

/**
 * SDK version.
 */
export const VERSION = '0.1.0';
// EIP-5792: Wallet Call API (atomic batch transactions)
export {
  // Types
  type WalletCapabilities,
  type ChainCapabilities,
  type Call,
  type SendCallsParams,
  type SendCallsResult,
  type CallsStatus,
  type GetCallsStatusResult,
  type CallReceipt,
  type GetCapabilitiesParams,
  type AtomicBatchConfig,
  type AtomicBatchResult,
  // Capabilities
  walletGetCapabilities,
  hasCapability,
  getChainCapabilities,
  getSupportedChains,
  filterByCapability,
  // Send Calls
  walletSendCalls,
  sendSingleCall,
  sendErc20Transfer,
  sendBatch,
  // Get Calls Status
  walletGetCallsStatus,
  waitForCallsStatus,
  allCallsSucceeded,
  getFailedReceipts,
  // Atomic Batch
  supportsAtomicBatch,
  buildAtomicBatch,
  executeAtomicBatch,
  createEthTransferCall,
  createContractCall,
  createErc20ApproveCall,
  createApproveAndSwapCalls,
  validateBatchConfig,
} from './eip5792/index.js';
