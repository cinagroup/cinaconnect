/**
 * SIWX (Sign-In with Cross-chain) type definitions.
 *
 * Unified authentication types for EVM, Solana, and Bitcoin chains.
 */

/** Supported chain types for cross-chain sign-in. */
export type ChainType = 'evm' | 'solana' | 'bitcoin' | 'ton' | 'tron';

/**
 * Unified parameters for cross-chain sign-in.
 */
export interface SIWXParams {
  /**
   * RFC 3986 URI referring to the domain requesting the signing.
   */
  domain: string;

  /**
   * Wallet address (format depends on chain type):
   * - EVM: 0x-prefixed 40-char hex address
   * - Solana: Base58-encoded public key
   * - Bitcoin: P2PKH/P2WPKH address
   */
  address: string;

  /**
   * Human-readable statement (optional).
   */
  statement?: string;

  /**
   * RFC 3986 URI of the resource being authenticated.
   */
  uri: string;

  /**
   * Message version (default: "1").
   */
  version?: string;

  /**
   * Chain identifier:
   * - EVM: EIP-155 chain ID (e.g., 1 for mainnet)
   * - Solana: CAIP-2 reference (e.g., "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
   * - Bitcoin: CAIP-2 reference (e.g., "000000000019d6689c085ae165831e93")
   */
  chainId: number | string;

  /**
   * Anti-replay nonce.
   */
  nonce: string;

  /** ISO 8601 issuance timestamp. */
  issuedAt?: string;

  /** ISO 8601 expiration timestamp. */
  expirationTime?: string;

  /** ISO 8601 not-before timestamp. */
  notBefore?: string;

  /** System-specific request identifier. */
  requestId?: string;

  /** List of resource URIs. */
  resources?: string[];
}

/**
 * Result of a cross-chain sign-in operation.
 */
export interface SIWXResult {
  /** Chain type used for sign-in. */
  chainType: ChainType;

  /** Parsed message data. */
  data: Record<string, any>;

  /** Signature (hex or base58 depending on chain). */
  signature: string;

  /** Raw message that was signed. */
  message: string;

  /** Whether verification succeeded. */
  valid: boolean;

  /** Error message if verification failed. */
  error?: string;
}

/**
 * Chain-specific message format options.
 */
export interface SIWXFormatOptions {
  /**
   * Whether to wrap the message in a structured format.
   * - EVM: EIP-4361 structured text
   * - Solana: Plain text with domain header
   * - Bitcoin: BIP-322 signing envelope
   */
  wrap?: boolean;

  /** Custom encoding for the message bytes. */
  encoding?: 'utf8' | 'hex' | 'base64';
}

/**
 * Verification input for cross-chain signature checking.
 */
export interface SIWXVerifyInput {
  /** The raw message that was signed. */
  message: string;

  /** The signature to verify. */
  signature: string;

  /** The expected signer's address. */
  address: string;

  /** Chain type for verification method selection. */
  chainType: ChainType;
}
