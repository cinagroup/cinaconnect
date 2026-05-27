/**
 * GitHub OAuth2 provider for social login.
 *
 * Implements the GitHub Sign-In flow using OAuth2
 * and returns user profile data with a derived wallet address.
 *
 * Reference: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
 */

import type { SocialLoginResult, OAuth2TokenResponse, OAuth2UserProfile } from '../types.js';
import { TokenVerifier, type TokenVerifyResult } from '../token-verifier.js';

/** GitHub OAuth2 authorization endpoint. */
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

/** GitHub OAuth2 token endpoint. */
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/** GitHub REST API user endpoint. */
const GITHUB_USER_URL = 'https://api.github.com/user';

/** Default scopes for GitHub Sign-In. */
const DEFAULT_SCOPES = ['read:user', 'user:email'];

/**
 * Build the GitHub OAuth2 authorization URL.
 *
 * @param params - GitHub login parameters.
 * @returns Authorization URL to redirect the user to.
 */
export function buildGitHubAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
}): string {
  const scopes = params.scopes || DEFAULT_SCOPES;
  const state = params.state || generateState();

  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
  });

  return `${GITHUB_AUTH_URL}?${query.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 *
 * GitHub returns a non-standard response that may include
 * access_token, token_type, and scope (URL-encoded or JSON).
 *
 * @param code - Authorization code from the redirect.
 * @param params - GitHub login parameters (clientId, redirectUri).
 * @param clientSecret - OAuth2 client secret.
 * @returns OAuth2 token response.
 */
export async function exchangeCodeForTokens(
  code: string,
  params: Pick<{ clientId: string; redirectUri: string }, 'clientId' | 'redirectUri'>,
  clientSecret: string
): Promise<OAuth2TokenResponse> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      code,
      client_id: params.clientId,
      client_secret: clientSecret,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub token exchange failed: ${error}`);
  }

  const data = await response.json() as Record<string, unknown>;

  // GitHub doesn't return an ID token; the access token is the primary credential
  return {
    accessToken: (data.access_token as string) || '',
    tokenType: (data.token_type as string) || 'bearer',
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 0,
    refreshToken: data.refresh_token as string | undefined,
    scope: data.scope as string | undefined,
  };
}

/**
 * Fetch the user's profile from GitHub.
 *
 * @param accessToken - GitHub OAuth2 access token.
 * @returns User profile data.
 */
export async function fetchGitHubUserProfile(accessToken: string): Promise<OAuth2UserProfile> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub user fetch failed: ${error}`);
  }

  const data = await response.json() as Record<string, unknown>;

  return {
    sub: String(data.id || data.login || ''),
    email: (data.email as string) || undefined,
    name: (data.name as string) || (data.login as string) || '',
    picture: (data.avatar_url as string) || undefined,
  };
}

/**
 * Fetch the user's verified emails from GitHub.
 *
 * The primary email in the user profile may be null;
 * this endpoint returns all verified emails.
 *
 * @param accessToken - GitHub OAuth2 access token.
 * @returns Array of verified email addresses.
 */
export async function fetchGitHubUserEmails(accessToken: string): Promise<string[]> {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    return [];
  }

  const emails = await response.json() as Array<{ email: string; primary: boolean; verified: boolean }>;

  // Return the primary verified email, or the first verified one
  const primaryEmail = emails.find(e => e.primary && e.verified);
  if (primaryEmail) {
    return [primaryEmail.email];
  }

  const verifiedEmail = emails.find(e => e.verified);
  if (verifiedEmail) {
    return [verifiedEmail.email];
  }

  return [];
}

/**
 * Handle the full GitHub login flow: code exchange → profile fetch → result.
 *
 * @param code - Authorization code from GitHub redirect.
 * @param params - GitHub login parameters including clientSecret.
 * @param deriveWallet - Function to derive a wallet address from the user identity.
 * @returns Social login result.
 */
export async function loginWithGitHub(
  code: string,
  params: {
    clientId: string;
    redirectUri: string;
    clientSecret: string;
  },
  deriveWallet: (userId: string, email: string) => Promise<{ address: string; publicKey?: string }>
): Promise<SocialLoginResult> {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, params, params.clientSecret);

  // Get user profile
  const profile = await fetchGitHubUserProfile(tokens.accessToken);

  // If email is not in profile, try fetching emails endpoint
  let email = profile.email;
  if (!email) {
    const emails = await fetchGitHubUserEmails(tokens.accessToken);
    email = emails[0];
  }

  if (!profile.sub) {
    throw new Error('GitHub login failed: no user ID in profile');
  }

  // Derive wallet
  const wallet = await deriveWallet(profile.sub, email || '');

  return {
    provider: 'github',
    providerUserId: profile.sub,
    email,
    displayName: profile.name,
    profilePicture: profile.picture,
    jwtToken: tokens.accessToken,
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    isNewUser: false,
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
