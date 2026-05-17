import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
export { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { CryptoKeypair } from './types.js';

/**
 * Generate a P-256 keypair for passkey operations.
 */
export function generateKeypair(): CryptoKeypair {
  const privateKey = p256.utils.randomPrivateKey();
  const publicKey = p256.getPublicKey(privateKey);

  return {
    publicKey: bytesToHex(publicKey),
    privateKey: bytesToHex(privateKey),
  };
}

/**
 * Create a cryptographic challenge for WebAuthn registration/authentication.
 */
export function generateChallenge(length = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Encode a challenge to base64url for WebAuthn.
 */
export function encodeChallenge(challenge: Uint8Array): string {
  return btoa(String.fromCharCode(...challenge))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64url challenge back to Uint8Array.
 */
export function decodeChallenge(challengeBase64: string): Uint8Array {
  const base64 = challengeBase64
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(challengeBase64.length + ((4 - (challengeBase64.length % 4)) % 4), '=');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Sign data with a P-256 private key.
 */
export function signData(
  privateKeyHex: string,
  data: Uint8Array,
): Uint8Array {
  const privateKey = hexToBytes(privateKeyHex);
  const hash = sha256(data);
  return p256.sign(hash, privateKey).toCompactRawBytes();
}

/**
 * Verify a signature against a P-256 public key.
 */
export function verifySignature(
  publicKeyHex: string,
  data: Uint8Array,
  signatureHex: string,
): boolean {
  try {
    const publicKey = hexToBytes(publicKeyHex);
    const signature = hexToBytes(signatureHex);
    const hash = sha256(data);
    return p256.verify(signature, hash, publicKey);
  } catch {
    return false;
  }
}

/**
 * Hash a public key to derive an Ethereum-style address.
 * Returns last 20 bytes of keccak-256 equivalent (sha256 for P-256).
 */
export function deriveAddress(publicKeyHex: string): string {
  const publicKey = hexToBytes(publicKeyHex);
  const hash = sha256(publicKey);
  return bytesToHex(hash.slice(-20));
}

/**
 * Compress a public key to its compressed form (33 bytes).
 */
export function compressPublicKey(publicKeyHex: string): string {
  const publicKey = hexToBytes(publicKeyHex);
  const compressed = p256.ProjectivePoint.fromHex(publicKey).toRawBytes(true);
  return bytesToHex(compressed);
}
