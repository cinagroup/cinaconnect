/**
 * ChaCha20-Poly1305 AEAD encryption/decryption.
 *
 * Implements the encryption scheme used by WalletConnect v2:
 * - Cipher: ChaCha20-Poly1305 (IETF variant, RFC 8439)
 * - Nonce: 12 bytes (96 bits)
 * - Key: 32 bytes (256 bits) from X25519 shared secret
 *
 * Output format: base64(nonce || ciphertext || tag)
 */

import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Encrypt plaintext using ChaCha20-Poly1305.
 *
 * @param key - 32-byte shared secret (from X25519 DH).
 * @param plaintext - Data to encrypt.
 * @param nonce - 12-byte nonce. If not provided, a random nonce is generated.
 * @returns Base64-encoded encrypted data (nonce || ciphertext || tag).
 */
export function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  nonce?: Uint8Array,
): string {
  const nonceUsed = nonce ?? generateNonce();
  const cipher = chacha20poly1305(key, nonceUsed);
  const ciphertext = cipher.encrypt(plaintext);

  // Combine nonce + ciphertext (tag is appended by the cipher)
  const combined = new Uint8Array(nonceUsed.length + ciphertext.length);
  combined.set(nonceUsed);
  combined.set(ciphertext, nonceUsed.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt ChaCha20-Poly1305 encrypted data.
 *
 * @param key - 32-byte shared secret (from X25519 DH).
 * @param encryptedBase64 - Base64-encoded (nonce || ciphertext || tag).
 * @returns Decrypted plaintext.
 */
export function decrypt(
  key: Uint8Array,
  encryptedBase64: string,
): Uint8Array {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const nonceLen = chacha20poly1305.nonceLength;
  if (combined.length < nonceLen) {
    throw new Error('Encrypted data too short (missing nonce)');
  }

  const nonce = combined.slice(0, nonceLen);
  const ciphertext = combined.slice(nonceLen);

  const cipher = chacha20poly1305(key, nonce);
  return cipher.decrypt(ciphertext);
}

/**
 * Generate a random 12-byte nonce for ChaCha20-Poly1305.
 *
 * @returns 12-byte random nonce.
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Derive a symmetric encryption key from two public keys.
 * Uses SHA-256 hash of the concatenated public keys.
 *
 * @param publicKeyA - First public key (32 bytes).
 * @param publicKeyB - Second public key (32 bytes).
 * @returns 32-byte symmetric key.
 */
export function deriveSymmetricKey(
  publicKeyA: Uint8Array,
  publicKeyB: Uint8Array,
): Uint8Array {
  const combined = new Uint8Array(publicKeyA.length + publicKeyB.length);
  combined.set(publicKeyA);
  combined.set(publicKeyB);
  return sha256(combined);
}

/**
 * Derive a topic identifier from two public keys.
 *
 * @param publicKeyA - First public key.
 * @param publicKeyB - Second public key.
 * @returns 64-character hex string (32 bytes).
 */
export function deriveTopic(
  publicKeyA: Uint8Array,
  publicKeyB: Uint8Array,
): string {
  const key = deriveSymmetricKey(publicKeyA, publicKeyB);
  return Array.from(key, (b) => b.toString(16).padStart(2, '0')).join('');
}
