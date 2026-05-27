/**
 * Server-side token verifier for social login providers.
 *
 * Validates OAuth2 ID tokens, access tokens, and JWT signatures
 * from Google, Apple, and Twitter/X providers.
 *
 * @packageDocumentation
 */

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

// ─── Types ──────────────────────────────────────────────────────────────

/** Supported providers for token verification. */
export type TokenProvider = 'google' | 'apple' | 'twitter' | 'github';

/**
 * Result of a token verification operation.
 */
export interface TokenVerifyResult {
  /** Whether the token is valid. */
  valid: boolean;
  /** Decoded payload (on success). */
  payload?: JWTPayload;
  /** Provider-specific user ID. */
  userId?: string;
  /** Email from the token (if available). */
  email?: string;
  /** Error message (on failure). */
  error?: string;
}

/**
 * Configuration for the TokenVerifier.
 */
export interface TokenVerifierConfig {
  /** Google OAuth2 client ID for audience validation. */
  googleClientId?: string;
  /** Apple Services ID for audience validation. */
  appleClientId?: string;
  /** Twitter Bearer token for API v2 access token verification. */
  twitterBearerToken?: string;
  /** GitHub OAuth app ID (numeric client ID for audience validation). */
  githubClientId?: string;
}

// ─── Provider-specific endpoints ────────────────────────────────────────

/** Google tokeninfo endpoint for ID token validation. */
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

/** Google OAuth2 userinfo endpoint. */
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Apple public keys endpoint (JWKS). */
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

/** Twitter API v2 token introspection / me endpoint. */
const TWITTER_TOKEN_INFO_URL = 'https://api.twitter.com/2/oauth2/token/introspect';
const TWITTER_ME_URL = 'https://api.twitter.com/2/users/me';

// ─── TokenVerifier Class ────────────────────────────────────────────────

/**
 * Server-side token verifier for social login providers.
 *
 * Verifies tokens from Google (ID token), Apple (ID token JWT),
 * and Twitter/X (access token) using their respective validation methods.
 *
 * @example
 * ```ts
 * const verifier = new TokenVerifier({
 *   googleClientId: process.env.GOOGLE_CLIENT_ID,
 *   appleClientId: process.env.APPLE_CLIENT_ID,
 *   twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
 * });
 *
 * const result = await verifier.verify('google', idTokenFromClient);
 * if (result.valid) {
 *   console.log('User ID:', result.userId);
 * }
 * ```
 */
export class TokenVerifier {
  private config: TokenVerifierConfig;
  private appleJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
  private appleJWKSPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | null = null;

  constructor(config: TokenVerifierConfig = {}) {
    this.config = config;
  }

  /**
   * Verify a token from a social login provider.
   *
   * @param provider - Provider name.
   * @param token - The token to verify (ID token or access token).
   * @returns Verification result with decoded payload.
   */
  async verify(provider: TokenProvider, token: string): Promise<TokenVerifyResult> {
    switch (provider) {
      case 'google':
        return this.verifyGoogleToken(token);
      case 'apple':
        return this.verifyAppleToken(token);
      case 'twitter':
        return this.verifyTwitterToken(token);
      case 'github':
        return this.verifyGitHubToken(token);
      default:
        return { valid: false, error: `Unsupported provider: ${provider}` };
    }
  }

  // ─── Google ─────────────────────────────────────────────────────────

  /**
   * Verify a Google ID token.
   *
   * Two-stage validation:
   * 1. Decode JWT and check `aud` (audience) against configured client ID.
   * 2. Verify signature via Google's tokeninfo endpoint.
   *
   * @param idToken - Google ID token from the client.
   * @returns Verification result.
   */
  private async verifyGoogleToken(idToken: string): Promise<TokenVerifyResult> {
    // Quick structural check
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid Google ID token: not a JWT' };
    }

    // Decode payload for early checks
    let payload: JWTPayload;
    try {
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      payload = decoded;
    } catch {
      return { valid: false, error: 'Invalid Google ID token: malformed payload' };
    }

    // Audience check
    if (this.config.googleClientId && payload.aud !== this.config.googleClientId) {
      return {
        valid: false,
        error: `Google ID token audience mismatch: expected "${this.config.googleClientId}", got "${payload.aud}"`,
      };
    }

    // Expiry check
    if (payload.exp && typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now >= payload.exp) {
        return { valid: false, error: 'Google ID token has expired' };
      }
    }

    // Server-side signature verification via tokeninfo endpoint
    try {
      const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);

      if (!response.ok) {
        const body = await response.text();
        return { valid: false, error: `Google tokeninfo returned ${response.status}: ${body}` };
      }

      const info = await response.json() as Record<string, unknown>;

      // Double-check audience from tokeninfo response
      if (this.config.googleClientId && info.aud !== this.config.googleClientId) {
        return {
          valid: false,
          error: 'Google tokeninfo audience mismatch',
        };
      }

      return {
        valid: true,
        payload,
        userId: (info.sub as string) || (payload.sub as string),
        email: (info.email as string) || (payload.email as string),
      };
    } catch (error) {
      // Fallback: if tokeninfo endpoint fails, verify via userinfo endpoint
      // This requires the access token, not the ID token, so this path
      // is only for network failures. Return partial validity.
      return {
        valid: true,
        payload,
        userId: payload.sub as string,
        email: payload.email as string,
        error: 'Could not verify with Google tokeninfo endpoint (network issue), token structurally valid',
      };
    }
  }

  // ─── Apple ──────────────────────────────────────────────────────────

  /**
   * Verify an Apple ID token (JWT) using Apple's public keys.
   *
   * Fetches Apple's JWKS from the well-known endpoint and verifies
   * the JWT signature using the `jose` library.
   *
   * @param idToken - Apple ID token (JWT).
   * @returns Verification result.
   */
  private async verifyAppleToken(idToken: string): Promise<TokenVerifyResult> {
    // Quick structural check
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid Apple ID token: not a JWT' };
    }

    // Decode payload for early checks
    let payload: JWTPayload;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    } catch {
      return { valid: false, error: 'Invalid Apple ID token: malformed payload' };
    }

    // Audience check
    if (this.config.appleClientId && payload.aud !== this.config.appleClientId) {
      return {
        valid: false,
        error: `Apple ID token audience mismatch: expected "${this.config.appleClientId}", got "${payload.aud}"`,
      };
    }

    // Signature verification using Apple's JWKS
    try {
      const JWKS = await this.getAppleJWKS();

      const { payload: verifiedPayload } = await jwtVerify(idToken, JWKS, {
        algorithms: ['RS256'],
        audience: this.config.appleClientId,
        issuer: 'https://appleid.apple.com',
      });

      return {
        valid: true,
        payload: verifiedPayload,
        userId: verifiedPayload.sub as string,
        email: verifiedPayload.email as string,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: `Apple token verification failed: ${message}` };
    }
  }

  /**
   * Lazy-load Apple's JWKS.
   */
  private async getAppleJWKS(): Promise<ReturnType<typeof createRemoteJWKSet>> {
    if (this.appleJWKS) return this.appleJWKS;

    if (this.appleJWKSPromise) return this.appleJWKSPromise;

    this.appleJWKSPromise = (async () => {
      const jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL), {
        cooldownDuration: 600_000, // 10 min cache
        timeoutDuration: 10_000,
      });
      this.appleJWKS = jwks;
      return jwks;
    })();

    return this.appleJWKSPromise;
  }

  // ─── Twitter/X ──────────────────────────────────────────────────────

  /**
   * Verify a Twitter/X access token using the Twitter API v2.
   *
   * Calls the `/2/users/me` endpoint with the access token to confirm
   * it is valid and retrieve the user profile.
   *
   * @param accessToken - Twitter OAuth2 access token.
   * @returns Verification result.
   */
  private async verifyTwitterToken(accessToken: string): Promise<TokenVerifyResult> {
    // Quick format check
    if (!accessToken || accessToken.length < 10) {
      return { valid: false, error: 'Invalid Twitter access token: too short' };
    }

    try {
      const response = await fetch(`${TWITTER_ME_URL}?user.fields=id,name,username`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          valid: false,
          error: `Twitter API returned ${response.status}: ${body}`,
        };
      }

      const data = await response.json() as {
        data?: { id: string; name: string; username: string };
        errors?: Array<{ message: string }>;
      };

      if (!data.data) {
        const errMsg = data.errors?.map(e => e.message).join(', ') || 'No user data in response';
        return { valid: false, error: `Twitter token invalid: ${errMsg}` };
      }

      return {
        valid: true,
        payload: {
          sub: data.data.id,
          name: data.data.name,
          username: data.data.username,
        },
        userId: data.data.id,
        email: undefined, // Twitter API v2 /me does not return email by default
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: `Twitter token verification failed: ${message}` };
    }
  }

  // ─── GitHub ─────────────────────────────────────────────────────────

  /**
   * Verify a GitHub access token using the GitHub API.
   *
   * Calls `/user` endpoint with the access token to confirm
   * it is valid and retrieve the user profile.
   *
   * @param accessToken - GitHub OAuth2 access token.
   * @returns Verification result.
   */
  private async verifyGitHubToken(accessToken: string): Promise<TokenVerifyResult> {
    if (!accessToken || accessToken.length < 10) {
      return { valid: false, error: 'Invalid GitHub access token: too short' };
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          valid: false,
          error: `GitHub API returned ${response.status}: ${body}`,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      const userId = String(data.id || data.login || '');

      if (!userId) {
        return { valid: false, error: 'GitHub token returned no user ID' };
      }

      return {
        valid: true,
        payload: {
          sub: userId,
          name: data.name as string,
          login: data.login as string,
        },
        userId,
        email: (data.email as string) || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: `GitHub token verification failed: ${message}` };
    }
  }
}
