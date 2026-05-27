/**
 * Crypto utilities for WalletConnect v2.
 *
 * Re-exports core SDK's X25519 + ChaCha20-Poly1305 implementations
 * and adds WC v2–specific helpers: Type-0/Type-1 envelopes, HMAC
 * authentication, topic derivation per spec.
 */
export { generateKeypair, sharedSecret, serializeKeypair, deserializeKeypair, bytesToHex, hexToBytes, type X25519Keypair, } from '@cinacoin/core-sdk';
export { encrypt as coreEncrypt, decrypt as coreDecrypt, deriveSymmetricKey, deriveTopic, generateNonce, } from '@cinacoin/core-sdk';
import { type X25519Keypair } from '@cinacoin/core-sdk';
import { encrypt as _encrypt, decrypt as _decrypt } from '@cinacoin/core-sdk';
export { _encrypt as encrypt, _decrypt as decrypt };
/**
 * Generate a random 32-byte symmetric key (for pairing channel).
 *
 * @returns 64-character hex string.
 */
export declare function generateSymKey(): string;
/**
 * Generate a random 32-byte topic (for pairing or session).
 *
 * @returns 64-character hex string.
 */
export declare function generateTopic(): string;
/**
 * Derive a shared secret key from an X25519 keypair and peer public key.
 *
 * Matches WC v2 key derivation: shared_secret = DH(priv, peer_pub).
 *
 * @param privateKey - Our X25519 private key (32 bytes).
 * @param peerPublicKey - Peer's X25519 public key (32 bytes).
 * @returns 32-byte shared secret.
 */
export declare function deriveSharedSecret(privateKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array;
/**
 * Derive a session topic from our public key and the peer's public key.
 *
 * Per WC v2 spec: session_topic = SHA-256(publicKeyA || publicKeyB).
 *
 * @param publicKeyA - First public key (32 bytes).
 * @param publicKeyB - Second public key (32 bytes).
 * @returns 64-character hex topic.
 */
export declare function deriveSessionTopic(publicKeyA: Uint8Array, publicKeyB: Uint8Array): string;
/**
 * Derive a self-authentication key from a shared secret.
 *
 * Used to verify that a message came from the expected peer.
 *
 * @param sharedSecret - The shared secret (32 bytes).
 * @param context - Context string (e.g., 'auth').
 * @returns 32-byte authentication key.
 */
export declare function deriveAuthKey(sharedSecret: Uint8Array, context: string): Uint8Array;
/**
 * Compute HMAC-SHA256 over data with a given key.
 *
 * @param key - HMAC key (any length).
 * @param data - Data to authenticate.
 * @returns 32-byte HMAC tag.
 */
export declare function computeHmac(key: Uint8Array, data: Uint8Array): Uint8Array;
/**
 * Verify an HMAC tag against expected data.
 *
 * @param key - HMAC key.
 * @param data - Original data.
 * @param expectedTag - Expected 32-byte HMAC tag.
 * @returns Whether the tag is valid.
 */
export declare function verifyHmac(key: Uint8Array, data: Uint8Array, expectedTag: Uint8Array): boolean;
/**
 * Encrypt and encode a Type-0 envelope for the pairing channel.
 *
 * Format: JSON { type: 0, iv: base64, ciphertext: base64 }
 * - iv: 12-byte ChaCha20 nonce
 * - ciphertext: encrypted payload + 16-byte Poly1305 tag
 *
 * @param symKey - 64-char hex symmetric key.
 * @param payload - JSON-serializable data.
 * @returns JSON string of Type-0 envelope.
 */
export declare function encodeType0Envelope(symKey: string, payload: unknown): string;
/**
 * Decode and decrypt a Type-0 envelope.
 *
 * @param symKey - 64-char hex symmetric key.
 * @param envelopeJson - JSON string of Type-0 envelope.
 * @returns Decrypted JSON object.
 */
export declare function decodeType0Envelope(symKey: string, envelopeJson: string): unknown;
/**
 * Encrypt and encode a Type-1 envelope for the session channel.
 *
 * Includes sender's public key so the receiver can derive the shared secret.
 *
 * @param keypair - Our X25519 keypair.
 * @param peerPublicKey - Peer's public key (hex).
 * @param payload - JSON-serializable data.
 * @returns JSON string of Type-1 envelope.
 */
export declare function encodeType1Envelope(keypair: X25519Keypair, peerPublicKey: string, payload: unknown): string;
/**
 * Decode and decrypt a Type-1 envelope.
 *
 * @param keypair - Our X25519 keypair.
 * @param envelopeJson - JSON string of Type-1 envelope.
 * @returns Decrypted JSON object.
 */
export declare function decodeType1Envelope(keypair: X25519Keypair, envelopeJson: string): unknown;
/**
 * Check if a hex string is a valid 64-char topic.
 */
export declare function isValidTopic(topic: string): boolean;
/**
 * Check if a hex string is a valid 64-char symmetric key.
 */
export declare function isValidSymKey(symKey: string): boolean;
/**
 * Convert base64 to hex string.
 */
export declare function base64ToHex(base64: string): string;
/**
 * Convert hex string to base64.
 */
export declare function hexToBase64(hex: string): string;
//# sourceMappingURL=crypto.d.ts.map