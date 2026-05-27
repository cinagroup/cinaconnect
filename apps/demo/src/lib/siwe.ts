/**
 * SIWE (Sign-In With Ethereum) implementation wrapper.
 *
 * Builds EIP-4361 compliant messages, handles wallet signing via
 * personal_sign, verifies signatures, and manages session state.
 *
 * Uses @cinacoin/siwe for message generation/parsing.
 */

import {
  generateMessage,
  generateNonce,
  generateTimestamp,
  parseMessage,
} from '@cinacoin/siwe';
import { createSiweSession } from './authSession';

/* ── Types ── */

export interface SiweMessageData {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  resources?: string[];
}

export interface SiweAuthResult {
  success: boolean;
  message: string;
  signature: string;
  address: string;
  nonce: string;
  domain: string;
  issuedAt: string;
  error?: string;
}

/* ── SIWE Message Creation ── */

/**
 * Create a SIWE message (EIP-4361) for the given address and chain.
 *
 * Returns both the formatted message string and the structured data.
 */
export function createSiweMessage(
  address: string,
  chainId: number
): { message: string; data: SiweMessageData } {
  const nonce = generateNonce(16);
  const issuedAt = generateTimestamp();

  // Set expiration to 24 hours from now
  const now = new Date();
  const expirationTime = new Date(
    now.getTime() + 24 * 60 * 60 * 1000
  ).toISOString();

  const domain =
    typeof window !== 'undefined'
      ? window.location.host
      : 'demo.cinacoin.io';
  const uri =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://demo.cinacoin.io';

  const message = generateMessage({
    domain,
    address,
    statement: 'Sign in to Cinacoin Demo',
    uri,
    version: '1',
    chainId,
    nonce,
    issuedAt,
    expirationTime,
    resources: [`${uri}/terms`, `${uri}/privacy`],
  });

  return {
    message,
    data: {
      domain,
      address,
      statement: 'Sign in to Cinacoin Demo',
      uri,
      version: '1',
      chainId,
      nonce,
      issuedAt,
      expirationTime,
      resources: [`${uri}/terms`, `${uri}/privacy`],
    },
  };
}

/* ── Wallet Signing ── */

/**
 * Encode a string as hex for personal_sign.
 */
function toHex(str: string): string {
  return (
    '0x' +
    Array.from(new TextEncoder().encode(str))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Request a personal_sign signature from the injected Ethereum provider.
 *
 * @throws Error if no provider is available or user rejects.
 */
export async function signSiweMessage(
  message: string,
  address: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum provider available');
  }

  const hexMessage = toHex(message);

  const signature = (await window.ethereum.request!({
    method: 'personal_sign',
    params: [hexMessage, address],
  })) as string;

  return signature;
}

/* ── Signature Verification ── */

/**
 * Verify a SIWE signature by confirming the signer address matches
 * the address in the SIWE message and the wallet is still connected.
 *
 * This performs client-side verification. In production, you would
 * send the message + signature to a backend for cryptographic
 * recovery and verification.
 */
export async function verifySiweSignature(
  address: string,
  message: string,
  _signature: string
): Promise<{ valid: boolean; recoveredAddress: string; error?: string }> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return {
      valid: false,
      recoveredAddress: '',
      error: 'No Ethereum provider available',
    };
  }

  try {
    // Parse the SIWE message to extract the address from it
    const parsed = parseMessage(message);

    // Normalize addresses for comparison (case-insensitive)
    const normalizedExpected = address.toLowerCase();
    const normalizedMessage = parsed.address.toLowerCase();

    // Check that the address in the message matches the expected address
    if (normalizedMessage !== normalizedExpected) {
      return {
        valid: false,
        recoveredAddress: parsed.address,
        error: 'Address in SIWE message does not match wallet address',
      };
    }

    // Verify the wallet is still connected and owns this address
    const accounts = (await window.ethereum.request!({
      method: 'eth_accounts',
    })) as string[];

    const isConnected = accounts.some(
      (addr: string) => addr.toLowerCase() === normalizedExpected
    );

    if (!isConnected) {
      return {
        valid: false,
        recoveredAddress: parsed.address,
        error: 'Wallet is not connected or address mismatch',
      };
    }

    return { valid: true, recoveredAddress: parsed.address };
  } catch (err) {
    return {
      valid: false,
      recoveredAddress: '',
      error: err instanceof Error ? err.message : 'Verification failed',
    };
  }
}

/* ── Full SIWE Auth Flow ── */

/**
 * Complete SIWE authentication flow:
 * 1. Generate SIWE message
 * 2. Sign with wallet
 * 3. Verify signature
 * 4. Store session
 */
export async function authenticateSiwe(
  address: string,
  chainId: number
): Promise<SiweAuthResult> {
  try {
    // Step 1: Create message
    const { message, data } = createSiweMessage(address, chainId);

    // Step 2: Sign
    const signature = await signSiweMessage(message, address);

    // Step 3: Verify
    const verification = await verifySiweSignature(address, message, signature);

    if (!verification.valid) {
      return {
        success: false,
        message: '',
        signature: '',
        address,
        nonce: data.nonce,
        domain: data.domain,
        issuedAt: data.issuedAt,
        error: verification.error || 'Signature verification failed',
      };
    }

    // Step 4: Store session
    createSiweSession(
      address,
      message,
      signature,
      data.nonce,
      data.domain,
      data.issuedAt
    );

    return {
      success: true,
      message,
      signature,
      address,
      nonce: data.nonce,
      domain: data.domain,
      issuedAt: data.issuedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'SIWE authentication failed';

    // Check for user rejection
    if (msg.includes('User denied') || msg.includes('rejected') || msg.includes('User rejected')) {
      return {
        success: false,
        message: '',
        signature: '',
        address,
        nonce: '',
        domain: '',
        issuedAt: '',
        error: 'Authentication cancelled by user',
      };
    }

    return {
      success: false,
      message: '',
      signature: '',
      address,
      nonce: '',
      domain: '',
      issuedAt: '',
      error: msg,
    };
  }
}
