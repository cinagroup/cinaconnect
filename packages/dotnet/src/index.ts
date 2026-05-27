/**
 * @cinacoin/dotnet
 * TypeScript type definitions matching the Cinacoin .NET client API surface.
 *
 * Mirrors the full C# API from:
 *   - CinacoinClient
 *   - Cinacoin.Models.* (17 model types)
 *   - Cinacoin.Services.* (WalletService, RelayClient, CryptoUtils)
 */

// ═══════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════

/**
 * Supported blockchain network namespaces (CAIP-2 format).
 * Matches Cinacoin.Models.ChainNamespace
 */
export enum ChainNamespace {
  Eip155 = "Eip155",
  Solana = "Solana",
  Bip121 = "Bip121",
  Bip122 = "Bip122",
  Tron = "Tron",
  Ton = "Ton",
  Polkadot = "Polkadot",
}

// ═══════════════════════════════════════════════════════════
// Models
// ═══════════════════════════════════════════════════════════

/**
 * Represents a blockchain account.
 * Matches Cinacoin.Models.Account
 */
export interface Account {
  /** The wallet address. */
  address: string;
  /** The chain ID. */
  chainId: string;
  /** The account balance (as a string to preserve precision). */
  balance: string;
  /** Human-readable label for the account. */
  label: string;
}

/**
 * Application metadata for wallet pairing.
 * Matches Cinacoin.Models.AppMetadata
 */
export interface AppMetadata {
  /** Application name. */
  name: string;
  /** Application description. */
  description: string;
  /** Application URL. */
  url: string;
  /** Icon URLs for the application. */
  icons: readonly string[];
}

/**
 * Native currency metadata for a chain.
 * Matches Cinacoin.Models.NativeCurrency
 */
export interface NativeCurrency {
  /** Currency name (e.g., "Ether"). */
  name: string;
  /** Currency symbol (e.g., "ETH"). */
  symbol: string;
  /** Number of decimal places. */
  decimals: number;
}

/**
 * Full chain definition with metadata.
 * Matches Cinacoin.Models.Chain
 */
export interface Chain {
  /** Unique chain ID. */
  id: string;
  /** Human-readable chain name. */
  name: string;
  /** RPC endpoint URL. */
  rpcUrl: string;
  /** Native currency information. */
  nativeCurrency?: NativeCurrency;
  /** Block explorer URL. */
  explorerUrl?: string;
  /** Chain icon URL. */
  iconUrl?: string;
}

/**
 * Chain reference in CAIP-2 format (namespace:reference).
 * Matches Cinacoin.Models.ChainReference
 */
export interface ChainReference {
  /** Chain namespace (e.g., 'eip155'). */
  namespace: ChainNamespace;
  /** Chain reference (e.g., '1' for Ethereum mainnet). */
  reference: string;
}

/**
 * Represents a blockchain network.
 * Matches Cinacoin.Models.Network
 */
export interface Network {
  /** Unique network identifier. */
  id: string;
  /** Human-readable network name. */
  name: string;
  /** Chain ID number. */
  chainId: number;
  /** RPC endpoint URL. */
  rpcUrl: string;
  /** Native currency symbol. */
  currency: string;
  /** Block explorer URL. */
  explorerUrl: string;
  /** Whether this is a testnet. */
  isTestnet: boolean;
}

/**
 * Pairing data structure for wallet connection.
 * Matches Cinacoin.Models.PairingData
 */
export interface PairingData {
  /** Pairing topic. */
  topic: string;
  /** Pairing URI (WalletConnect format). */
  uri: string;
  /** Peer metadata, if available. */
  peerMetadata?: AppMetadata;
  /** Whether the pairing is active. */
  active: boolean;
  /** Expiration timestamp in milliseconds since Unix epoch. */
  expiry: number;
}

/**
 * Proposer metadata within a session proposal.
 * Matches Cinacoin.Models.ProposerInfo
 */
export interface ProposerInfo {
  /** Proposer's public key. */
  publicKey: string;
  /** Proposer's application metadata. */
  metadata: AppMetadata;
}

/**
 * Relayer protocol specification for session proposals.
 * Matches Cinacoin.Models.RelayInfo
 */
export interface RelayInfo {
  /** Protocol name (e.g., "irn"). */
  protocol: string;
  /** Protocol-specific data. */
  data?: string;
}

/**
 * Required namespace specification for session proposals.
 * Matches Cinacoin.Models.RequiredNamespace
 */
export interface RequiredNamespace {
  /** Required chains in CAIP-2 format. */
  chains: readonly string[];
  /** Required JSON-RPC methods. */
  methods: readonly string[];
  /** Required event types. */
  events: readonly string[];
}

/**
 * Session proposal data from a wallet connection attempt.
 * Matches Cinacoin.Models.SessionProposal
 */
export interface SessionProposal {
  /** Unique proposal ID. */
  id: number;
  /** Required namespaces (CAIP-2 keyed). */
  requiredNamespaces: Record<string, RequiredNamespace>;
  /** Optional namespaces (CAIP-2 keyed). */
  optionalNamespaces?: Record<string, RequiredNamespace>;
  /** Relayer protocols. */
  relays: readonly RelayInfo[];
  /** Proposer's public key and metadata. */
  proposer: ProposerInfo;
}

/**
 * Result of a wallet session creation.
 * Matches Cinacoin.Models.SessionResult
 */
export interface SessionResult {
  /** Session identifier. */
  sessionId: string;
  /** WalletConnect URI for pairing. */
  uri: string;
}

/**
 * Connection parameters for establishing a wallet connection.
 * Matches Cinacoin.Models.ConnectParams
 */
export interface ConnectParams {
  /** Optional topic for an existing session. */
  topic?: string;
  /** Optional relay URL override. */
  relayUrl?: string;
  /** Optional pairing URI (WalletConnect format). */
  uri?: string;
  /** Chain IDs the dApp supports. */
  chains?: readonly number[];
  /** Optional metadata about the dApp. */
  metadata?: AppMetadata;
}

/**
 * Result of a successful wallet connection.
 * Matches Cinacoin.Models.ConnectionResult
 */
export interface ConnectionResult {
  /** Session ID for the established connection. */
  sessionId: string;
  /** Connected account addresses. */
  accounts: readonly string[];
  /** Connected chain ID. */
  chainId: number;
  /** Connector identifier that was used. */
  connectorId: string;
}

/**
 * Represents a blockchain transaction.
 * Matches Cinacoin.Models.Transaction
 */
export interface Transaction {
  /** Transaction hash. */
  hash: string;
  /** Sender address. */
  from: string;
  /** Recipient address. */
  to: string;
  /** Transaction value (as a string to preserve precision). */
  value: string;
  /** Gas limit (as a string, typically hex). */
  gasLimit: string;
  /** Gas price (as a string, typically hex). */
  gasPrice: string;
  /** Transaction data payload (hex string). */
  data: string;
  /** Chain ID. */
  chainId: string;
  /** Transaction status code (0 = pending, 1 = confirmed, 2 = failed). */
  status: number;
  /** Block number where this transaction was included. */
  blockNumber: number;
  /** Unix timestamp (seconds) when the transaction was mined. */
  timestamp: number;
}

/**
 * Transaction request to be signed by a connected wallet.
 * Matches Cinacoin.Models.TransactionRequest
 */
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

// ═══════════════════════════════════════════════════════════
// Relay Envelope (generic)
// ═══════════════════════════════════════════════════════════

/**
 * Envelope for relay messages.
 * Matches the generic RelayEnvelope<T> record in RelayClient.cs
 */
export interface RelayEnvelope<T = unknown> {
  /** Topic the message was sent to. */
  topic: string;
  /** Message payload. */
  payload: T;
  /** Timestamp in Unix milliseconds. */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// Service Interfaces
// ═══════════════════════════════════════════════════════════

/**
 * Interface for the main Cinacoin client.
 * Mirrors Cinacoin.CinacoinClient
 */
export interface ICinacoinClient {
  /**
   * Gets account information for the connected wallet.
   * @param walletId - Wallet connector identifier (e.g., "metamask", "walletconnect", "coinbase").
   * @param cancellationToken - Optional cancellation token.
   * @returns Account information including address, chain ID, balance, and label.
   */
  getAccountAsync(walletId: string, cancellationToken?: AbortSignal): Promise<Account>;

  /**
   * Gets the native token balance for a given address.
   * @param address - Wallet address (e.g., "0x...").
   * @param chainId - Chain ID (default: "1" for Ethereum mainnet).
   * @param cancellationToken - Optional cancellation token.
   * @returns The balance as a decimal value.
   */
  getBalanceAsync(
    address: string,
    chainId?: string,
    cancellationToken?: AbortSignal,
  ): Promise<number>;

  /**
   * Gets the list of available networks.
   * @param cancellationToken - Optional cancellation token.
   * @returns List of available networks.
   */
  getNetworksAsync(cancellationToken?: AbortSignal): Promise<Network[]>;

  /**
   * Creates a new wallet session and returns pairing data.
   * @param walletId - Wallet connector identifier.
   * @param ns - Chain namespace (e.g., "eip155").
   * @param cancellationToken - Optional cancellation token.
   * @returns Session result containing a session ID and pairing URI.
   */
  createSessionAsync(
    walletId: string,
    ns: string,
    cancellationToken?: AbortSignal,
  ): Promise<SessionResult>;

  /**
   * Connects to a wallet using the specified connection parameters.
   * @param parameters - Connection parameters including optional pairing URI, relay URL, and metadata.
   * @param cancellationToken - Optional cancellation token.
   * @returns Connection result with session ID, accounts, and chain ID.
   */
  connectAsync(
    parameters: ConnectParams,
    cancellationToken?: AbortSignal,
  ): Promise<ConnectionResult>;

  /**
   * Disconnects an active wallet session.
   * @param sessionId - The session ID to disconnect.
   * @param cancellationToken - Optional cancellation token.
   */
  disconnectAsync(sessionId: string, cancellationToken?: AbortSignal): Promise<void>;

  /**
   * Sends a transaction for signing by the connected wallet.
   * @param request - Transaction request containing from, to, value, data, etc.
   * @param cancellationToken - Optional cancellation token.
   * @returns The signed and broadcast transaction.
   */
  sendTransactionAsync(
    request: TransactionRequest,
    cancellationToken?: AbortSignal,
  ): Promise<Transaction>;

  /**
   * Signs a message using the connected wallet (EIP-191 personal sign).
   * @param address - Address of the signer.
   * @param message - Message to sign.
   * @param cancellationToken - Optional cancellation token.
   * @returns Hex-encoded signature string.
   */
  signMessageAsync(
    address: string,
    message: string,
    cancellationToken?: AbortSignal,
  ): Promise<string>;

  /**
   * Signs typed structured data using the connected wallet (EIP-712).
   * @param address - Address of the signer.
   * @param typedData - JSON-encoded EIP-712 typed data object.
   * @param cancellationToken - Optional cancellation token.
   * @returns Hex-encoded signature string.
   */
  signTypedDataAsync(
    address: string,
    typedData: string,
    cancellationToken?: AbortSignal,
  ): Promise<string>;

  /** Disposes the client and releases resources. */
  dispose(): void | Promise<void>;
}

/**
 * Interface for the WalletService.
 * Mirrors Cinacoin.Services.WalletService
 */
export interface IWalletService {
  /**
   * Gets the native token balance for a specific address.
   * @param address - Wallet address.
   * @param chainId - Chain ID (default: "1" for Ethereum mainnet).
   * @param cancellationToken - Optional cancellation token.
   * @returns The balance as a decimal.
   */
  getTokenBalanceAsync(
    address: string,
    chainId?: string,
    cancellationToken?: AbortSignal,
  ): Promise<number>;

  /**
   * Gets available networks.
   * @param cancellationToken - Optional cancellation token.
   * @returns Array of available networks.
   */
  getNetworksAsync(cancellationToken?: AbortSignal): Promise<Network[]>;

  /**
   * Gets account information for a connected wallet.
   * @param walletId - Wallet connector ID (e.g., "metamask", "walletconnect").
   * @param cancellationToken - Optional cancellation token.
   * @returns Account information.
   */
  getAccountAsync(walletId: string, cancellationToken?: AbortSignal): Promise<Account>;

  /**
   * Creates a new wallet session and returns pairing data.
   * @param walletId - Wallet connector ID.
   * @param ns - Chain namespace (e.g., "eip155").
   * @param cancellationToken - Optional cancellation token.
   * @returns Session result with pairing URI.
   */
  createSessionAsync(
    walletId: string,
    ns: string,
    cancellationToken?: AbortSignal,
  ): Promise<SessionResult>;

  /**
   * Connects to a wallet using the specified connection parameters.
   * @param parameters - Connection parameters.
   * @param cancellationToken - Optional cancellation token.
   * @returns Connection result with session details.
   */
  connectAsync(
    parameters: ConnectParams,
    cancellationToken?: AbortSignal,
  ): Promise<ConnectionResult>;

  /**
   * Disconnects the current wallet session.
   * @param sessionId - Session ID to disconnect.
   * @param cancellationToken - Optional cancellation token.
   */
  disconnectAsync(sessionId: string, cancellationToken?: AbortSignal): Promise<void>;

  /**
   * Sends a transaction for signing by the connected wallet.
   * @param request - Transaction request details.
   * @param cancellationToken - Optional cancellation token.
   * @returns The signed transaction.
   */
  sendTransactionAsync(
    request: TransactionRequest,
    cancellationToken?: AbortSignal,
  ): Promise<Transaction>;

  /**
   * Signs a message using the connected wallet.
   * @param address - Address of the signer.
   * @param message - Message to sign.
   * @param cancellationToken - Optional cancellation token.
   * @returns The hex-encoded signature.
   */
  signMessageAsync(
    address: string,
    message: string,
    cancellationToken?: AbortSignal,
  ): Promise<string>;

  /**
   * Signs a typed data message (EIP-712) using the connected wallet.
   * @param address - Address of the signer.
   * @param typedData - JSON-encoded EIP-712 typed data.
   * @param cancellationToken - Optional cancellation token.
   * @returns The hex-encoded signature.
   */
  signTypedDataAsync(
    address: string,
    typedData: string,
    cancellationToken?: AbortSignal,
  ): Promise<string>;

  /** Disposes the service and releases resources. */
  dispose(): void | Promise<void>;
}

/**
 * Interface for the RelayClient.
 * Mirrors Cinacoin.Services.RelayClient
 */
export interface IRelayClient {
  /** Whether the relay client has an active connection. */
  readonly isConnected: boolean;

  /**
   * Establishes a connection to the relay server.
   * @param cancellationToken - Optional cancellation token.
   */
  connectAsync(cancellationToken?: AbortSignal): Promise<void>;

  /**
   * Disconnects from the relay server.
   * @param cancellationToken - Optional cancellation token.
   */
  disconnectAsync(cancellationToken?: AbortSignal): Promise<void>;

  /**
   * Sends a JSON message to the relay server.
   * @param topic - Message topic.
   * @param payload - Payload to send.
   * @param cancellationToken - Optional cancellation token.
   */
  sendMessageAsync<T>(
    topic: string,
    payload: T,
    cancellationToken?: AbortSignal,
  ): Promise<void>;

  /**
   * Receives a single message from the relay server.
   * @param cancellationToken - Optional cancellation token.
   * @returns The deserialized relay envelope.
   */
  receiveMessageAsync<T>(cancellationToken?: AbortSignal): Promise<RelayEnvelope<T>>;

  /**
   * Subscribes to a topic and starts listening for messages.
   * @param topic - Topic to subscribe to.
   * @param cancellationToken - Optional cancellation token.
   */
  subscribeAsync(topic: string, cancellationToken?: AbortSignal): Promise<void>;

  /**
   * Unsubscribes from a topic.
   * @param topic - Topic to unsubscribe from.
   * @param cancellationToken - Optional cancellation token.
   */
  unsubscribeAsync(topic: string, cancellationToken?: AbortSignal): Promise<void>;

  /** Disposes the relay client and releases resources. */
  dispose(): void | Promise<void>;
}

/**
 * Interface for CryptoUtils static helpers.
 * Mirrors Cinacoin.Services.CryptoUtils
 */
export interface ICryptoUtils {
  /**
   * Computes a hash of the input data (SHA-256 placeholder for Keccak-256).
   * @param data - Input byte array.
   * @returns 32-byte hash as Uint8Array.
   */
  keccak256(data: Uint8Array): Uint8Array;

  /**
   * Computes a hash of a UTF-8 string.
   * @param input - Input string.
   * @returns 32-byte hash as Uint8Array.
   */
  keccak256Str(input: string): Uint8Array;

  /**
   * Computes the SHA-256 hash of the input data.
   * @param data - Input byte array.
   * @returns 32-byte SHA-256 hash as Uint8Array.
   */
  sha256(data: Uint8Array): Uint8Array;

  /**
   * Computes the SHA-512 hash of the input data.
   * @param data - Input byte array.
   * @returns 64-byte SHA-512 hash as Uint8Array.
   */
  sha512(data: Uint8Array): Uint8Array;

  /**
   * Converts a byte array to a hex string with optional "0x" prefix.
   * @param bytes - Input bytes.
   * @param prefix - Whether to prepend "0x".
   * @returns Hex-encoded string.
   */
  toHex(bytes: Uint8Array, prefix?: boolean): string;

  /**
   * Parses a hex string (with or without "0x" prefix) into a byte array.
   * @param hex - Hex-encoded string.
   * @returns Byte array as Uint8Array.
   */
  fromHex(hex: string): Uint8Array;

  /**
   * Derives an Ethereum address from a public key.
   * @param publicKey - Public key bytes (65 bytes with 04 prefix, or 64 bytes).
   * @returns 20-byte address with "0x" prefix.
   */
  deriveEthAddress(publicKey: Uint8Array): string;

  /**
   * Encodes a signature in Ethereum's 65-byte format (r || s || v).
   * @param r - R component (32 bytes).
   * @param s - S component (32 bytes).
   * @param v - Recovery ID.
   * @returns 65-byte signature as Uint8Array.
   */
  encodeEthereumSignature(r: Uint8Array, s: Uint8Array, v: number): Uint8Array;

  /**
   * Decodes an Ethereum 65-byte signature into its components.
   * @param signature - 65-byte signature.
   * @returns Tuple of (r, s, v) components.
   */
  decodeEthereumSignature(
    signature: Uint8Array,
  ): { r: Uint8Array; s: Uint8Array; v: number };

  /**
   * Generates cryptographically secure random bytes.
   * @param count - Number of bytes to generate.
   * @returns Random byte array as Uint8Array.
   */
  generateRandomBytes(count: number): Uint8Array;

  /**
   * Generates a random hex string suitable for use as a session key or nonce.
   * @param byteCount - Number of random bytes (default 32).
   * @returns Hex string with "0x" prefix.
   */
  generateRandomNonce(byteCount?: number): string;
}

// ═══════════════════════════════════════════════════════════
// Stub Implementations (satisfy TS types, no runtime deps)
// ═══════════════════════════════════════════════════════════

/**
 * Stub implementation of ICinacoinClient.
 * Extend or replace with a real HTTP-based implementation.
 */
export class CinacoinClient implements ICinacoinClient {
  protected projectId: string;
  protected baseUrl: string;

  constructor(projectId: string, baseUrl: string = "https://api.cinacoin.com") {
    this.projectId = projectId;
    this.baseUrl = baseUrl;
  }

  async getAccountAsync(walletId: string, _cancellationToken?: AbortSignal): Promise<Account> {
    void walletId;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async getBalanceAsync(
    address: string,
    chainId: string = "1",
    _cancellationToken?: AbortSignal,
  ): Promise<number> {
    void address;
    void chainId;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async getNetworksAsync(_cancellationToken?: AbortSignal): Promise<Network[]> {
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async createSessionAsync(
    walletId: string,
    ns: string,
    _cancellationToken?: AbortSignal,
  ): Promise<SessionResult> {
    void walletId;
    void ns;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async connectAsync(
    parameters: ConnectParams,
    _cancellationToken?: AbortSignal,
  ): Promise<ConnectionResult> {
    void parameters;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async disconnectAsync(
    sessionId: string,
    _cancellationToken?: AbortSignal,
  ): Promise<void> {
    void sessionId;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async sendTransactionAsync(
    request: TransactionRequest,
    _cancellationToken?: AbortSignal,
  ): Promise<Transaction> {
    void request;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async signMessageAsync(
    address: string,
    message: string,
    _cancellationToken?: AbortSignal,
  ): Promise<string> {
    void address;
    void message;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  async signTypedDataAsync(
    address: string,
    typedData: string,
    _cancellationToken?: AbortSignal,
  ): Promise<string> {
    void address;
    void typedData;
    throw new Error("Not implemented — provide a concrete implementation.");
  }

  dispose(): void {
    // no-op for stub
  }
}

/**
 * Stub implementation of IWalletService.
 */
export class WalletService implements IWalletService {
  protected client: ICinacoinClient;

  constructor(client: ICinacoinClient) {
    this.client = client;
  }

  async getTokenBalanceAsync(
    address: string,
    chainId: string = "1",
    cancellationToken?: AbortSignal,
  ): Promise<number> {
    return this.client.getBalanceAsync(address, chainId, cancellationToken);
  }

  async getNetworksAsync(cancellationToken?: AbortSignal): Promise<Network[]> {
    return this.client.getNetworksAsync(cancellationToken);
  }

  async getAccountAsync(walletId: string, cancellationToken?: AbortSignal): Promise<Account> {
    return this.client.getAccountAsync(walletId, cancellationToken);
  }

  async createSessionAsync(
    walletId: string,
    ns: string,
    cancellationToken?: AbortSignal,
  ): Promise<SessionResult> {
    return this.client.createSessionAsync(walletId, ns, cancellationToken);
  }

  async connectAsync(
    parameters: ConnectParams,
    cancellationToken?: AbortSignal,
  ): Promise<ConnectionResult> {
    return this.client.connectAsync(parameters, cancellationToken);
  }

  async disconnectAsync(sessionId: string, cancellationToken?: AbortSignal): Promise<void> {
    return this.client.disconnectAsync(sessionId, cancellationToken);
  }

  async sendTransactionAsync(
    request: TransactionRequest,
    cancellationToken?: AbortSignal,
  ): Promise<Transaction> {
    return this.client.sendTransactionAsync(request, cancellationToken);
  }

  async signMessageAsync(
    address: string,
    message: string,
    cancellationToken?: AbortSignal,
  ): Promise<string> {
    return this.client.signMessageAsync(address, message, cancellationToken);
  }

  async signTypedDataAsync(
    address: string,
    typedData: string,
    cancellationToken?: AbortSignal,
  ): Promise<string> {
    return this.client.signTypedDataAsync(address, typedData, cancellationToken);
  }

  dispose(): void | Promise<void> {
    return this.client.dispose();
  }
}
