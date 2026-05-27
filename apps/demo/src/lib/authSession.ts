/**
 * Auth session management — persists SIWE + Passkey auth state.
 *
 * Tracks authenticated address, SIWE verification status, passkey status,
 * and session expiry. Survives page reloads via localStorage.
 */

export interface AuthSession {
  /** Whether the user is currently authenticated. */
  authenticated: boolean;
  /** Ethereum address that authenticated. */
  address: string | null;
  /** SIWE verification result. */
  siwe: {
    signed: boolean;
    verified: boolean;
    message: string | null;
    signature: string | null;
    nonce: string | null;
    domain: string | null;
    issuedAt: string | null;
    expirationTime: string | null;
  };
  /** Passkey authentication status. */
  passkey: {
    registered: boolean;
    authenticated: boolean;
    credentialId: string | null;
    username: string | null;
  };
  /** Session creation time (ISO 8601). */
  createdAt: string | null;
  /** Session expiry time (ISO 8601), 24 hours after creation. */
  expiresAt: string | null;
}

const STORAGE_KEY = 'cinacoin_auth_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get the current auth session from localStorage.
 * Returns a fresh empty session if none exists or if expired.
 */
export function getAuthSession(): AuthSession {
  if (typeof window === 'undefined') {
    return emptySession();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession();

    const session = JSON.parse(raw) as AuthSession;

    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      clearAuthSession();
      return emptySession();
    }

    return session;
  } catch {
    return emptySession();
  }
}

/**
 * Save the auth session to localStorage.
 */
export function saveAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage full or blocked — ignore silently
  }
}

/**
 * Clear the auth session from localStorage.
 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Create a new authenticated session from SIWE verification.
 */
export function createSiweSession(
  address: string,
  message: string,
  signature: string,
  nonce: string,
  domain: string,
  issuedAt: string
): AuthSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: AuthSession = {
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
    passkey: {
      registered: false,
      authenticated: false,
      credentialId: null,
      username: null,
    },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  saveAuthSession(session);
  return session;
}

/**
 * Create a new authenticated session from passkey authentication.
 */
export function createPasskeySession(
  credentialId: string,
  username: string
): AuthSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: AuthSession = {
    authenticated: true,
    address: null,
    siwe: {
      signed: false,
      verified: false,
      message: null,
      signature: null,
      nonce: null,
      domain: null,
      issuedAt: null,
      expirationTime: null,
    },
    passkey: {
      registered: true,
      authenticated: true,
      credentialId,
      username,
    },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  saveAuthSession(session);
  return session;
}

/**
 * Update the session with passkey registration info.
 */
export function updateSessionWithPasskey(
  credentialId: string,
  username: string
): AuthSession {
  const session = getAuthSession();
  session.passkey = {
    registered: true,
    authenticated: true,
    credentialId,
    username,
  };
  saveAuthSession(session);
  return session;
}

/**
 * Check if the current session is valid and authenticated.
 */
export function isAuthenticated(): boolean {
  const session = getAuthSession();
  return session.authenticated;
}

/**
 * Sign out — clear the session and return empty state.
 */
export function signOut(): AuthSession {
  clearAuthSession();
  return emptySession();
}

/**
 * Check if the session will expire soon (within 1 hour).
 */
export function isSessionExpiringSoon(): boolean {
  const session = getAuthSession();
  if (!session.expiresAt) return false;

  const oneHour = 60 * 60 * 1000;
  return new Date(session.expiresAt).getTime() - Date.now() < oneHour;
}

/**
 * Get the remaining session time in milliseconds.
 */
export function getSessionRemainingTime(): number {
  const session = getAuthSession();
  if (!session.expiresAt) return 0;

  const remaining = new Date(session.expiresAt).getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format remaining time as human-readable string.
 */
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

/**
 * Create an empty (unauthenticated) session.
 */
function emptySession(): AuthSession {
  return {
    authenticated: false,
    address: null,
    siwe: {
      signed: false,
      verified: false,
      message: null,
      signature: null,
      nonce: null,
      domain: null,
      issuedAt: null,
      expirationTime: null,
    },
    passkey: {
      registered: false,
      authenticated: false,
      credentialId: null,
      username: null,
    },
    createdAt: null,
    expiresAt: null,
  };
}
