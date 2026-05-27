/**
 * Email OTP with JWT-based magic links.
 *
 * Generates cryptographically signed magic link tokens as JWTs,
 * and validates them server-side with proper signature checks.
 *
 * @packageDocumentation
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Parameters for sending a magic link.
 */
export interface MagicLinkSendParams {
  /** Destination email address. */
  email: string;
  /** Base URL for the magic link (appends ?token=...). */
  baseUrl: string;
  /** Optional redirect URL after verification. */
  redirectUrl?: string;
  /** Token TTL in seconds (default: 3600). */
  ttlSeconds?: number;
}

/**
 * Result of sending a magic link.
 */
export interface MagicLinkSendResult {
  /** The full magic link URL. */
  magicLink: string;
  /** The raw JWT token (for server-side storage/comparison). */
  token: string;
  /** Token expiry timestamp (Unix seconds). */
  expiresAt: number;
}

/**
 * Parameters for verifying a magic link.
 */
export interface MagicLinkVerifyParams {
  /** The JWT token from the magic link URL. */
  token: string;
  /** Expected email address (for binding verification). */
  expectedEmail: string;
}

/**
 * Result of verifying a magic link.
 */
export interface MagicLinkVerifyResult {
  /** Whether the magic link is valid. */
  valid: boolean;
  /** The email from the token payload. */
  email?: string;
  /** Redirect URL (if set during creation). */
  redirectUrl?: string;
  /** Error message (on failure). */
  error?: string;
}

// ─── Configuration ──────────────────────────────────────────────────────

/**
 * Configuration for magic link operations.
 */
export interface MagicLinkConfig {
  /** Secret key for signing magic link JWTs (at least 256 bits). */
  secret: string;
  /** Issuer claim for the JWT. */
  issuer?: string;
}

const DEFAULT_ISSUER = 'cinacoin-magic-link';

// ─── MagicLinkManager Class ─────────────────────────────────────────────

/**
 * Generates and verifies JWT-based magic links for email authentication.
 *
 * @example
 * ```ts
 * const ml = new MagicLinkManager({ secret: process.env.MAGIC_LINK_SECRET! });
 *
 * // Generate and send
 * const result = await ml.sendMagicLink({
 *   email: 'user@example.com',
 *   baseUrl: 'https://myapp.com/auth/callback',
 * });
 *
 * // In the email body: result.magicLink
 * // Send to user via email provider...
 *
 * // When user clicks the link, extract ?token= from the URL:
 * const verified = await ml.verifyMagicLink({
 *   token: tokenFromUrl,
 *   expectedEmail: 'user@example.com',
 * });
 *
 * if (verified.valid) {
 *   // Authenticated!
 * }
 * ```
 */
export class MagicLinkManager {
  private secretKey: Uint8Array;
  private issuer: string;

  constructor(config: MagicLinkConfig) {
    if (!config.secret || config.secret.length < 32) {
      throw new Error('MagicLinkManager requires a secret of at least 32 characters');
    }
    this.secretKey = new TextEncoder().encode(config.secret);
    this.issuer = config.issuer ?? DEFAULT_ISSUER;
  }

  /**
   * Generate a magic link with a signed JWT token.
   *
   * The JWT contains the email, redirect URL, and expiry.
   * The token is cryptographically signed and cannot be forged.
   *
   * @param params - Magic link parameters.
   * @returns Magic link URL and token data.
   */
  async sendMagicLink(params: MagicLinkSendParams): Promise<MagicLinkSendResult> {
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = params.ttlSeconds ?? 3600;
    const expiresAt = now + ttlSeconds;

    // Create a signed JWT payload
    const payload = {
      email: params.email,
      redirectUrl: params.redirectUrl || '',
      purpose: 'magic-link',
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .setIssuer(this.issuer)
      .setJti(generateTokenId())
      .sign(this.secretKey);

    // Build the full magic link URL
    const url = new URL(params.baseUrl);
    url.searchParams.set('token', token);
    if (params.redirectUrl) {
      url.searchParams.set('redirect', params.redirectUrl);
    }

    return {
      magicLink: url.toString(),
      token,
      expiresAt,
    };
  }

  /**
   * Verify a magic link token.
   *
   * Validates the JWT signature, checks expiration, and confirms
   * the email matches the expected address.
   *
   * @param params - Verification parameters.
   * @returns Verification result.
   */
  async verifyMagicLink(params: MagicLinkVerifyParams): Promise<MagicLinkVerifyResult> {
    try {
      const { payload } = await jwtVerify(params.token, this.secretKey, {
        issuer: this.issuer,
        algorithms: ['HS256'],
      });

      const tokenEmail = (payload as Record<string, unknown>).email as string;

      // Check email binding
      if (!tokenEmail || tokenEmail !== params.expectedEmail) {
        return {
          valid: false,
          error: `Email mismatch: token email "${tokenEmail}" does not match expected "${params.expectedEmail}"`,
        };
      }

      return {
        valid: true,
        email: tokenEmail,
        redirectUrl: (payload as Record<string, unknown>).redirectUrl as string,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: `Magic link verification failed: ${message}` };
    }
  }
}

/**
 * Generate a random JTI (unique token identifier).
 */
function generateTokenId(): string {
  return randomBytes(16).toString('hex');
}
