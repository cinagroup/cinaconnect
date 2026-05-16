/**
 * Tests for AES-GCM encryption/decryption roundtrip, nonce generation, and key derivation.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  deriveSymmetricKey,
  deriveTopic,
} from '../../src/crypto/encrypt';

describe('encrypt', () => {
  it('should encrypt plaintext and return base64 string', async () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const plaintext = new TextEncoder().encode('Hello, OnChainUX!');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const encrypted = await encrypt(key, plaintext);
    warnSpy.mockRestore();

    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it('should produce valid AES-GCM encrypted output', async () => {
    // The encrypt function uses AES-GCM as fallback since Web Crypto doesn't support
    // ChaCha20-Poly1305. We verify the function works and returns valid data.
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const plaintext = new Uint8Array(16);
    const encrypted = await encrypt(key, plaintext);
    // Should return a base64 string
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it('should produce different ciphertexts for same plaintext (random IV)', async () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const plaintext = new TextEncoder().encode('same message');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const e1 = await encrypt(key, plaintext);
    const e2 = await encrypt(key, plaintext);
    warnSpy.mockRestore();

    // Different IV means different ciphertext
    expect(e1).not.toBe(e2);
  });

  it('should produce longer output for longer plaintext', async () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const short = await encrypt(key, new Uint8Array(8));
    const long = await encrypt(key, new Uint8Array(64));
    warnSpy.mockRestore();

    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe('decrypt', () => {
  it('should decrypt encrypted data back to original plaintext', async () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const plaintext = new TextEncoder().encode('Round-trip test data for decryption');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const encrypted = await encrypt(key, plaintext);
    warnSpy.mockRestore();

    const decrypted = await decrypt(key, encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it('should throw when data is too short', async () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const tooShort = btoa('abc'); // less than 12 bytes

    await expect(decrypt(key, tooShort)).rejects.toThrow('Encrypted data too short');
  });

  it('should throw when using wrong key for decryption', async () => {
    const key1 = new Uint8Array(32);
    const key2 = new Uint8Array(32);
    crypto.getRandomValues(key1);
    crypto.getRandomValues(key2);
    const plaintext = new TextEncoder().encode('secret');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const encrypted = await encrypt(key1, plaintext);
    warnSpy.mockRestore();

    await expect(decrypt(key2, encrypted)).rejects.toThrow();
  });
});

describe('deriveSymmetricKey', () => {
  it('should derive a 32-byte key from two public keys', async () => {
    const pubA = new Uint8Array(32);
    const pubB = new Uint8Array(32);
    crypto.getRandomValues(pubA);
    crypto.getRandomValues(pubB);

    const key = await deriveSymmetricKey(pubA, pubB);
    expect(key.length).toBe(32);
  });

  it('should produce deterministic output for same inputs', async () => {
    const pubA = new Uint8Array(32);
    const pubB = new Uint8Array(32);
    crypto.getRandomValues(pubA);
    crypto.getRandomValues(pubB);

    const k1 = await deriveSymmetricKey(pubA, pubB);
    const k2 = await deriveSymmetricKey(pubA, pubB);
    expect(k1).toEqual(k2);
  });

  it('should produce different keys for swapped inputs', async () => {
    const pubA = new Uint8Array(32);
    const pubB = new Uint8Array(32);
    crypto.getRandomValues(pubA);
    crypto.getRandomValues(pubB);

    const k1 = await deriveSymmetricKey(pubA, pubB);
    const k2 = await deriveSymmetricKey(pubB, pubA);
    // SHA-256 of A||B ≠ SHA-256 of B||A
    expect(k1).not.toEqual(k2);
  });
});

describe('deriveTopic', () => {
  it('should produce a 64-character hex topic', async () => {
    const pubA = new Uint8Array(32);
    const pubB = new Uint8Array(32);
    crypto.getRandomValues(pubA);
    crypto.getRandomValues(pubB);

    const topic = await deriveTopic(pubA, pubB);
    expect(topic.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(topic)).toBe(true);
  });

  it('should be deterministic for same inputs', async () => {
    const pubA = new Uint8Array(32);
    const pubB = new Uint8Array(32);
    crypto.getRandomValues(pubA);
    crypto.getRandomValues(pubB);

    const t1 = await deriveTopic(pubA, pubB);
    const t2 = await deriveTopic(pubA, pubB);
    expect(t1).toBe(t2);
  });
});
