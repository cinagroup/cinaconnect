/**
 * Twitter/X OAuth2 provider for social login.
 *
 * Implements Twitter OAuth2 PKCE flow for authentication
 * and returns a JWT token with a derived wallet address.
 *
 * Reference: https://developer.twitter.com/en/docs/authentication/oauth-2-0
 */

import type { TwitterLoginParams, SocialLoginResult, OAuth2UserProfile } from '../types.js';

/** Twitter OAuth2 authorization endpoint. */
const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

/** Twitter OAuth2 token endpoint. */
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

/** Twitter API v2 me endpoint. */
const TWITTER_ME_URL = 'https://api.twitter.com/2/users/me';

/** Default scopes for Twitter OAuth2. */
const DEFAULT_SCOPES = ['users.read', 'tweet.read'];

/**
 * Generate a PKCE code verifier and challenge.
 *
 * @returns Object with codeVerifier and codeChallenge.
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  return { codeVerifier, codeChallenge };
}

/**
 * Build the Twitter OAuth2 authorization URL with PKCE.
 *
 * @param params - Twitter login parameters.
 * @param codeChallenge - PKCE code challenge.
 * @returns Authorization URL to redirect the user to.
 */
export function buildTwitterAuthUrl(
  params: TwitterLoginParams,
  codeChallenge: string
): string {
  const scopes = params.scopes || DEFAULT_SCOPES;
  const state = params.state || generateState();

  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TWITTER_AUTH_URL}?${query.toString()}`;
}

/**
 * Exchange an authorization code for tokens with Twitter.
 *
 * @param code - Authorization code from Twitter redirect.
 * @param params - Twitter login parameters.
 * @param codeVerifier - PKCE code verifier.
 * @returns Token response with access token.
 */
export async function exchangeTwitterCode(
  code: string,
  params: TwitterLoginParams,
  codeVerifier: string
): Promise<{ accessToken: string; tokenType: string; expiresIn: number; scope: string }> {
  const credentials = btoa(`${params.clientId}:${params.clientSecret}`);

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter token exchange failed: ${error}`);
  }

  return response.json() as Promise<any>;
}

/**
 * Fetch the user's profile from Twitter API v2.
 *
 * @param accessToken - OAuth2 access token.
 * @param fields - Optional user fields to request.
 * @returns User profile data.
 */
export async function fetchTwitterUserProfile(
  accessToken: string,
  fields: string[] = ['id', 'name', 'username', 'profile_image_url', 'verified']
): Promise<OAuth2UserProfile & { username?: string }> {
  const query = new URLSearchParams({
    'user.fields': fields.join(','),
  });

  const response = await fetch(`${TWITTER_ME_URL}?${query.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter userinfo fetch failed: ${error}`);
  }

  const data = await response.json();
  const user = data.data;

  return {
    sub: user.id,
    name: user.name,
    picture: user.profile_image_url,
    username: user.username,
  };
}

/**
 * Handle the full Twitter login flow.
 *
 * @param code - Authorization code from Twitter redirect.
 * @param params - Twitter login parameters.
 * @param codeVerifier - PKCE code verifier.
 * @param deriveWallet - Function to derive a wallet address.
 * @returns Social login result.
 */
export async function loginWithTwitter(
  code: string,
  params: TwitterLoginParams,
  codeVerifier: string,
  deriveWallet: (userId: string, username: string) => Promise<{ address: string; publicKey?: string }>
): Promise<SocialLoginResult> {
  // Exchange code for tokens
  const tokens = await exchangeTwitterCode(code, params, codeVerifier);

  // Get user profile
  const profile = await fetchTwitterUserProfile(tokens.accessToken);

  if (!profile.sub) {
    throw new Error('Twitter login failed: no user ID in profile');
  }

  // Derive wallet
  const wallet = await deriveWallet(profile.sub, profile.username || '');

  return {
    provider: 'twitter',
    providerUserId: profile.sub,
    displayName: profile.name,
    profilePicture: profile.picture,
    jwtToken: tokens.accessToken,
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNewUser: false,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expiresIn || 7200),
  };
}

// --- Utility functions ---

function generateRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
}

function generateState(): string {
  return generateRandomString(32);
}
