/**
 * Passkey / WebAuthn implementation for passwordless authentication.
 *
 * Provides registration and authentication flows using the Web Authentication API
 * (navigator.credentials). Credentials are stored locally in localStorage.
 *
 * Supports both registration (creating a new passkey) and authentication
 * (verifying an existing passkey via biometrics/PIN).
 */

import { createPasskeySession } from './authSession';

/* ── Types ── */

export interface PasskeyCredential {
  /** Base64-encoded credential ID. */
  id: string;
  /** Username associated with the credential. */
  username: string;
  /** Base64-encoded public key (COSE format). */
  publicKey: string;
  /** When the credential was created (ISO 8601). */
  createdAt: string;
}

export interface PasskeyAuthResult {
  success: boolean;
  credentialId: string | null;
  username: string | null;
  error?: string;
}

export interface PasskeyRegistrationResult {
  success: boolean;
  credential: PasskeyCredential | null;
  error?: string;
}

/* ── Utility Functions ── */

/**
 * Check if WebAuthn is supported in the current browser.
 */
export function isWebAuthnSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/**
 * Check if a user-verifying platform authenticator is available.
 */
export async function hasPlatformAuthenticator(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Convert ArrayBuffer to Base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer.
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert Base64URL to Base64 (for WebAuthn credential IDs).
 */
export function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/');
}

/**
 * Convert Base64 to Base64URL.
 */
export function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ── Credential Storage ── */

const STORAGE_KEY = 'cinacoin_passkey_credentials';

/**
 * Get all stored passkey credentials.
 */
export function getStoredCredentials(): PasskeyCredential[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a passkey credential to localStorage.
 */
export function saveCredential(credential: PasskeyCredential): void {
  if (typeof window === 'undefined') return;
  try {
    const credentials = getStoredCredentials();
    // Remove existing credential with same ID if present
    const filtered = credentials.filter((c) => c.id !== credential.id);
    filtered.push(credential);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Storage full or blocked
  }
}

/**
 * Check if a credential exists for the given username.
 */
export function hasCredentialForUser(username: string): boolean {
  return getStoredCredentials().some((c) => c.username === username);
}

/**
 * Get a credential by its ID.
 */
export function getCredentialById(id: string): PasskeyCredential | null {
  return getStoredCredentials().find((c) => c.id === id) || null;
}

/* ── Registration Flow ── */

/**
 * Register a new passkey for the given username.
 *
 * This creates a new credential via navigator.credentials.create()
 * and stores the credential ID and public key in localStorage.
 */
export async function registerPasskey(
  username: string
): Promise<PasskeyRegistrationResult> {
  // Validate input
  if (!username || username.trim().length === 0) {
    return { success: false, credential: null, error: 'Username is required' };
  }

  // Check WebAuthn support
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      credential: null,
      error: 'WebAuthn is not supported in this browser. Try Chrome, Safari, or Firefox with a security key.',
    };
  }

  try {
    // Check for existing credential
    if (hasCredentialForUser(username)) {
      return {
        success: false,
        credential: null,
        error: `A passkey already exists for "${username}". Use Login instead.`,
      };
    }

    // Generate a random user ID (16 bytes)
    const userId = crypto.getRandomValues(new Uint8Array(16));

    // Get the current origin for the RP ID
    const rpId =
      typeof window !== 'undefined'
        ? window.location.hostname
        : 'localhost';

    // Create credential options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
      {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: 'Cinacoin Demo',
          id: rpId,
        },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      };

    // Create the credential
    const credential =
      (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;

    if (!credential || credential.type !== 'public-key') {
      return {
        success: false,
        credential: null,
        error: 'Credential creation failed. Please try again.',
      };
    }

    const cred = credential as AuthenticatorAttestationResponse &
      PublicKeyCredential;

    // Store the credential
    const storedCredential: PasskeyCredential = {
      id: base64ToBase64Url(bufferToBase64(cred.rawId)),
      username: username,
      publicKey: bufferToBase64(cred.getPublicKey()),
      createdAt: new Date().toISOString(),
    };

    saveCredential(storedCredential);

    return { success: true, credential: storedCredential };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';

    // Handle specific WebAuthn errors
    if (
      message.includes('AbortError') ||
      message.includes('cancelled') ||
      message.includes('canceled') ||
      err instanceof DOMException && err.name === 'AbortError'
    ) {
      return {
        success: false,
        credential: null,
        error: 'Registration cancelled by user',
      };
    }

    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      return {
        success: false,
        credential: null,
        error: 'Permission denied. Please allow passkey registration.',
      };
    }

    if (err instanceof DOMException && err.name === 'SecurityError') {
      return {
        success: false,
        credential: null,
        error: 'Security error. Passkeys require a secure origin (HTTPS or localhost).',
      };
    }

    return { success: false, credential: null, error: message };
  }
}

/* ── Authentication Flow ── */

/**
 * Authenticate using a stored passkey.
 *
 * Uses navigator.credentials.get() to prompt for biometric/PIN
 * verification against stored credentials.
 */
export async function authenticatePasskey(): Promise<PasskeyAuthResult> {
  // Check WebAuthn support
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      credentialId: null,
      username: null,
      error: 'WebAuthn is not supported in this browser',
    };
  }

  // Check for stored credentials
  const credentials = getStoredCredentials();
  if (credentials.length === 0) {
    return {
      success: false,
      credentialId: null,
      username: null,
      error: 'No passkeys registered. Register a passkey first.',
    };
  }

  try {
    // Build allowCredentials list from stored credentials
    const allowCredentials: PublicKeyCredentialDescriptor[] = credentials.map(
      (cred) => ({
        type: 'public-key' as const,
        id: base64ToBuffer(base64UrlToBase64(cred.id)),
      })
    );

    const rpId =
      typeof window !== 'undefined'
        ? window.location.hostname
        : 'localhost';

    // Get credential options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
      {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: allowCredentials,
        timeout: 60000,
        userVerification: 'required',
        rpId: rpId,
      };

    // Get the credential
    const credential =
      (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential | null;

    if (!credential || credential.type !== 'public-key') {
      return {
        success: false,
        credentialId: null,
        username: null,
        error: 'Authentication failed. Please try again.',
      };
    }

    // Find the matching stored credential
    const credId = base64ToBase64Url(bufferToBase64(credential.rawId));
    const storedCred = getCredentialById(credId);

    if (!storedCred) {
      return {
        success: false,
        credentialId: null,
        username: null,
        error: 'Unknown credential. Please register a new passkey.',
      };
    }

    // Create session
    createPasskeySession(credId, storedCred.username);

    return {
      success: true,
      credentialId: credId,
      username: storedCred.username,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';

    if (
      message.includes('AbortError') ||
      message.includes('cancelled') ||
      message.includes('canceled') ||
      err instanceof DOMException && err.name === 'AbortError'
    ) {
      return {
        success: false,
        credentialId: null,
        username: null,
        error: 'Authentication cancelled by user',
      };
    }

    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      return {
        success: false,
        credentialId: null,
        username: null,
        error: 'Permission denied. Please allow passkey authentication.',
      };
    }

    return { success: false, credentialId: null, username: null, error: message };
  }
}

/**
 * Authenticate with a specific username (if multiple passkeys exist).
 */
export async function authenticatePasskeyByUsername(
  username: string
): Promise<PasskeyAuthResult> {
  const credentials = getStoredCredentials();
  const userCred = credentials.find((c) => c.username === username);

  if (!userCred) {
    return {
      success: false,
      credentialId: null,
      username: null,
      error: `No passkey found for "${username}"`,
    };
  }

  // Re-use authenticatePasskey but with single credential filter
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      credentialId: null,
      username: null,
      error: 'WebAuthn is not supported in this browser',
    };
  }

  try {
    const rpId =
      typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            type: 'public-key' as const,
            id: base64ToBuffer(base64UrlToBase64(userCred.id)),
          },
        ],
        timeout: 60000,
        userVerification: 'required',
        rpId,
      },
    })) as PublicKeyCredential | null;

    if (!credential || credential.type !== 'public-key') {
      return {
        success: false,
        credentialId: null,
        username: null,
        error: 'Authentication failed',
      };
    }

    const credId = base64ToBase64Url(bufferToBase64(credential.rawId));
    createPasskeySession(credId, userCred.username);

    return {
      success: true,
      credentialId: credId,
      username: userCred.username,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';

    if (
      err instanceof DOMException && err.name === 'AbortError'
    ) {
      return {
        success: false,
        credentialId: null,
        username: null,
        error: 'Authentication cancelled by user',
      };
    }

    return { success: false, credentialId: null, username: null, error: message };
  }
}

/**
 * Remove a stored passkey credential.
 */
export function removePasskey(credentialId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const credentials = getStoredCredentials();
    const filtered = credentials.filter((c) => c.id !== credentialId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered.length < credentials.length;
  } catch {
    return false;
  }
}

/**
 * Clear all stored passkey credentials.
 */
export function clearAllPasskeys(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
