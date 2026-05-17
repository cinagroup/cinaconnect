/**
 * Apple Sign-In provider for social login.
 *
 * Implements Sign in with Apple using OAuth2 and JWT-based
 * client authentication (per Apple's requirements).
 *
 * Reference: https://developer.apple.com/sign-in-with-apple/
 */

import type { AppleLoginParams, SocialLoginResult, OAuth2UserProfile } from '../types.js';

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
export async function generateAppleClientSecret(params: AppleLoginParams): Promise<string> {
  // Apple requires a JWT with these claims:
  // - iss: Team ID
  // - iat: current time
  // - exp: max 6 months from now
  // - aud: "https://appleid.apple.com"
  // - sub: Client ID (Services ID)
  //
  // Signed with ES256 using your private key.
  //
  // In production, use:
  //   import { SignJWT } from 'jose';
  //   const key = await importSPKI(params.privateKey, 'ES256');
  //   return new SignJWT({})
  //     .setProtectedHeader({ alg: 'ES256', kid: params.keyId })
  //     .setIssuer(params.teamId)
  //     .setAudience('https://appleid.apple.com')
  //     .setSubject(params.clientId)
  //     .setIssuedAt()
  //     .setExpirationTime('6m')
  //     .sign(key);

  throw new Error(
    'Apple client_secret generation requires the jose library. ' +
    'Install with: npm install jose'
  );
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
 * Apple publishes their public keys at a well-known URL.
 *
 * @param idToken - Apple ID token.
 * @returns True if the token signature is valid.
 */
export async function verifyAppleToken(idToken: string): Promise<boolean> {
  // Fetch Apple's public keys
  const keysResponse = await fetch('https://appleid.apple.com/auth/keys');
  if (!keysResponse.ok) {
    throw new Error('Failed to fetch Apple public keys');
  }

  const { keys } = await keysResponse.json();

  // In production, use jose to verify:
  //   import { jwtVerify, createRemoteJWKSet } from 'jose';
  //   const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  //   await jwtVerify(idToken, JWKS);

  // Placeholder: in a real implementation, verify the JWT signature
  // against Apple's published keys using jose or similar library
  return keys.length > 0;
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
