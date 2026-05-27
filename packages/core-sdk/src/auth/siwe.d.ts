/**
 * SIWE (Sign-In with Ethereum) integration for the Cinacoin Core SDK.
 *
 * Provides high-level signIn/signOut methods that wrap the low-level
 * SIWE message generation and verification from @cinacoin/siwe.
 *
 * Usage:
 * ```ts
 * import { SIWEAuth } from '@cinacoin/core-sdk';
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
import type { SIWEParams, ParsedSIWE, SIWEVerificationResult } from '@cinacoin/siwe';
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
export declare class SIWEAuth {
    private readonly connector;
    private readonly config;
    private _sessionToken;
    private _expiresAt;
    private _address;
    /**
     * Create a new SIWE authentication manager.
     *
     * @param connector - The wallet connector to use for signing.
     * @param config - SIWE configuration.
     */
    constructor(connector: Connector, config: SIWEAuthConfig);
    /**
     * Whether there is an active SIWE session.
     */
    get isAuthenticated(): boolean;
    /**
     * The currently authenticated address, or null.
     */
    get address(): string | null;
    /**
     * The current session token, or null.
     */
    get sessionToken(): string | null;
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
    signIn(params?: Partial<SIWEParams>): Promise<SIWESignInResult>;
    /**
     * Sign out and clear the SIWE session.
     *
     * Emits a disconnect event through the connector.
     */
    signOut(): Promise<void>;
    /**
     * Verify an external SIWE message and signature.
     *
     * Useful for server-side verification.
     *
     * @param message - SIWE message string.
     * @param signature - Signature hex string.
     * @returns Verification result.
     */
    static verify(message: string, signature: string, provider: any): Promise<SIWEVerificationResult>;
    /**
     * Parse a SIWE message into structured data.
     *
     * @param message - SIWE message string.
     * @returns Parsed SIWE data.
     */
    static parse(message: string): ParsedSIWE;
}
//# sourceMappingURL=siwe.d.ts.map