/**
 * Tests for ChaCha20-Poly1305 encryption/decryption using @noble/ciphers.
 * The encrypt/decrypt functions are now synchronous (sync API).
 */
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateNonce, deriveSymmetricKey, deriveTopic, } from '../../src/crypto/encrypt.js';
describe('encrypt / decrypt roundtrip', () => {
    it('should encrypt and decrypt back to original plaintext', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const plaintext = new TextEncoder().encode('Hello, Cinacoin!');
        const encrypted = encrypt(key, plaintext);
        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(0);
        const decrypted = decrypt(key, encrypted);
        expect(Array.from(decrypted)).toEqual(Array.from(plaintext));
    });
    it('should produce different ciphertexts for same plaintext (random nonce)', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const plaintext = new TextEncoder().encode('same message');
        const e1 = encrypt(key, plaintext);
        const e2 = encrypt(key, plaintext);
        // Different nonce means different ciphertext
        expect(e1).not.toBe(e2);
        // Both should decrypt to the same plaintext
        expect(Array.from(decrypt(key, e1))).toEqual(Array.from(plaintext));
        expect(Array.from(decrypt(key, e2))).toEqual(Array.from(plaintext));
    });
    it('should produce longer output for longer plaintext', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const short = encrypt(key, new Uint8Array(8));
        const long = encrypt(key, new Uint8Array(64));
        // ChaCha20-Poly1305: nonce(12) + ciphertext(same as plaintext) + tag(16)
        expect(long.length).toBeGreaterThan(short.length);
    });
    it('should use provided nonce when given', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const plaintext = new TextEncoder().encode('fixed nonce test');
        const nonce = new Uint8Array(12);
        nonce.fill(0x42);
        const encrypted1 = encrypt(key, plaintext, nonce);
        const encrypted2 = encrypt(key, plaintext, nonce);
        // Same nonce = same ciphertext
        expect(encrypted1).toBe(encrypted2);
    });
    it('should produce valid base64 output', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const plaintext = new TextEncoder().encode('base64 test');
        const encrypted = encrypt(key, plaintext);
        // Should be valid base64
        const decoded = atob(encrypted);
        expect(decoded.length).toBeGreaterThan(0);
    });
    it('should encrypt empty plaintext', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const encrypted = encrypt(key, new Uint8Array(0));
        const decrypted = decrypt(key, encrypted);
        expect(decrypted).toEqual(new Uint8Array(0));
    });
});
describe('decrypt error handling', () => {
    it('should throw when data is too short', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const tooShort = btoa('abc'); // less than nonce length
        expect(() => decrypt(key, tooShort)).toThrow('Encrypted data too short');
    });
    it('should throw when using wrong key for decryption', () => {
        const key1 = new Uint8Array(32);
        const key2 = new Uint8Array(32);
        crypto.getRandomValues(key1);
        crypto.getRandomValues(key2);
        const plaintext = new TextEncoder().encode('secret');
        const encrypted = encrypt(key1, plaintext);
        expect(() => decrypt(key2, encrypted)).toThrow();
    });
    it('should throw when ciphertext is tampered', () => {
        const key = new Uint8Array(32);
        crypto.getRandomValues(key);
        const plaintext = new TextEncoder().encode('tamper test');
        let encrypted = encrypt(key, plaintext);
        // Tamper with one byte of the ciphertext (skip nonce)
        const decoded = atob(encrypted);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }
        // Flip a byte in the ciphertext portion (after nonce)
        const nonceLen = 12;
        if (bytes.length > nonceLen) {
            bytes[nonceLen] ^= 0xff;
        }
        const tampered = btoa(String.fromCharCode(...bytes));
        expect(() => decrypt(key, tampered)).toThrow();
    });
});
describe('generateNonce', () => {
    it('should generate a 12-byte nonce', () => {
        const nonce = generateNonce();
        expect(nonce).toBeInstanceOf(Uint8Array);
        expect(nonce.length).toBe(12);
    });
    it('should generate different nonces on each call', () => {
        const n1 = generateNonce();
        const n2 = generateNonce();
        expect(n1).not.toEqual(n2);
    });
});
describe('deriveSymmetricKey', () => {
    it('should derive a 32-byte key from two public keys', () => {
        const pubA = new Uint8Array(32);
        const pubB = new Uint8Array(32);
        crypto.getRandomValues(pubA);
        crypto.getRandomValues(pubB);
        const key = deriveSymmetricKey(pubA, pubB);
        expect(key).toBeInstanceOf(Uint8Array);
        expect(key.length).toBe(32);
    });
    it('should produce deterministic output for same inputs', () => {
        const pubA = new Uint8Array(32);
        const pubB = new Uint8Array(32);
        crypto.getRandomValues(pubA);
        crypto.getRandomValues(pubB);
        const k1 = deriveSymmetricKey(pubA, pubB);
        const k2 = deriveSymmetricKey(pubA, pubB);
        expect(k1).toEqual(k2);
    });
    it('should produce different keys for swapped inputs', () => {
        const pubA = new Uint8Array(32);
        const pubB = new Uint8Array(32);
        crypto.getRandomValues(pubA);
        crypto.getRandomValues(pubB);
        const k1 = deriveSymmetricKey(pubA, pubB);
        const k2 = deriveSymmetricKey(pubB, pubA);
        expect(k1).not.toEqual(k2);
    });
});
describe('deriveTopic', () => {
    it('should produce a 64-character hex topic', () => {
        const pubA = new Uint8Array(32);
        const pubB = new Uint8Array(32);
        crypto.getRandomValues(pubA);
        crypto.getRandomValues(pubB);
        const topic = deriveTopic(pubA, pubB);
        expect(topic.length).toBe(64);
        expect(/^[0-9a-f]{64}$/.test(topic)).toBe(true);
    });
    it('should be deterministic for same inputs', () => {
        const pubA = new Uint8Array(32);
        const pubB = new Uint8Array(32);
        crypto.getRandomValues(pubA);
        crypto.getRandomValues(pubB);
        const t1 = deriveTopic(pubA, pubB);
        const t2 = deriveTopic(pubA, pubB);
        expect(t1).toBe(t2);
    });
});
//# sourceMappingURL=encrypt.test.js.map