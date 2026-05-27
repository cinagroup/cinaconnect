/**
 * Crypto utilities for WalletConnect v2.
 *
 * Re-exports core SDK's X25519 + ChaCha20-Poly1305 implementations
 * and adds WC v2–specific helpers: Type-0/Type-1 envelopes, HMAC
 * authentication, topic derivation per spec.
 */
export { generateKeypair, sharedSecret, serializeKeypair, deserializeKeypair, bytesToHex, hexToBytes, } from '@cinacoin/core-sdk';
export { encrypt as coreEncrypt, decrypt as coreDecrypt, deriveSymmetricKey, deriveTopic, generateNonce, } from '@cinacoin/core-sdk';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac_sha256 } from '@noble/hashes/hmac.js';
import { sharedSecret, hexToBytes, generateNonce, } from '@cinacoin/core-sdk';
// Re-export the core encrypt/decrypt with original names for convenience
import { encrypt as _encrypt, decrypt as _decrypt, } from '@cinacoin/core-sdk';
export { _encrypt as encrypt, _decrypt as decrypt };
// ============================================================
// Symmetric key generation
// ============================================================
/**
 * Generate a random 32-byte symmetric key (for pairing channel).
 *
 * @returns 64-character hex string.
 */
export function generateSymKey() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Generate a random 32-byte topic (for pairing or session).
 *
 * @returns 64-character hex string.
 */
export function generateTopic() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
// ============================================================
// Shared secret & session topic derivation
// ============================================================
/**
 * Derive a shared secret key from an X25519 keypair and peer public key.
 *
 * Matches WC v2 key derivation: shared_secret = DH(priv, peer_pub).
 *
 * @param privateKey - Our X25519 private key (32 bytes).
 * @param peerPublicKey - Peer's X25519 public key (32 bytes).
 * @returns 32-byte shared secret.
 */
export function deriveSharedSecret(privateKey, peerPublicKey) {
    return sharedSecret(privateKey, peerPublicKey);
}
/**
 * Derive a session topic from our public key and the peer's public key.
 *
 * Per WC v2 spec: session_topic = SHA-256(publicKeyA || publicKeyB).
 *
 * @param publicKeyA - First public key (32 bytes).
 * @param publicKeyB - Second public key (32 bytes).
 * @returns 64-character hex topic.
 */
export function deriveSessionTopic(publicKeyA, publicKeyB) {
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
export function deriveAuthKey(sharedSecret, context) {
    const contextBytes = new TextEncoder().encode(context);
    const combined = new Uint8Array(sharedSecret.length + contextBytes.length);
    combined.set(sharedSecret);
    combined.set(contextBytes);
    return sha256(combined);
}
// ============================================================
// HMAC-SHA256 authentication
// ============================================================
/**
 * Compute HMAC-SHA256 over data with a given key.
 *
 * @param key - HMAC key (any length).
 * @param data - Data to authenticate.
 * @returns 32-byte HMAC tag.
 */
export function computeHmac(key, data) {
    return hmac_sha256(key, data);
}
/**
 * Verify an HMAC tag against expected data.
 *
 * @param key - HMAC key.
 * @param data - Original data.
 * @param expectedTag - Expected 32-byte HMAC tag.
 * @returns Whether the tag is valid.
 */
export function verifyHmac(key, data, expectedTag) {
    const computed = computeHmac(key, data);
    if (computed.length !== expectedTag.length)
        return false;
    // Constant-time comparison to prevent timing attacks
    let result = 0;
    for (let i = 0; i < computed.length; i++) {
        result |= computed[i] ^ expectedTag[i];
    }
    return result === 0;
}
// ============================================================
// Type-0 Envelope (pairing channel — symmetric key)
// ============================================================
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
export function encodeType0Envelope(symKey, payload) {
    const keyBytes = hexToBytes(symKey);
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const iv = generateNonce(); // 12 bytes
    // encrypt returns base64(iv || ciphertext || tag)
    const encrypted = _encrypt(keyBytes, plaintext, iv);
    // Parse combined bytes back out
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const ivBase64 = btoa(String.fromCharCode(...combined.slice(0, 12)));
    const ciphertextBase64 = btoa(String.fromCharCode(...combined.slice(12)));
    const envelope = {
        type: 0,
        iv: ivBase64,
        ciphertext: ciphertextBase64,
    };
    return JSON.stringify(envelope);
}
/**
 * Decode and decrypt a Type-0 envelope.
 *
 * @param symKey - 64-char hex symmetric key.
 * @param envelopeJson - JSON string of Type-0 envelope.
 * @returns Decrypted JSON object.
 */
export function decodeType0Envelope(symKey, envelopeJson) {
    const envelope = JSON.parse(envelopeJson);
    if (envelope.type !== 0) {
        throw new Error('Expected Type-0 envelope');
    }
    // Reconstruct combined: iv || ciphertext
    const ivBytes = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
    const ctBytes = Uint8Array.from(atob(envelope.ciphertext), (c) => c.charCodeAt(0));
    const combined = new Uint8Array(ivBytes.length + ctBytes.length);
    combined.set(ivBytes);
    combined.set(ctBytes, ivBytes.length);
    const combinedBase64 = btoa(String.fromCharCode(...combined));
    const keyBytes = hexToBytes(symKey);
    const plaintext = _decrypt(keyBytes, combinedBase64);
    return JSON.parse(new TextDecoder().decode(plaintext));
}
// ============================================================
// Type-1 Envelope (session channel — X25519 DH)
// ============================================================
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
export function encodeType1Envelope(keypair, peerPublicKey, payload) {
    const peerPubBytes = hexToBytes(peerPublicKey);
    const sharedKey = sharedSecret(keypair.privateKey, peerPubBytes);
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const iv = generateNonce();
    const encrypted = _encrypt(sharedKey, plaintext, iv);
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const ivBase64 = btoa(String.fromCharCode(...combined.slice(0, 12)));
    const ciphertextBase64 = btoa(String.fromCharCode(...combined.slice(12)));
    const envelope = {
        type: 1,
        senderPublicKey: btoa(String.fromCharCode(...keypair.publicKey)),
        iv: ivBase64,
        ciphertext: ciphertextBase64,
    };
    return JSON.stringify(envelope);
}
/**
 * Decode and decrypt a Type-1 envelope.
 *
 * @param keypair - Our X25519 keypair.
 * @param envelopeJson - JSON string of Type-1 envelope.
 * @returns Decrypted JSON object.
 */
export function decodeType1Envelope(keypair, envelopeJson) {
    const envelope = JSON.parse(envelopeJson);
    if (envelope.type !== 1) {
        throw new Error('Expected Type-1 envelope');
    }
    const senderPubBytes = Uint8Array.from(atob(envelope.senderPublicKey), (c) => c.charCodeAt(0));
    const sharedKey = sharedSecret(keypair.privateKey, senderPubBytes);
    const ivBytes = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
    const ctBytes = Uint8Array.from(atob(envelope.ciphertext), (c) => c.charCodeAt(0));
    const combined = new Uint8Array(ivBytes.length + ctBytes.length);
    combined.set(ivBytes);
    combined.set(ctBytes, ivBytes.length);
    const combinedBase64 = btoa(String.fromCharCode(...combined));
    const plaintext = _decrypt(sharedKey, combinedBase64);
    return JSON.parse(new TextDecoder().decode(plaintext));
}
// ============================================================
// Validation helpers
// ============================================================
/**
 * Check if a hex string is a valid 64-char topic.
 */
export function isValidTopic(topic) {
    return /^[0-9a-f]{64}$/i.test(topic);
}
/**
 * Check if a hex string is a valid 64-char symmetric key.
 */
export function isValidSymKey(symKey) {
    return /^[0-9a-f]{64}$/i.test(symKey);
}
/**
 * Convert base64 to hex string.
 */
export function base64ToHex(base64) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Convert hex string to base64.
 */
export function hexToBase64(hex) {
    const bytes = hexToBytes(hex);
    return btoa(String.fromCharCode(...bytes));
}
//# sourceMappingURL=crypto.js.map