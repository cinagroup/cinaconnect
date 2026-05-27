/**
 * Social Login type definitions.
 *
 * Types for OAuth2 providers, email auth, and wallet derivation.
 */

/** Supported social login providers. */
export type SocialProvider = 'google' | 'apple' | 'twitter' | 'email' | 'phone' | 'x' | 'github' | 'discord' | 'facebook';

/**
 * Base parameters for social login.
 */
export interface SocialLoginParams {
  /** OAuth client ID for the provider. */
  clientId: string;

  /** OAuth redirect URI. */
  redirectUri: string;

  /** Optional OAuth scope overrides. */
  scopes?: string[];

  /** Optional state parameter for CSRF protection. */
  state?: string;
}

/**
 * Google-specific login parameters.
 */
export interface GoogleLoginParams extends SocialLoginParams {
  /** Google OAuth client ID. */
  clientId: string;
  /** Optional hosted domain restriction (e.g., "example.com"). */
  hostedDomain?: string;
}

/**
 * Apple Sign-In parameters.
 */
export interface AppleLoginParams extends SocialLoginParams {
  /** Apple Services ID. */
  clientId: string;
  /** Apple Team ID. */
  teamId: string;
  /** Apple Key ID for JWT signing. */
  keyId: string;
  /** Apple private key content (PKCS#8). */
  privateKey: string;
}

/**
 * Twitter/X OAuth2 parameters.
 */
export interface TwitterLoginParams extends SocialLoginParams {
  /** Twitter API Key. */
  clientId: string;
  /** Twitter API Secret Key. */
  clientSecret: string;
}

/**
 * GitHub OAuth2 parameters.
 */
export interface GitHubLoginParams extends SocialLoginParams {
  /** GitHub OAuth App client ID. */
  clientId: string;
  /** GitHub OAuth App client secret. */
  clientSecret: string;
}

/**
 * Email-based login parameters.
 */
export interface EmailLoginParams {
  /** User's email address. */
  email: string;
  /** Optional custom OTP length (default: 6). */
  otpLength?: number;
  /** Optional custom OTP TTL in seconds (default: 300). */
  otpTtlSeconds?: number;
}

/**
 * Result of a social login operation.
 */
export interface SocialLoginResult {
  /** Provider that was used. */
  provider: SocialProvider;

  /** Provider-specific user ID. */
  providerUserId: string;

  /** User's email (if available). */
  email?: string;

  /** User's display name (if available). */
  displayName?: string;

  /** User's profile picture URL (if available). */
  profilePicture?: string;

  /** JWT authentication token. */
  jwtToken: string;

  /** Derived wallet address. */
  walletAddress: string;

  /** Public key for the derived wallet. */
  publicKey?: string;

  /** Whether this is a first-time login (new account). */
  isNewUser: boolean;

  /** Token expiration timestamp (Unix seconds). */
  expiresAt: number;
}

/**
 * OAuth2 token response from provider.
 */
export interface OAuth2TokenResponse {
  /** Access token. */
  accessToken: string;

  /** Token type (typically "Bearer"). */
  tokenType: string;

  /** Token expiry in seconds. */
  expiresIn: number;

  /** Refresh token (if available). */
  refreshToken?: string;

  /** Granted scopes. */
  scope?: string;

  /** ID token (for OpenID Connect). */
  idToken?: string;
}

/**
 * OAuth2 user profile from provider.
 */
export interface OAuth2UserProfile {
  /** Provider-specific user ID. */
  sub: string;
  /** Email address. */
  email?: string;
  /** Display name. */
  name?: string;
  /** Profile picture URL. */
  picture?: string;
  /** Email verified flag. */
  emailVerified?: boolean;
}

/**
 * Magic link parameters for email authentication.
 */
export interface MagicLinkParams {
  /** Destination email address. */
  email: string;
  /** Redirect URL after clicking the magic link. */
  redirectUrl: string;
  /** Optional link expiration in seconds (default: 3600). */
  expiresInSeconds?: number;
}
