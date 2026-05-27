import type { Address, Hex } from 'viem';

// Re-export core types for Kotlin interop
export type { Address, Hex } from 'viem';

/**
 * Kotlin-compatible wallet connection result.
 * Used for bridging TypeScript types to Kotlin via react-native-bridge or direct SDK.
 */
export interface KotlinConnectionResult {
  success: boolean;
  address?: Address;
  provider?: string;
  chainId?: number;
  error?: string;
}

/**
 * Kotlin-compatible transaction parameters.
 */
export interface KotlinTransactionParams {
  to: Address;
  value: string; // Hex-encoded wei amount
  data?: Hex;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

/**
 * Kotlin-compatible transaction result.
 */
export interface KotlinTransactionResult {
  success: boolean;
  hash?: Hex;
  error?: string;
}

/**
 * Kotlin-compatible signature parameters.
 */
export interface KotlinSignatureParams {
  message: string;
  type: 'personal' | 'typed' | 'eip712';
  typedDataJson?: string;
}

/**
 * Kotlin-compatible signature result.
 */
export interface KotlinSignatureResult {
  success: boolean;
  signature?: Hex;
  error?: string;
}

/**
 * Kotlin-compatible chain configuration.
 */
export interface KotlinChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl?: string;
}

/**
 * Kotlin-compatible WalletConnect parameters.
 */
export interface KotlinWCParams {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  chainIds: number[];
}

/**
 * Kotlin-compatible session information.
 */
export interface KotlinSessionInfo {
  address: Address;
  chainId: number;
  connectedAt: number;
  connectorType: string;
  namespace?: string;
}

/**
 * Cinacoin SDK interface for Kotlin/Android.
 * Implement this in your Android bridge layer.
 */
export interface KotlinCinacoinSDK {
  /** Initialize the SDK with project configuration */
  initialize(params: KotlinWCParams): Promise<void>;

  /** Connect to a wallet via WalletConnect or injected provider */
  connect(): Promise<KotlinConnectionResult>;

  /** Disconnect from wallet */
  disconnect(): Promise<void>;

  /** Check connection status */
  isConnected(): Promise<boolean>;

  /** Get current session info */
  getSession(): Promise<KotlinSessionInfo | null>;

  /** Send a transaction */
  sendTransaction(params: KotlinTransactionParams): Promise<KotlinTransactionResult>;

  /** Sign a message */
  signMessage(params: KotlinSignatureParams): Promise<KotlinSignatureResult>;

  /** Get balance for an address */
  getBalance(address: Address, chainId: number): Promise<string>;

  /** Switch to a different chain */
  switchChain(chainId: number): Promise<KotlinConnectionResult>;

  /** Get supported chains */
  getSupportedChains(): Promise<KotlinChainConfig[]>;
}
