/**
 * Crypto utilities for WalletConnect v2.
 *
 * Re-exports and wraps the core SDK's X25519 + ChaCha20-Poly1305
 * implementations with WC v2–specific helpers.
 */

export {
  generateKeypair,
  sharedSecret,
  serializeKeypair,
  deserializeKeypair,
  bytesToHex,
  hexToBytes,
  type X25519Keypair,
} from '@onchainux/core';

export {
  encrypt,
  decrypt,
  deriveSymmetricKey,
  deriveTopic,
  generateNonce,
} from '@onchainux/core';

import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Generate a random 32-byte symmetric key (for pairing channel).
 *
 * @returns 64-character hex string.
 */
export function generateSymKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random 32-byte topic (for pairing or session).
 *
 * @returns 64-character hex string.
 */
export function generateTopic(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a shared secret key from an X25519 keypair and peer public key,
 * then hash it with SHA-256 for use as a ChaCha20-Poly1305 key.
 *
 * This matches the WC v2 key derivation: shared_secret = DH(priv, peer_pub).
 *
 * @param privateKey - Our X25519 private key (32 bytes).
 * @param peerPublicKey - Peer's X25519 public key (32 bytes).
 * @returns 32-byte shared secret.
 */
export function deriveSharedSecret(
  privateKey: Uint8Array,
  peerPublicKey: Uint8Array,
): Uint8Array {
  return sharedSecret(privateKey, peerPublicKey);
}

/**
 * Derive a session topic from our public key and the peer's public key.
 *
 * Session topics are derived differently from pairing topics — they use
 * the SHA-256 hash of both public keys concatenated.
 *
 * @param publicKeyA - First public key (32 bytes).
 * @param publicKeyB - Second public key (32 bytes).
 * @returns 64-character hex topic.
 */
export function deriveSessionTopic(
  publicKeyA: Uint8Array,
  publicKeyB: Uint8Array,
): string {
  const combined = new Uint8Array(publicKeyA.length + publicKeyB.length);
  combined.set(publicKeyA);
  combined.set(publicKeyB);
  const hash = sha256(combined);
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a self-authentication key from a shared secret.
 *
 * Used to verify that a message came from the expected peer.
 *
 * @param sharedSecret - The shared secret (32 bytes).
 * @param context - Context string (e.g., 'auth').
 * @returns 32-byte authentication key.
 */
export function deriveAuthKey(
  sharedSecret: Uint8Array,
  context: string,
): Uint8Array {
  const contextBytes = new TextEncoder().encode(context);
  const combined = new Uint8Array(sharedSecret.length + contextBytes.length);
  combined.set(sharedSecret);
  combined.set(contextBytes);
  return sha256(combined);
}
