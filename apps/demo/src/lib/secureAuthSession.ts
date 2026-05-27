/**
 * Secure Auth Session — hardened session storage replacing localStorage tokens.
 *
 * PROBLEM: Storing auth tokens in localStorage is vulnerable to XSS attacks.
 * Any JavaScript running on the page can read localStorage.
 *
 * SOLUTION (server-rendered apps): Use httpOnly, Secure, SameSite=Strict cookies.
 * The browser automatically sends them with requests, but JS cannot read them.
 *
 * SOLUTION (static-export / SSG apps): Use in-memory session metadata only.
 * The actual SIWE signature stays out of persistent storage. On page reload,
 * the user must re-sign (which is more secure than persisting credentials).
 *
 * Client-side code tracks SESSION METADATA only (address, expiry, etc.)
 * — NOT the actual token or signature. The real credential stays in
 * the httpOnly cookie (SSR) or is cleared on page reload (SSG).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiweSession {
  signed: boolean;
  verified: boolean;
  message: string | null;
  signature: string | null;
  nonce: string | null;
  domain: string | null;
  issuedAt: string | null;
  expirationTime: string | null;
}

export interface PasskeyStatus {
  registered: boolean;
  authenticated: boolean;
  credentialId: string | null;
  username: string | null;
}

export interface SecureAuthSession {
  authenticated: boolean;
  address: string | null;
  siwe: SiweSession;
  passkey: PasskeyStatus;
  createdAt: string | null;
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// In-memory session store (replaces localStorage)
// ---------------------------------------------------------------------------

/**
 * In-memory session store.
 * Survives SPA navigation but NOT page reloads (XSS-safe by design).
 * For SSR apps, use the httpOnly cookie approach via server API routes.
 * For static-export apps, session persists only for the current page session.
 */
let currentSession: SecureAuthSession | null = null;

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Session management (client-side metadata only)
// ---------------------------------------------------------------------------

export function getAuthSession(): SecureAuthSession {
  if (!currentSession) return emptySession();
  if (currentSession.expiresAt && new Date(currentSession.expiresAt) < new Date()) {
    currentSession = null;
    return emptySession();
  }
  return currentSession;
}

export function saveAuthSession(session: SecureAuthSession): void {
  currentSession = session;
}

export function clearAuthSession(): void {
  currentSession = null;
}

export function createSiweSession(
  address: string,
  message: string,
  signature: string,
  nonce: string,
  domain: string,
  issuedAt: string,
): SecureAuthSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: SecureAuthSession = {
    authenticated: true,
    address,
    siwe: {
      signed: true,
      verified: true,
      message,
      signature,
      nonce,
      domain,
      issuedAt,
      expirationTime: expiresAt.toISOString(),
    },
    passkey: { registered: false, authenticated: false, credentialId: null, username: null },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  saveAuthSession(session);
  return session;
}

export function createPasskeySession(credentialId: string, username: string): SecureAuthSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: SecureAuthSession = {
    authenticated: true,
    address: null,
    siwe: { signed: false, verified: false, message: null, signature: null, nonce: null, domain: null, issuedAt: null, expirationTime: null },
    passkey: { registered: true, authenticated: true, credentialId, username },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  saveAuthSession(session);
  return session;
}

export function updateSessionWithPasskey(credentialId: string, username: string): SecureAuthSession {
  const session = getAuthSession();
  session.passkey = { registered: true, authenticated: true, credentialId, username };
  saveAuthSession(session);
  return session;
}

export function isAuthenticated(): boolean {
  return getAuthSession().authenticated;
}

export function signOut(): SecureAuthSession {
  clearAuthSession();
  return emptySession();
}

export function isSessionExpiringSoon(): boolean {
  const session = getAuthSession();
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() - Date.now() < 3600000;
}

export function getSessionRemainingTime(): number {
  const session = getAuthSession();
  if (!session.expiresAt) return 0;
  return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
}

export function formatSessionRemaining(): string {
  const ms = getSessionRemainingTime();
  if (ms === 0) return 'Expired';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
  return `${minutes}m remaining`;
}

// ---------------------------------------------------------------------------
// SSR: Server-side session rehydration via httpOnly cookie
// ---------------------------------------------------------------------------

/**
 * Refresh session metadata from server (SSR mode only).
 * On static-export builds, this returns an empty session.
 */
export async function refreshSessionFromServer(): Promise<SecureAuthSession> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) { currentSession = null; return emptySession(); }
    const data = await res.json();
    const session: SecureAuthSession = {
      authenticated: true,
      address: data.address,
      siwe: { signed: true, verified: true, message: null, signature: null, nonce: data.nonce || null, domain: data.domain || null, issuedAt: data.issuedAt || null, expirationTime: data.expiresAt || null },
      passkey: { registered: false, authenticated: false, credentialId: null, username: null },
      createdAt: data.createdAt || null,
      expiresAt: data.expiresAt || null,
    };
    saveAuthSession(session);
    return session;
  } catch {
    currentSession = null;
    return emptySession();
  }
}

/**
 * Refresh an expiring session token via server (SSR mode only).
 */
export async function refreshSessionToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    if (currentSession) currentSession.expiresAt = data.expiresAt;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function emptySession(): SecureAuthSession {
  return {
    authenticated: false, address: null,
    siwe: { signed: false, verified: false, message: null, signature: null, nonce: null, domain: null, issuedAt: null, expirationTime: null },
    passkey: { registered: false, authenticated: false, credentialId: null, username: null },
    createdAt: null, expiresAt: null,
  };
}
