/**
 * Google OAuth2 provider for social login.
 *
 * Implements the Google Sign-In flow using OpenID Connect
 * and returns a JWT token with a derived wallet address.
 *
 * Reference: https://developers.google.com/identity/protocols/oauth2
 */

import type { GoogleLoginParams, SocialLoginResult, OAuth2TokenResponse, OAuth2UserProfile } from '../types.js';
import { TokenVerifier, type TokenVerifyResult } from '../token-verifier.js';

/** Google OAuth2 authorization endpoint. */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

/** Google OAuth2 token endpoint. */
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Google OAuth2 userinfo endpoint. */
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Default scopes for Google Sign-In. */
const DEFAULT_SCOPES = ['openid', 'email', 'profile'];

/**
 * Build the Google OAuth2 authorization URL.
 *
 * @param params - Google login parameters.
 * @returns Authorization URL to redirect the user to.
 */
export function buildGoogleAuthUrl(params: GoogleLoginParams): string {
  const scopes = params.scopes || DEFAULT_SCOPES;
  const state = params.state || generateState();

  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  if (params.hostedDomain) {
    query.set('hd', params.hostedDomain);
  }

  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 *
 * @param code - Authorization code from the redirect.
 * @param params - Google login parameters (clientId, redirectUri).
 * @param clientSecret - OAuth2 client secret.
 * @returns OAuth2 token response.
 */
export async function exchangeCodeForTokens(
  code: string,
  params: Pick<GoogleLoginParams, 'clientId' | 'redirectUri'>,
  clientSecret: string
): Promise<OAuth2TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
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
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json() as Promise<OAuth2TokenResponse>;
}

/**
 * Fetch the user's profile from Google.
 *
 * @param accessToken - OAuth2 access token.
 * @returns User profile data.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<OAuth2UserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google userinfo fetch failed: ${error}`);
  }

  return response.json() as Promise<OAuth2UserProfile>;
}

/**
 * Handle the full Google login flow: code exchange → profile fetch → result.
 *
 * @param code - Authorization code from Google redirect.
 * @param params - Google login parameters.
 * @param clientSecret - OAuth2 client secret.
 * @param deriveWallet - Function to derive a wallet address from the user identity.
 * @returns Social login result.
 */
export async function loginWithGoogle(
  code: string,
  params: GoogleLoginParams & { clientSecret: string },
  deriveWallet: (userId: string, email: string) => Promise<{ address: string; publicKey?: string }>
): Promise<SocialLoginResult> {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, params, params.clientSecret);

  // Server-side token verification
  if (tokens.idToken) {
    const verifier = new TokenVerifier({ googleClientId: params.clientId });
    const verification: TokenVerifyResult = await verifier.verify('google', tokens.idToken);
    if (!verification.valid) {
      throw new Error(`Google ID token verification failed: ${verification.error}`);
    }
  }

  // Get user profile
  const profile = await fetchGoogleUserProfile(tokens.accessToken);

  if (!profile.sub) {
    throw new Error('Google login failed: no user ID in profile');
  }

  // Derive wallet
  const wallet = await deriveWallet(profile.sub, profile.email || '');

  return {
    provider: 'google',
    providerUserId: profile.sub,
    email: profile.email,
    displayName: profile.name,
    profilePicture: profile.picture,
    jwtToken: tokens.idToken || tokens.accessToken,
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNewUser: false, // Should be determined by checking if wallet exists in your DB
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expiresIn || 3600),
  };
}

/**
 * Generate a random state parameter for CSRF protection.
 */
function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
