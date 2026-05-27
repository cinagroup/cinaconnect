/**
 * @cinacoin/next/server — Next.js Server Actions.
 *
 * Server actions for wallet authentication and SIWE verification
 * in Next.js App Router.
 *
 * ```tsx
 * 'use server';
 * import { authenticateWithWallet, createSiweSession } from '@cinacoin/next/server/actions';
 * ```
 *
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
 */

'use server';

import { cookies } from 'next/headers';
import type { Address } from 'viem';
import type { ServerSession } from './middleware.js';
import { verifySiweMessage } from './middleware.js';
import { createSessionCookieHeader } from './edge.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a SIWE session creation. */
export interface CreateSiweSessionResult {
  /** The generated nonce for the client to sign. */
  nonce: string;
  /** SIWE message template for the client to sign. */
  message: string;
  /** Expiration timestamp (Unix seconds). */
  expiresAt: number;
}

/** Parameters for authenticating with a wallet. */
export interface AuthenticateWithWalletParams {
  /** The SIWE message that was signed. */
  message: string;
  /** The hex-encoded signature (0x-prefixed). */
  signature: string;
  /** Chain ID the wallet was on when signing. */
  chainId: number;
  /** Optional domain override. */
  domain?: string;
  /** Optional project ID. */
  projectId?: string;
}

/** Result of wallet authentication. */
export interface AuthenticateResult {
  /** Whether authentication succeeded. */
  success: boolean;
  /** The authenticated wallet address (if successful). */
  address?: string;
  /** Error message (if failed). */
  error?: string;
}

// ---------------------------------------------------------------------------
// Nonce generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random nonce for SIWE.
 * Uses the Web Crypto API (available in all Next.js runtimes).
 */
function generateNonce(): string {
  const bytes = new Uint8Array(32);
  // Web Crypto API — available in Node.js and Edge
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : globalThis.crypto;
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// createSiweSession (Server Action)
// ---------------------------------------------------------------------------

/**
 * Server action that generates a SIWE nonce and message for the client.
 *
 * The client should display this message for the user to sign with their wallet.
 *
 * ```tsx
 * 'use client';
 * import { createSiweSession } from '@cinacoin/next/server/actions';
 *
 * async function handleSignIn() {
 *   const { nonce, message } = await createSiweSession({
 *     domain: window.location.host,
 *   });
 *
 *   // Use viem/wagmi to sign the message
 *   const signature = await signMessage({ message });
 *
 *   // Send back for verification
 *   const result = await authenticateWithWallet({ message, signature, chainId: 1 });
 * }
 * ```
 *
 * @param options - SIWE session options.
 * @returns CreateSiweSessionResult with nonce and message.
 */
export async function createSiweSession(
  options: {
    /** Domain for the SIWE message. @default process.env.NEXT_PUBLIC_URL */
    domain?: string;
    /** Optional statement to include in the SIWE message. */
    statement?: string;
    /** Session duration in seconds. @default 86400 (24 hours) */
    maxAge?: number;
  } = {},
): Promise<CreateSiweSessionResult> {
  const nonce = generateNonce();
  const domain = options.domain ?? process.env.NEXT_PUBLIC_URL ?? 'localhost';
  const uri = process.env.NEXT_PUBLIC_URL ?? `https://${domain}`;
  const maxAge = options.maxAge ?? 86400;
  const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
  const issuedAt = new Date().toISOString();

  // Build SIWE message per EIP-4361
  const lines = [
    `${domain} wants you to sign in with your Ethereum account:`,
    '{address}',
    '',
    options.statement ? `${options.statement}\n` : '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: 1`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${new Date(expiresAt * 1000).toISOString()}`,
  ];

  const message = lines.filter(Boolean).join('\n');

  return { nonce, message, expiresAt };
}

// ---------------------------------------------------------------------------
// authenticateWithWallet (Server Action)
// ---------------------------------------------------------------------------

/**
 * Server action that authenticates a user by verifying their SIWE signature.
 *
 * On success, stores the session in a cookie and returns the authenticated
 * address.
 *
 * ```tsx
 * 'use client';
 * import { authenticateWithWallet } from '@cinacoin/next/server/actions';
 *
 * async function login() {
 *   const result = await authenticateWithWallet({
 *     message: siweMessage,
 *     signature: signature,
 *     chainId: 1,
 *   });
 *
 *   if (result.success) {
 *     console.log('Logged in as:', result.address);
 *   }
 * }
 * ```
 *
 * @param params - Authentication parameters.
 * @returns AuthenticateResult with success status and address.
 */
export async function authenticateWithWallet(
  params: AuthenticateWithWalletParams,
): Promise<AuthenticateResult> {
  try {
    const domain = params.domain ?? process.env.NEXT_PUBLIC_URL;
    const projectId = params.projectId ?? process.env.CINACOIN_PROJECT_ID ?? '';

    // Verify the SIWE message and recover the address
    const recoveredAddress = await verifySiweMessage(params.message, params.signature, {
      projectId,
      domain,
      chains: [{ id: params.chainId, name: '', rpcUrl: '', nativeCurrency: { name: '', symbol: '', decimals: 18 } }],
    });

    // Extract nonce from the message
    const nonceMatch = params.message.match(/Nonce: (.+)/);
    const nonce = nonceMatch?.[1] ?? '';

    // Extract expiration from the message
    const expirationMatch = params.message.match(/Expiration Time: (.+)/);
    let expiresAt = Math.floor(Date.now() / 1000) + 86400; // default 24h
    if (expirationMatch?.[1]) {
      expiresAt = Math.floor(new Date(expirationMatch[1]).getTime() / 1000);
    }

    // Build session object
    const session: ServerSession = {
      address: recoveredAddress,
      chainId: params.chainId,
      nonce,
      expiresAt,
      token: '',
    };

    // Encode session to base64 token
    const token = btoa(JSON.stringify(session));

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set('cinacoin-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: expiresAt - Math.floor(Date.now() / 1000),
    });

    return {
      success: true,
      address: recoveredAddress,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

// ---------------------------------------------------------------------------
// createServerAction wrapper
// ---------------------------------------------------------------------------

/**
 * Create a typed server action that requires authentication.
 *
 * Wraps your server function and injects the session. If no valid session
 * is found, returns an error.
 *
 * ```ts
 * 'use server';
 * import { createServerAction } from '@cinacoin/next/server/actions';
 *
 * export const getProfile = createServerAction(async (session) => {
 *   return { address: session.address, name: 'User' };
 * });
 * ```
 *
 * @param handler - Your server action handler (receives the session).
 * @returns A server action that enforces authentication.
 */
export function createServerAction<T>(
  handler: (session: ServerSession) => Promise<T>,
): () => Promise<T | { error: string }> {
  return async () => {
    try {
      const cookieStore = await cookies();
      const cookieValue = cookieStore.get('cinacoin-session')?.value;

      if (!cookieValue) {
        return { error: 'Unauthorized: no session found' };
      }

      // Decode session
      const decoded = JSON.parse(atob(cookieValue)) as ServerSession;
      if (!decoded.address || decoded.expiresAt < Math.floor(Date.now() / 1000)) {
        return { error: 'Unauthorized: session expired' };
      }

      // Check token refresh — extend if within 1 hour of expiry
      const oneHour = 3600;
      if (decoded.expiresAt - Math.floor(Date.now() / 1000) < oneHour) {
        const newExpiry = Math.floor(Date.now() / 1000) + 86400;
        decoded.expiresAt = newExpiry;
        const newToken = btoa(JSON.stringify(decoded));
        cookieStore.set('cinacoin-session', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 86400,
        });
      }

      return await handler(decoded);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Server error' };
    }
  };
}
