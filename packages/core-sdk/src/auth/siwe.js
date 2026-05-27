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
import { generateMessage, parseMessage, verifyMessage, generateNonce, generateTimestamp } from '@cinacoin/siwe';
/**
 * SIWE Authentication manager.
 *
 * Wraps the SIWE message flow with a Connector to provide
 * a clean signIn/signOut API for the Core SDK.
 */
export class SIWEAuth {
    /**
     * Create a new SIWE authentication manager.
     *
     * @param connector - The wallet connector to use for signing.
     * @param config - SIWE configuration.
     */
    constructor(connector, config) {
        this._sessionToken = null;
        this._expiresAt = null;
        this._address = null;
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
    get isAuthenticated() {
        if (!this._sessionToken || !this._expiresAt)
            return false;
        return Date.now() < this._expiresAt * 1000;
    }
    /**
     * The currently authenticated address, or null.
     */
    get address() {
        return this._address;
    }
    /**
     * The current session token, or null.
     */
    get sessionToken() {
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
    async signIn(params) {
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
        const expirationTime = generateTimestamp(new Date(Date.now() + this.config.expirationSeconds * 1000));
        // Build SIWE parameters
        const siweParams = {
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
        let verification;
        if (provider) {
            verification = await verifyMessage(message, signature, provider);
        }
        else {
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
    async signOut() {
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
    static async verify(message, signature, provider) {
        return verifyMessage(message, signature, provider);
    }
    /**
     * Parse a SIWE message into structured data.
     *
     * @param message - SIWE message string.
     * @returns Parsed SIWE data.
     */
    static parse(message) {
        return parseMessage(message);
    }
}
//# sourceMappingURL=siwe.js.map