/**
 * @cinacoin/unity-types
 * TypeScript type definitions matching the Cinacoin Unity SDK C# API surface.
 * Mirrors: ChainNamespace, Chain, NativeCurrency, ConnectParams, AppMetadata,
 *          ConnectionResult, TransactionRequest, ConnectionStatus, SessionState,
 *          WalletInfo, CinacoinConfig, SessionData,
 *          SIWEParams, ParsedSIWE, SIWEVerificationResult,
 *          EvmAdapter, SolanaAdapter, DeepLinkHandler, WalletManager,
 *          CinacoinManager, ConnectModal, WalletCard, ConnectButton
 */

// ─── Core Types (OnChainUXTypes.cs) ───────────────────────────────────

/** Supported blockchain network types (CAIP-2 namespace). */
export type ChainNamespace = 'eip155' | 'solana' | 'bip121' | 'tron';

/** Chain reference (CAIP-2 format). */
export interface ChainReference {
  namespace: ChainNamespace;
  reference: string;
}

/** Native currency info for a chain. */
export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

/** Full chain definition. */
export interface Chain {
  id: string;
  name: string;
  rpcUrl: string;
  nativeCurrency: NativeCurrency;
  explorerUrl: string;
  iconUrl?: string;
}

/** Predefined chains. */
export const ChainDefs = {
  Ethereum: {
    id: 'eip155:1',
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://etherscan.io',
  },
  Polygon: {
    id: 'eip155:137',
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    explorerUrl: 'https://polygonscan.com',
  },
  Arbitrum: {
    id: 'eip155:42161',
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://arbiscan.io',
  },
  Optimism: {
    id: 'eip155:10',
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  Solana: {
    id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    explorerUrl: 'https://solscan.io',
  },
} as const;

/** Application metadata for pairing. */
export interface AppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

/** Connection parameters matching core-sdk ConnectParams. */
export interface ConnectParams {
  topic: string;
  relayUrl: string;
  uri: string;
  chains: number[];
  metadata: AppMetadata;
}

/** Result of a successful wallet connection. */
export interface ConnectionResult {
  sessionId: string;
  accounts: string[];
  chainId: number;
  connectorId: string;
}

/** Transaction request matching core-sdk TransactionRequest. */
export interface TransactionRequest {
  from: string;
  to: string;
  value: string;
  data: string;
  gas: string;
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  nonce: string;
  chainId?: number;
}

/** Connection state discriminator. */
export type ConnectionStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Error';

/** Session state matching core-sdk session.ts SessionState. */
export interface SessionState {
  status: ConnectionStatus;
  connectorId?: string;
  accounts?: string[];
  chainId?: number;
  sessionId?: string;
  error?: string;
}

/** Wallet info for the registry. */
export interface WalletInfo {
  id: string;
  name: string;
  iconUrl: string;
  deepLinkScheme: string;
  universalLinkDomain: string;
  appStoreUrl: string;
  playStoreUrl: string;
  supportedChains: string[];
}

/** SDK version. */
export const CINA_CONNECT_VERSION = '0.1.0';

// ─── Configuration Types ──────────────────────────────────────────────

/** Configuration for Cinacoin initialization. */
export interface CinacoinConfig {
  projectId: string;
  metadata: AppMetadata;
  relayUrl?: string;
}

/** Persisted session data for localStorage. */
export interface SessionData {
  status: string;
  sessionId: string;
  connectorId: string;
  accounts: string[];
  chainId: number;
}

// ─── SIWE Types (Siwe.cs) ─────────────────────────────────────────────

/** SIWE message parameters (EIP-4361). */
export interface SIWEParams {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/** Parsed SIWE message data. */
export interface ParsedSIWE {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/** SIWE verification result. */
export interface SIWEVerificationResult {
  valid: boolean;
  data?: ParsedSIWE;
  error?: string;
}

// ─── EVM Adapter (EvmAdapter.cs) ──────────────────────────────────────

/** EVM chain adapter for JSON-RPC interactions. */
export class EvmAdapter {
  constructor(rpcUrl?: string, chainId?: number) {
    void rpcUrl;
    void chainId;
  }
  init(_rpcUrl: string, _chainId?: number): void {}
  setPrivateKey(_privateKey: string): void {}
  async getBalanceAsync(_address: string): Promise<bigint> { return 0n; }
  async getBalanceFormattedAsync(_address: string, _decimals?: number): Promise<string> { return '0'; }
  async sendTransactionAsync(_tx: TransactionRequest): Promise<string> { return '0xunsigned'; }
  async callAsync(_from: string, _to: string, _data: string): Promise<string> { return '0x'; }
  async getTokenBalanceAsync(_tokenAddress: string, _ownerAddress: string): Promise<bigint> { return 0n; }
  async getBlockNumberAsync(): Promise<number> { return 0; }
  async estimateGasAsync(_from: string, _to: string, _data?: string): Promise<bigint> { return 0n; }
  async getGasPriceAsync(): Promise<bigint> { return 0n; }
  async getNonceAsync(_address: string): Promise<number> { return 0; }
  async getChainIdAsync(): Promise<number> { return 1; }
  async getTransactionReceiptAsync(_txHash: string): Promise<string> { return ''; }
  async getTransactionByHashAsync(_txHash: string): Promise<string> { return ''; }
  async getLogsAsync(_fromBlock?: string, _toBlock?: string, _address?: string, _topics?: string[]): Promise<string> { return ''; }
  async getCodeAsync(_address: string): Promise<string> { return ''; }
  static formatWeiToEther(_wei: bigint, _decimals?: number): string { return '0'; }
  static parseEtherToWei(_ether: string, _decimals?: number): bigint { return 0n; }
  static bytesToHex(_bytes: Uint8Array): string { return ''; }
  static bytesToHex0x(_bytes: Uint8Array): string { return '0x'; }
  static hexToBytes(_hex: string): Uint8Array { return new Uint8Array(0); }
  static isValidAddress(_address: string): boolean { return false; }
  static chainIdToHex(_chainId: number): string { return '0x0'; }
  static weiToHex(_wei: bigint): string { return '0x0'; }
  static hashTypedDataV4(_domainSeparator: string, _messageHash: string): Uint8Array { return new Uint8Array(0); }
  static hashBytes(_data: Uint8Array): Uint8Array { return new Uint8Array(0); }
}

// ─── Solana Adapter (SolanaAdapter.cs) ────────────────────────────────

/** Blockhash result from Solana RPC. */
export interface BlockhashResult {
  context: { slot: number };
  value: { blockhash: string; lastValidBlockHeight: number };
}

/** Signature status from Solana RPC. */
export interface SignatureStatus {
  slot: number;
  confirmations: number | null;
  err: unknown;
  confirmationStatus: string;
}

/** Epoch info from Solana RPC. */
export interface EpochInfo {
  absoluteSlot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
}

/** Token balance from Solana RPC. */
export interface TokenBalance {
  context: { slot: number };
  value: { amount: string; decimals: number; uiAmount: number | null; uiAmountString: string };
}

/** Solana chain adapter for JSON-RPC interactions. */
export class SolanaAdapter {
  constructor(rpcUrl?: string) { void rpcUrl; }
  setWalletPublicKey(_publicKey: string): void {}
  init(_rpcUrl: string): void {}
  async getBalanceAsync(_address: string): Promise<bigint> { return 0n; }
  async getBalanceSolAsync(_address: string): Promise<number> { return 0; }
  async getAccountInfoAsync(_address: string): Promise<string> { return ''; }
  async getRecentBlockhashAsync(): Promise<string> { return ''; }
  async getMinimumBalanceForRentExemptionAsync(_dataLength: number): Promise<number> { return 0; }
  async sendTransactionAsync(_serializedTx: string): Promise<string> { return ''; }
  async getTransactionAsync(_signature: string): Promise<string> { return ''; }
  async getSignatureStatusAsync(_signature: string): Promise<SignatureStatus | null> { return null; }
  async requestAirdropAsync(_address: string, _lamports: number): Promise<string> { return ''; }
  async getVersionAsync(): Promise<string> { return ''; }
  async getSlotAsync(): Promise<number> { return 0; }
  async getEpochInfoAsync(): Promise<EpochInfo> { return {} as EpochInfo; }
  async getTokenAccountBalanceAsync(_tokenAddress: string): Promise<TokenBalance> { return {} as TokenBalance; }
  async getTokenAccountsByOwnerAsync(_ownerAddress: string, _mintAddress?: string): Promise<string> { return ''; }
  static lamportsToSol(_lamports: number): number { return 0; }
  static solToLamports(_sol: number): number { return 0; }
  static isValidAddress(_address: string): boolean { return false; }
  static solToLamportsString(_sol: number): string { return '0'; }
}

/** Predefined Solana chain IDs. */
export const SolanaChains = {
  Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  Devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  Testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
} as const;

/** Common Solana wallet IDs. */
export const SolanaWallets = {
  Phantom: 'phantom',
  Solflare: 'solflare',
  Backpack: 'backpack',
  Ledger: 'ledger',
} as const;

// ─── SIWE Static Functions ────────────────────────────────────────────

/**
 * SIWE (Sign-In with Ethereum) implementation.
 * Implements EIP-4361 message generation and verification.
 */
export const SIWE = {
  generateMessage(p: SIWEParams): string {
    void p;
    return '';
  },
  parseMessage(message: string): ParsedSIWE {
    void message;
    return {} as ParsedSIWE;
  },
  verify(message: string, signature: string, expectedAddress?: string, expectedDomain?: string, expectedNonce?: string): SIWEVerificationResult {
    void message; void signature; void expectedAddress; void expectedDomain; void expectedNonce;
    return { valid: false };
  },
  generateNonce(byteLength?: number): string { return '0x00'; },
  generateTimestamp(time?: Date): string { return ''; },
  generateExpirationTime(seconds?: number): string { return ''; },
  computeEIP191MessageHash(message: string): Uint8Array { void message; return new Uint8Array(0); },
  computeMessageHash(message: string): Uint8Array { void message; return new Uint8Array(0); },
  keccak256(data: Uint8Array): Uint8Array { void data; return new Uint8Array(0); },
  prepareForSigning(p: SIWEParams): Uint8Array { void p; return new Uint8Array(0); },
  verifySignatureAgainstMessage(message: string, signature: string, expectedAddress: string): boolean {
    void message; void signature; void expectedAddress;
    return false;
  },
};

// ─── DeepLinkHandler ──────────────────────────────────────────────────

/** Platform types. */
export type Platform = 'iOS' | 'Android' | 'WebGL' | 'Web';

/** Result of a redirect attempt. */
export interface RedirectResult {
  success: boolean;
  method: 'deep-link' | 'universal-link' | 'app-store' | 'qr-code';
  url: string;
  fallbackUsed?: boolean;
  error?: string;
}

/** Deep link handler for mobile builds. */
export class DeepLinkHandler {
  constructor() {}
  setPlatform(_platform: Platform): void {}
  getCurrentPlatform(): Platform { return 'Web'; }
  generateDeepLink(walletId: string, uri: string): string { void walletId; void uri; return ''; }
  generateUniversalLink(walletId: string, uri: string): string { void walletId; void uri; return ''; }
  generateAppStoreUrl(walletId: string): string { void walletId; return ''; }
  async openDeepLinkAsync(_walletId: string, _uri: string): Promise<RedirectResult> { return { success: false, method: 'qr-code', url: '' }; }
  openAppStore(walletId: string): RedirectResult { void walletId; return { success: false, method: 'app-store', url: '' }; }
  isDeepLinkSupported(): boolean { return false; }
  buildCallbackUrl(protocol?: string): string { void protocol; return ''; }
}

// ─── WalletRegistry ───────────────────────────────────────────────────

/** Registry of supported wallets with deep link schemes. */
export const WalletRegistry = {
  get(walletId: string): WalletInfo | undefined { void walletId; return undefined; },
  getAll(): WalletInfo[] { return []; },
  getForChain(chainId: string): WalletInfo[] { void chainId; return []; },
  register(wallet: WalletInfo): void { void wallet; },
  has(walletId: string): boolean { void walletId; return false; },
};

// ─── WalletManager ────────────────────────────────────────────────────

/** Session info for WalletConnect. */
export interface SessionInfo {
  topic: string;
  accounts: string[];
  expiry: number;
  createdAt: number;
  relayProtocol?: string;
  isExpired: boolean;
  state: string;
}

/** Wallet manager with WalletConnect v2 protocol support. */
export class WalletManager {
  constructor(_projectId: string, _metadata: AppMetadata, _relayUrl?: string) {
    void _projectId; void _metadata; void _relayUrl;
  }
  async initializeAsync(): Promise<void> {}
  async connectAsync(_walletId: string, _chains?: number[]): Promise<ConnectionResult> {
    return {} as ConnectionResult;
  }
  async disconnectAsync(_sessionId: string): Promise<void> {}
  async disconnectAllAsync(): Promise<void> {}
  async switchChainAsync(_sessionId: string, _chainId: number): Promise<void> {}
  async signMessageAsync(_sessionId: string, _message: string): Promise<string> { return ''; }
  async sendTransactionAsync(_sessionId: string, _tx: TransactionRequest): Promise<string> { return ''; }
  getConnectedAddress(): string | null { return null; }
  getSessionInfo(): SessionInfo | null { return null; }
  getStatus(): ConnectionStatus { return 'Disconnected'; }
  isWalletInstalled(_walletId: string): boolean { void _walletId; return false; }
}

// ─── CinacoinManager ───────────────────────────────────────────────

/** Event handler types. */
export type OnStateChange = (state: SessionState) => void;
export type OnConnected = (result: ConnectionResult) => void;
export type OnDisconnected = () => void;
export type OnChainChanged = (chainId: number) => void;
export type OnError = (error: string) => void;

/** Main singleton runtime class for wallet connections. */
export class CinacoinManager {
  static instance: CinacoinManager | null = null;

  get status(): ConnectionStatus { return 'Disconnected'; }
  get accounts(): string[] { return []; }
  get chainId(): number { return 1; }
  get isConnected(): boolean { return false; }
  get sessionId(): string { return ''; }

  onStateChanged: OnStateChange | null = null;
  onWalletConnected: OnConnected | null = null;
  onWalletDisconnected: OnDisconnected | null = null;
  onChainChangedEvent: OnChainChanged | null = null;
  onErrorEvent: OnError | null = null;

  initialize(_projectId: string, _metadata: AppMetadata): void { void _projectId; void _metadata; }
  initializeFromConfig(_configJson: string): void { void _configJson; }
  async connectAsync(_walletId: string, _chains?: number[]): Promise<ConnectionResult> { return {} as ConnectionResult; }
  async disconnectAsync(): Promise<void> {}
  async switchChainAsync(_chainId: number): Promise<void> { void _chainId; }
  async signMessageAsync(_message: string): Promise<string> { void _message; return ''; }
  async sendTransactionAsync(_tx: TransactionRequest): Promise<string> { void _tx; return ''; }
  async getBalanceAsync(): Promise<string> { return '0'; }
  async restoreAsync(): Promise<SessionState> { return SessionStateFactory.disconnected(); }
}

/** SessionState factory methods. */
export const SessionStateFactory = {
  disconnected: (): SessionState => ({ status: 'Disconnected' }),
  connecting: (connectorId: string): SessionState => ({ status: 'Connecting', connectorId }),
  connected: (accounts: string[], chainId: number, sessionId: string, connectorId: string): SessionState => ({
    status: 'Connected', accounts, chainId, sessionId, connectorId,
  }),
  errored: (error: string): SessionState => ({ status: 'Error', error }),
};

// ─── UI Components ────────────────────────────────────────────────────

/** Wallet card component for the Connect Modal. */
export class WalletCard {
  onClick: (() => void) | null = null;
  setWallet(_wallet: WalletInfo): void { void _wallet; }
  getWallet(): WalletInfo | null { return null; }
  isInstalled(): boolean { return false; }
}

/** Connect Modal panel for wallet selection. */
export class ConnectModal {
  static instance: ConnectModal | null = null;
  get isOpen(): boolean { return false; }
  onWalletSelected: ((wallet: WalletInfo) => void) | null = null;
  onClosed: (() => void) | null = null;
  show(_wallets: WalletInfo[], _recommendedIds?: string[]): void { void _wallets; void _recommendedIds; }
  showWithQR(_wallet: WalletInfo, _wcUri: string): void { void _wallet; void _wcUri; }
  close(): void {}
  showQR(_wcUri: string, _walletName: string): void { void _wcUri; void _walletName; }
}

/** Connect Button (UGUI compatible). */
export class ConnectButton {
  onConnectRequested: (() => void) | null = null;
  onConnectedClick: (() => void) | null = null;
}

// ─── WalletConnect Protocol Types ─────────────────────────────────────

/** Namespace for WalletConnect session. */
export interface Namespace {
  chainId: string;
  methods: string[];
  events: string[];
}

/** Crypto constants for WalletConnect v2. */
export const WCCryptoConstants = {
  KEY_SIZE: 32,
  IV_SIZE: 16,
  MAC_SIZE: 32,
  TYPE0_ENVELOPE_OVERHEAD: 49, // 1 + 16 + 32
  TYPE1_ENVELOPE_OVERHEAD: 81, // 1 + 32 + 16 + 32
} as const;

// ─── Version ──────────────────────────────────────────────────────────

/** SDK version constant. */
export const CINA_CONNECT_SDK_VERSION = '0.1.0';
