import type { Chain, Address, Hex } from 'viem';

// Re-export core types for Swift interop
export type { Chain, Address, Hex } from 'viem';

/**
 * Swift-compatible wallet connection result.
 * Used for bridging TypeScript types to Swift via react-native-bridge or SwiftPM.
 */
export interface SwiftConnectionResult {
  /** Whether connection was successful */
  success: boolean;
  /** Connected wallet address */
  address?: Address;
  /** Wallet provider name */
  provider?: string;
  /** Chain ID */
  chainId?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Swift-compatible transaction parameters.
 */
export interface SwiftTransactionParams {
  to: Address;
  value: string; // Hex-encoded wei amount
  data?: Hex;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

/**
 * Swift-compatible transaction result.
 */
export interface SwiftTransactionResult {
  success: boolean;
  hash?: Hex;
  error?: string;
}

/**
 * Swift-compatible signature parameters.
 */
export interface SwiftSignatureParams {
  message: string | Hex;
  type: 'personal' | 'typed' | 'eip712';
  typedDataJson?: string; // JSON string for EIP-712
}

/**
 * Swift-compatible signature result.
 */
export interface SwiftSignatureResult {
  success: boolean;
  signature?: Hex;
  error?: string;
}

/**
 * Swift-compatible chain configuration.
 */
export interface SwiftChainConfig {
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
 * Swift-compatible session information.
 */
export interface SwiftSessionInfo {
  address: Address;
  chainId: number;
  connectedAt: number;
  connectorType: string;
}

/**
 * Cinacoin SDK interface for Swift.
 * Implement this in your Swift bridge layer.
 */
export interface SwiftCinacoinSDK {
  /** Initialize the SDK with configuration */
  initialize(config: { projectId: string; metadata?: Record<string, string> }): Promise<void>;

  /** Connect to a wallet */
  connect(): Promise<SwiftConnectionResult>;

  /** Disconnect from wallet */
  disconnect(): Promise<void>;

  /** Check connection status */
  isConnected(): Promise<boolean>;

  /** Get current session info */
  getSession(): Promise<SwiftSessionInfo | null>;

  /** Send a transaction */
  sendTransaction(params: SwiftTransactionParams): Promise<SwiftTransactionResult>;

  /** Sign a message */
  signMessage(params: SwiftSignatureParams): Promise<SwiftSignatureResult>;

  /** Get balance */
  getBalance(address: Address, chainId: number): Promise<string>;

  /** Switch chain */
  switchChain(chainId: number): Promise<SwiftConnectionResult>;
}
