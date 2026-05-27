/**
 * SIWE (Sign-In with Ethereum) type definitions per EIP-4361.
 */

/**
 * Parameters required to generate a SIWE message.
 */
export interface SIWEParams {
  /**
   * RFC 3986 URI referring to the domain that is requesting the signing.
   * Example: "https://example.com"
   */
  domain: string;

  /**
   * Ethereum address performing the signing conformant to capitalization
   * encoded checksum specified in EIP-55 where applicable.
   */
  address: string;

  /**
   * Human-readable ASCII assertion that the user will sign off on.
   * Must not contain newline characters.
   */
  statement?: string;

  /**
   * RFC 3986 URI referring to the resource that is the subject of the signing.
   */
  uri: string;

  /**
   * Current version of the message. Must be "1".
   */
  version?: string;

  /**
   * EIP-155 Chain ID to which the session is bound, and the network where
   * Contract Accounts must be resolved.
   */
  chainId: number;

  /**
   * Randomized token used to prevent replay attacks.
   */
  nonce: string;

  /**
   * ISO 8601 datetime string of the current time.
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ
   */
  issuedAt?: string;

  /**
   * ISO 8601 datetime string after which the message is no longer valid.
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ
   */
  expirationTime?: string;

  /**
   * ISO 8601 datetime string before which the message is not valid.
   * Format: YYYY-MM-DDTHH:mm:ss.sssZ
   */
  notBefore?: string;

  /**
   * System-specific identifier used to uniquely refer to the authentication.
   */
  requestId?: string;

  /**
   * List of information or references to information the user wishes to have
   * resolved as part of authentication by the relying party. Each resource
   * must be an RFC 3986 URI.
   */
  resources?: string[];
}

/**
 * Parsed SIWE message fields.
 */
export interface ParsedSIWE {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources: string[];
}

/**
 * Result of SIWE signature verification.
 */
export interface SIWEVerificationResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Parsed SIWE message data. */
  data: ParsedSIWE;
  /** Error message if verification failed. */
  error?: string;
}

/**
 * Validation errors for SIWE messages.
 */
export interface SIWEValidationError {
  /** Field that failed validation. */
  field: string;
  /** Description of the validation failure. */
  message: string;
}

/**
 * Minimal provider interface for SIWE signature verification.
 * Supports viem/ethers v6 (recoverAddress), ethers v5 (verifyMessage),
 * and raw EIP-1193 providers (request).
 */
export interface SIWEProvider {
  /** viem / ethers v6: recover address from message + signature */
  recoverAddress?(args: { message: string; signature: string }): Promise<string>;
  /** ethers v5: verify a signed message */
  verifyMessage?(message: string, signature: string): Promise<string>;
  /** EIP-1193 raw request method */
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
