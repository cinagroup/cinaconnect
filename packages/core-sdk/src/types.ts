/**
 * Core type definitions for the Cinacoin SDK.
 */

/** Supported blockchain network types. */
export type ChainNamespace = 'eip155' | 'solana' | 'bip121' | 'bip122' | 'tron' | 'ton' | 'polkadot' | 'sui' | 'hedera';

/** Chain reference (CAIP-2 format: namespace:reference). */
export interface ChainReference {
  /** Chain namespace (e.g., 'eip155'). */
  namespace: ChainNamespace;
  /** Chain reference (e.g., '1' for Ethereum mainnet). */
  reference: string;
}

/** Full chain definition. */
export interface Chain {
  /** Unique chain ID. */
  id: string;
  /** Human-readable chain name. */
  name: string;
  /** RPC endpoint URL. */
  rpcUrl: string;
  /** Native currency symbol. */
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  /** Explorer URL. */
  explorerUrl?: string;
  /** Chain icon URL. */
  iconUrl?: string;
}

/** Connection parameters for wallet connection. */
export interface ConnectParams {
  /** Optional topic for existing session. */
  topic?: string;
  /** Optional relay URL override. */
  relayUrl?: string;
  /** Optional pairing URI (WalletConnect format). */
  uri?: string;
  /** Chain IDs the dApp supports. */
  chains?: number[];
  /** Optional metadata about the dApp. */
  metadata?: AppMetadata;
}

/** Application metadata for pairing. */
export interface AppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

/** Result of a successful wallet connection. */
export interface ConnectionResult {
  /** Session ID. */
  sessionId: string;
  /** Connected account addresses. */
  accounts: string[];
  /** Connected chain ID. */
  chainId: number;
  /** Connector that was used. */
  connectorId: string;
}

/** Transaction request to be signed. */
export interface TransactionRequest {
  /** From address. */
  from: string;
  /** To address. */
  to: string;
  /** Value in wei (hex string). */
  value?: string;
  /** Data payload (hex string). */
  data?: string;
  /** Gas limit (hex string). */
  gas?: string;
  /** Gas price (hex string). */
  gasPrice?: string;
  /** Max fee per gas (EIP-1559, hex string). */
  maxFeePerGas?: string;
  /** Max priority fee per gas (EIP-1559, hex string). */
  maxPriorityFeePerGas?: string;
  /** Nonce (hex string). */
  nonce?: string;
  /** Chain ID. */
  chainId?: number;
}

/** Event handler function. */
export type EventHandler = (...args: unknown[]) => void;

/** Pairing data structure. */
export interface PairingData {
  /** Pairing topic. */
  topic: string;
  /** Pairing URI (WalletConnect format). */
  uri: string;
  /** Peer metadata. */
  peerMetadata?: AppMetadata;
  /** Active state. */
  active: boolean;
  /** Expiration timestamp (ms). */
  expiry: number;
}

/** Session proposal data. */
export interface SessionProposal {
  /** Proposal ID. */
  id: number;
  /** Required namespaces (CAIP-2). */
  requiredNamespaces: Record<string, RequiredNamespace>;
  /** Optional namespaces. */
  optionalNamespaces?: Record<string, RequiredNamespace>;
  /** Relayer metadata. */
  relays: { protocol: string; data?: string }[];
  /** Proposer metadata. */
  proposer: {
    publicKey: string;
    metadata: AppMetadata;
  };
}

/** Required namespace for session proposal. */
export interface RequiredNamespace {
  /** Required chains. */
  chains: string[];
  /** Required methods. */
  methods: string[];
  /** Required events. */
  events: string[];
}
