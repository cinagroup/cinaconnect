/**
 * Social wallet integration — links social login providers to embedded wallets.
 *
 * After successful social authentication, this manager:
 * 1. Creates or recovers an embedded wallet bound to the social identity
 * 2. Links multiple social providers to the same wallet
 * 3. Supports wallet recovery via any linked social provider
 *
 * Depends on `@cinacoin/embedded-wallet`.
 *
 * @packageDocumentation
 */

import { EmbeddedWallet } from './embedded-wallet-shim.js';
import { WalletManager } from './embedded-wallet-shim.js';
import type { AuthMethod, LinkedProvider, WalletSession, WalletBackup } from './embedded-wallet-shim.js';
import { TokenVerifier, type TokenProvider } from './token-verifier.js';
import { SessionManager } from './session-manager.js';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Social provider identity for wallet linking.
 */
export interface SocialProviderIdentity {
  /** Provider name (google, apple, twitter, email, phone). */
  provider: string;
  /** Provider-specific user ID. */
  providerUserId: string;
  /** User's email (if available). */
  email?: string;
}

/**
 * Result of linking a social provider to a wallet.
 */
export interface LinkProviderResult {
  /** The linked provider info. */
  linked: LinkedProvider;
  /** Whether this was the first provider linked to this wallet. */
  isFirstProvider: boolean;
}

/**
 * Result of social login with embedded wallet.
 */
export interface SocialWalletResult {
  /** Embedded wallet session. */
  walletSession: WalletSession;
  /** Wallet address. */
  walletAddress: string;
  /** Wallet public key (compressed). */
  publicKey: string;
  /** Whether this is a new wallet. */
  isNewUser: boolean;
  /** Linked social providers. */
  linkedProviders: LinkedProvider[];
  /** Session JWT token. */
  jwtToken: string;
  /** Session expiry (Unix seconds). */
  expiresAt: number;
}

/**
 * Configuration for the SocialWalletManager.
 */
export interface SocialWalletManagerConfig {
  /** Session secret for JWT signing. */
  sessionSecret: string;
  /** Token verifier configuration. */
  tokenVerifier?: ConstructorParameters<typeof TokenVerifier>[0];
  /** Wallet storage prefix. */
  walletId?: string;
}

// ─── Embedded Wallet Shim ───────────────────────────────────────────────

/**
 * Re-exports from embedded-wallet for downstream use.
 * In production, import directly from `@cinacoin/embedded-wallet`.
 * These are re-exported here to avoid a hard peer dependency at build time.
 */
export {
  EmbeddedWallet,
  WalletManager,
  type AuthMethod,
  type LinkedProvider,
  type WalletSession,
  type WalletBackup,
} from './embedded-wallet-shim.js';

// ─── SocialWalletManager Class ──────────────────────────────────────────

/**
 * Manages the integration between social login providers and embedded wallets.
 *
 * Handles:
 * - Creating wallets from social identities
 * - Linking multiple social providers to a single wallet
 * - Recovering wallets via any linked provider
 * - Session management with JWT tokens
 *
 * @example
 * ```ts
 * const socialWallet = new SocialWalletManager({
 *   sessionSecret: process.env.SESSION_SECRET!,
 *   tokenVerifier: {
 *     googleClientId: process.env.GOOGLE_CLIENT_ID,
 *   },
 * });
 *
 * // After Google OAuth flow completes:
 * const result = await socialWallet.loginWithProvider({
 *   provider: 'google',
 *   providerUserId: '123456',
 *   email: 'user@gmail.com',
 *   idToken: idTokenFromGoogle,
 * });
 *
 * console.log(result.walletAddress); // "0x..."
 * console.log(result.jwtToken);      // JWT session token
 * ```
 */
export class SocialWalletManager {
  private sessionManager: SessionManager;
  private tokenVerifier: TokenVerifier;
  private walletId: string;

  constructor(config: SocialWalletManagerConfig) {
    this.sessionManager = new SessionManager({
      secret: config.sessionSecret,
    });
    this.tokenVerifier = new TokenVerifier(config.tokenVerifier);
    this.walletId = config.walletId || 'cinacoin-social-wallet';
  }

  /**
   * Log in (or create) an embedded wallet via a social provider.
   *
   * First verifies the provider's token server-side, then creates
   * or recovers the embedded wallet bound to that identity.
   *
   * @param params - Social provider identity + token.
   * @returns Full social wallet result with session.
   */
  async loginWithProvider(params: SocialProviderIdentity & {
    /** The token to verify (ID token or access token). */
    token: string;
  }): Promise<SocialWalletResult> {
    // Step 1: Verify the provider token
    const tokenProvider = this._normalizeProvider(params.provider);
    const authMethod = this._toAuthMethod(params.provider);
    const verification = await this.tokenVerifier.verify(tokenProvider, params.token);

    if (!verification.valid) {
      throw new Error(`Token verification failed for ${params.provider}: ${verification.error}`);
    }

    // Step 2: Create the login identifier (provider-scoped)
    const identifier = this._buildIdentifier(tokenProvider, params.providerUserId, params.email);

    // Step 3: Try to recover existing wallet or create new one
    const walletManager = new WalletManager({
      id: this.walletId,
      authMethod,
      identifier,
      createdAt: new Date().toISOString(),
    });

    let walletSession: WalletSession;
    let isNewUser = false;

    try {
      // Try to login (recover) existing wallet
      walletSession = await walletManager.login(identifier);
    } catch {
      // No existing wallet — create a new one
      walletSession = await walletManager.create(authMethod, identifier);
      isNewUser = true;
    }

    // Step 4: Get wallet details
    const wallet = walletManager.getWallet(walletSession.walletId);
    if (!wallet) {
      throw new Error('Failed to get wallet instance after login');
    }

    const account = wallet.getAccount();

    // Step 5: Create session
    const session = await this.sessionManager.create({
      provider: params.provider,
      providerUserId: params.providerUserId,
      email: params.email,
      walletAddress: account.address,
      isNewUser,
    });

    return {
      walletSession,
      walletAddress: account.address,
      publicKey: account.publicKey,
      isNewUser,
      linkedProviders: [], // Populated via linkProvider
      jwtToken: session.accessToken,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Link a social provider to an existing wallet.
   *
   * Allows the user to access the same wallet via multiple
   * social providers (e.g., Google + Apple).
   *
   * @param walletId - The wallet to link to.
   * @param identity - Social provider identity.
   * @param token - Token to verify the identity.
   * @returns Link result.
   */
  async linkProvider(
    walletId: string,
    identity: SocialProviderIdentity,
    token: string
  ): Promise<LinkProviderResult> {
    // Verify the token first
    const provider = this._normalizeProvider(identity.provider);
    const verification = await this.tokenVerifier.verify(provider, token);

    if (!verification.valid) {
      throw new Error(`Token verification failed: ${verification.error}`);
    }

    // Link the provider to the wallet
    const walletManager = new WalletManager({
      id: this.walletId,
      authMethod: 'social',
      identifier: identity.providerUserId,
      createdAt: new Date().toISOString(),
    });

    const linked = await walletManager.linkProvider(
      walletId,
      identity.provider,
      identity.providerUserId
    );

    // Check if this is the first provider
    const wallets = await walletManager.listWallets();
    const isFirstProvider = wallets.length === 1;

    return {
      linked,
      isFirstProvider,
    };
  }

  /**
   * Recover a wallet using a linked social provider.
   *
   * If the user has multiple linked providers, any of them
   * can be used to recover the wallet.
   *
   * @param provider - Provider name.
   * @param providerUserId - Provider-specific user ID.
   * @param token - Token to verify.
   * @returns Wallet session and address.
   */
  async recoverWallet(
    provider: string,
    providerUserId: string,
    token: string,
    email?: string
  ): Promise<{
    walletSession: WalletSession;
    walletAddress: string;
    publicKey: string;
    jwtToken: string;
    expiresAt: number;
  }> {
    const tokenProvider = this._normalizeProvider(provider);
    const authMethod = this._toAuthMethod(provider);
    const verification = await this.tokenVerifier.verify(tokenProvider, token);

    if (!verification.valid) {
      throw new Error(`Recovery failed — token verification: ${verification.error}`);
    }

    const identifier = this._buildIdentifier(tokenProvider, providerUserId, email);

    const walletManager = new WalletManager({
      id: this.walletId,
      authMethod,
      identifier,
      createdAt: new Date().toISOString(),
    });

    const walletSession = await walletManager.login(identifier);

    const wallet = walletManager.getWallet(walletSession.walletId);
    if (!wallet) {
      throw new Error('Failed to recover wallet');
    }

    const account = wallet.getAccount();

    const session = await this.sessionManager.create({
      provider,
      providerUserId,
      email,
      walletAddress: account.address,
      isNewUser: false,
    });

    return {
      walletSession,
      walletAddress: account.address,
      publicKey: account.publicKey,
      jwtToken: session.accessToken,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Create an encrypted wallet backup.
   *
   * @param walletId - Wallet to back up.
   * @param password - Encryption password.
   * @returns Encrypted backup payload.
   */
  async backupWallet(walletId: string, password: string): Promise<WalletBackup> {
    const walletManager = new WalletManager({
      id: this.walletId,
      authMethod: 'social',
      identifier: 'backup',
      createdAt: new Date().toISOString(),
    });

    return walletManager.backup(walletId, password);
  }

  /**
   * Get the session manager for direct access.
   */
  get session(): SessionManager {
    return this.sessionManager;
  }

  // ─── Internal Helpers ───────────────────────────────────────────────

  /**
   * Normalize provider name to a known TokenProvider.
   */
  private _normalizeProvider(provider: string): TokenProvider {
    const normalized = provider.toLowerCase().trim();
    if (normalized === 'x') return 'twitter';
    if (normalized === 'google') return 'google';
    if (normalized === 'apple') return 'apple';
    if (normalized === 'twitter') return 'twitter';
    // Default to twitter for any other/unknown provider to avoid runtime crash
    // Caller should ensure the provider is one of the supported ones
    return 'twitter';
  }

  /**
   * Map a social provider name to an embedded wallet AuthMethod.
   */
  private _toAuthMethod(provider: string): AuthMethod {
    const normalized = provider.toLowerCase().trim();
    if (normalized === 'phone') return 'phone';
    if (normalized === 'email') return 'email';
    return 'social';
  }

  /**
   * Build a unique identifier for wallet derivation.
   *
   * Combines the provider name and user ID to ensure uniqueness
   * across providers while remaining deterministic.
   */
  private _buildIdentifier(provider: string, providerUserId: string, email?: string): string {
    if (email) {
      return `${provider}:${providerUserId}:${email.toLowerCase()}`;
    }
    return `${provider}:${providerUserId}`;
  }
}
