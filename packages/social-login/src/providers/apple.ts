/**
 * Apple Sign-In provider for social login.
 *
 * Implements Sign in with Apple using OAuth2 and JWT-based
 * client authentication (per Apple's requirements).
 *
 * Reference: https://developer.apple.com/sign-in-with-apple/
 */

import type { AppleLoginParams, SocialLoginResult, OAuth2UserProfile } from '../types.js';
import { TokenVerifier, type TokenVerifyResult } from '../token-verifier.js';

/** Apple OAuth2 authorization endpoint. */
const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';

/** Apple OAuth2 token endpoint. */
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';

/** Default scopes for Apple Sign-In. */
const DEFAULT_SCOPES = ['openid', 'email', 'name'];

/**
 * Generate an Apple client_secret JWT.
 *
 * Apple requires a JWT signed with your private key as the client_secret.
 *
 * @param params - Apple login parameters.
 * @returns JWT client_secret string.
 *
 * Note: In production, use the `jose` library for proper JWT generation.
 * This is a placeholder showing the required claims structure.
 */
/**
 * Generate an Apple client_secret JWT.
 *
 * Apple requires a JWT signed with your private key as the client_secret.
 *
 * @param params - Apple login parameters.
 * @returns JWT client_secret string.
 *
 * Uses `jose` to generate a properly signed ES256 JWT with the
 * required claims (iss, iat, exp, aud, sub).
 */
export async function generateAppleClientSecret(params: AppleLoginParams): Promise<string> {
  const { SignJWT, importPKCS8 } = await import('jose');

  const key = await importPKCS8(params.privateKey, 'ES256');

  const now = Math.floor(Date.now() / 1000);
  // Apple allows up to 6 months; we use 30 days for safety and rotation.
  const exp = now + 30 * 24 * 60 * 60;

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: params.keyId })
    .setIssuer(params.teamId)
    .setAudience('https://appleid.apple.com')
    .setSubject(params.clientId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
}

/**
 * Build the Apple Sign-In authorization URL.
 *
 * @param params - Apple login parameters.
 * @returns Authorization URL to redirect the user to.
 */
export function buildAppleAuthUrl(params: AppleLoginParams): string {
  const scopes = params.scopes || DEFAULT_SCOPES;
  const state = params.state || generateState();
  const responseMode = 'form_post'; // Apple requires form_post to get user data

  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code id_token',
    response_mode: responseMode,
    scope: scopes.join(' '),
    state,
  });

  return `${APPLE_AUTH_URL}?${query.toString()}`;
}

/**
 * Exchange an authorization code for tokens with Apple.
 *
 * @param code - Authorization code from Apple redirect.
 * @param params - Apple login parameters.
 * @param clientSecret - JWT client_secret (generated via generateAppleClientSecret).
 * @returns Token response (Apple doesn't return refresh tokens on web).
 */
export async function exchangeAppleCode(
  code: string,
  params: Pick<AppleLoginParams, 'clientId' | 'redirectUri'>,
  clientSecret: string
): Promise<{ idToken: string; accessToken?: string; expiresIn: number }> {
  const response = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: params.clientId,
      client_secret: clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apple token exchange failed: ${error}`);
  }

  return response.json() as Promise<any>;
}

/**
 * Decode the Apple ID token to extract user profile.
 *
 * Apple returns the ID token as a JWT with user claims.
 * On first login only, Apple also returns user name/email in the form POST body.
 *
 * @param idToken - Apple ID token (JWT).
 * @returns Decoded user profile.
 */
export function decodeAppleIdToken(idToken: string): OAuth2UserProfile {
  // Decode the JWT payload (second part)
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Apple ID token: not a valid JWT');
  }

  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8')
  );

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ? `${payload.name.firstName} ${payload.name.lastName}`.trim() : undefined,
  };
}

/**
 * Handle the full Apple login flow.
 *
 * @param code - Authorization code from Apple redirect.
 * @param params - Apple login parameters.
 * @param clientSecret - JWT client_secret.
 * @param deriveWallet - Function to derive a wallet address.
 * @param appleUserData - Optional user data from form POST (first login only).
 * @returns Social login result.
 */
export async function loginWithApple(
  code: string,
  params: AppleLoginParams,
  deriveWallet: (userId: string, email: string) => Promise<{ address: string; publicKey?: string }>,
  appleUserData?: { name?: { firstName?: string; lastName?: string }; email?: string }
): Promise<SocialLoginResult> {
  const clientSecret = await generateAppleClientSecret(params);
  const tokens = await exchangeAppleCode(code, params, clientSecret);

  // Server-side token verification
  const verifier = new TokenVerifier({ appleClientId: params.clientId });
  const verification: TokenVerifyResult = await verifier.verify('apple', tokens.idToken);
  if (!verification.valid) {
    throw new Error(`Apple ID token verification failed: ${verification.error}`);
  }

  const profile = decodeAppleIdToken(tokens.idToken);

  // Apple only returns name/email on first login via form POST
  const displayName = appleUserData?.name
    ? `${appleUserData.name.firstName || ''} ${appleUserData.name.lastName || ''}`.trim()
    : profile.name;
  const email = appleUserData?.email || profile.email;

  const wallet = await deriveWallet(profile.sub, email || '');

  return {
    provider: 'apple',
    providerUserId: profile.sub,
    email,
    displayName,
    jwtToken: tokens.idToken,
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNewUser: false,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expiresIn || 3600),
  };
}

/**
 * Verify an Apple ID token's signature.
 *
 * Fetches Apple's JWKS and verifies the JWT signature using `jose`.
 *
 * @param idToken - Apple ID token.
 * @param audience - Expected audience (client ID) for validation.
 * @returns True if the token signature is valid and audience matches.
 */
export async function verifyAppleToken(idToken: string, audience?: string): Promise<boolean> {
  const { jwtVerify, createRemoteJWKSet } = await import('jose');

  const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'), {
    cooldownDuration: 600_000, // 10 min cache
    timeoutDuration: 10_000,
  });

  const { payload } = await jwtVerify(idToken, JWKS, {
    algorithms: ['RS256'],
    audience,
    issuer: 'https://appleid.apple.com',
  });

  // Double-check that the token is not expired
  const exp = payload.exp;
  if (exp && typeof exp === 'number' && Math.floor(Date.now() / 1000) >= exp) {
    return false;
  }

  return true;
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
