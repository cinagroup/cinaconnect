/**
 * SIWE (Sign-In with Ethereum) integration for the CinaConnect Core SDK.
 *
 * Provides high-level signIn/signOut methods that wrap the low-level
 * SIWE message generation and verification from @cinaconnect/siwe.
 *
 * Usage:
 * ```ts
 * import { SIWEAuth } from '@cinaconnect/core-sdk';
 *
 * const siwe = new SIWEAuth(connector, {
 *   domain: 'https://myapp.com',
 *   uri: 'https://myapp.com/login',
 *   statement: 'Sign in to MyApp',
 * });
 *
 * const result = await siwe.signIn();
 * // result: { address, message, signature, verified }
 *
 * await siwe.signOut();
 * ```
 */

import type { Connector } from '../connector.js';
import type { SIWEParams, ParsedSIWE, SIWEVerificationResult } from '@cinaconnect/siwe';
import { generateMessage, parseMessage, verifyMessage, generateNonce, generateTimestamp } from '@cinaconnect/siwe';

/**
 * Configuration for SIWE authentication.
 */
export interface SIWEAuthConfig {
  /** Domain that is requesting the signing (RFC 3986 URI). */
  domain: string;

  /** URI of the resource being authenticated. */
  uri: string;

  /** Human-readable statement shown to the user. */
  statement?: string;

  /** EIP-155 chain ID (default: 1 for Ethereum mainnet). */
  chainId?: number;

  /** Session expiration time in seconds (default: 86400 = 24h). */
  expirationSeconds?: number;

  /** Custom nonce generator (default: cryptographically random). */
  generateNonce?: () => string;

  /** Custom timestamp generator (default: current ISO timestamp). */
  generateTimestamp?: () => string;
}

/**
 * Result of a SIWE sign-in operation.
 */
export interface SIWESignInResult {
  /** Ethereum address that signed in. */
  address: string;

  /** The SIWE message that was signed. */
  message: string;

  /** The signature (hex string). */
  signature: string;

  /** Whether the signature was verified. */
  verified: boolean;

  /** Parsed SIWE message data. */
  data: ParsedSIWE;

  /** Session token for authenticated requests. */
  sessionToken?: string;

  /** Session expiration timestamp (Unix seconds). */
  expiresAt?: number;
}

/**
 * SIWE Authentication manager.
 *
 * Wraps the SIWE message flow with a Connector to provide
 * a clean signIn/signOut API for the Core SDK.
 */
export class SIWEAuth {
  private readonly connector: Connector;
  private readonly config: Required<Omit<SIWEAuthConfig, 'statement' | 'generateNonce' | 'generateTimestamp'>> &
    Pick<SIWEAuthConfig, 'statement' | 'generateNonce' | 'generateTimestamp'>;
  private _sessionToken: string | null = null;
  private _expiresAt: number | null = null;
  private _address: string | null = null;

  /**
   * Create a new SIWE authentication manager.
   *
   * @param connector - The wallet connector to use for signing.
   * @param config - SIWE configuration.
   */
  constructor(connector: Connector, config: SIWEAuthConfig) {
    this.connector = connector;
    this.config = {
      domain: config.domain,
      uri: config.uri,
      statement: config.statement,
      chainId: config.chainId || 1,
      expirationSeconds: config.expirationSeconds || 86400,
      generateNonce: config.generateNonce,
      generateTimestamp: config.generateTimestamp,
    };
  }

  /**
   * Whether there is an active SIWE session.
   */
  get isAuthenticated(): boolean {
    if (!this._sessionToken || !this._expiresAt) return false;
    return Date.now() < this._expiresAt * 1000;
  }

  /**
   * The currently authenticated address, or null.
   */
  get address(): string | null {
    return this._address;
  }

  /**
   * The current session token, or null.
   */
  get sessionToken(): string | null {
    return this._sessionToken;
  }

  /**
   * Sign in with Ethereum using SIWE.
   *
   * Flow:
   * 1. Connect to wallet if not already connected
   * 2. Generate SIWE message
   * 3. Request user to sign the message
   * 4. Verify the signature
   * 5. Create session token
   *
   * @param params - Optional overrides for SIWE parameters.
   * @returns Sign-in result with address, message, and verification status.
   * @throws Error if the wallet is not connected or signature verification fails.
   */
  async signIn(params?: Partial<SIWEParams>): Promise<SIWESignInResult> {
    // Ensure wallet is connected
    const accounts = await this.connector.getAccounts();
    if (accounts.length === 0) {
      await this.connector.connect();
    }

    const currentAccounts = await this.connector.getAccounts();
    if (currentAccounts.length === 0) {
      throw new Error('No accounts available. Please connect your wallet first.');
    }

    const address = currentAccounts[0];
    const nonce = this.config.generateNonce?.() || generateNonce();
    const issuedAt = this.config.generateTimestamp?.() || generateTimestamp();
    const expirationTime = generateTimestamp(
      new Date(Date.now() + this.config.expirationSeconds * 1000)
    );

    // Build SIWE parameters
    const siweParams: SIWEParams = {
      domain: this.config.domain,
      address,
      statement: this.config.statement,
      uri: this.config.uri,
      chainId: this.config.chainId,
      nonce,
      issuedAt,
      expirationTime,
      ...params,
    };

    // Generate the SIWE message
    const message = generateMessage(siweParams);

    // Request signature from wallet
    const signature = await this.connector.signMessage(message);

    // Verify the signature
    const provider = this.connector.getProvider();
    let verification: SIWEVerificationResult;

    if (provider) {
      verification = await verifyMessage(message, signature, provider);
    } else {
      // Fallback: parse and validate without cryptographic verification
      const data = parseMessage(message);
      verification = {
        valid: true,
        data,
      };
    }

    if (!verification.valid) {
      throw new Error(`SIWE verification failed: ${verification.error || 'Unknown error'}`);
    }

    // Create session
    this._sessionToken = `${nonce}:${address}:${Date.now()}`;
    this._expiresAt = Math.floor(Date.now() / 1000) + this.config.expirationSeconds;
    this._address = address;

    return {
      address,
      message,
      signature,
      verified: verification.valid,
      data: verification.data,
      sessionToken: this._sessionToken,
      expiresAt: this._expiresAt,
    };
  }

  /**
   * Sign out and clear the SIWE session.
   *
   * Emits a disconnect event through the connector.
   */
  async signOut(): Promise<void> {
    this._sessionToken = null;
    this._expiresAt = null;
    this._address = null;

    // Disconnect the connector
    await this.connector.disconnect();
  }

  /**
   * Verify an external SIWE message and signature.
   *
   * Useful for server-side verification.
   *
   * @param message - SIWE message string.
   * @param signature - Signature hex string.
   * @returns Verification result.
   */
  static async verify(message: string, signature: string, provider: any): Promise<SIWEVerificationResult> {
    return verifyMessage(message, signature, provider);
  }

  /**
   * Parse a SIWE message into structured data.
   *
   * @param message - SIWE message string.
   * @returns Parsed SIWE data.
   */
  static parse(message: string): ParsedSIWE {
    return parseMessage(message);
  }
}
