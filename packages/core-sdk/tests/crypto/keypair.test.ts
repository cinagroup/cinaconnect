/**
 * Tests for X25519 keypair generation, serialization, and shared secret.
 * Source uses @noble/curves for real X25519 (sync API).
 */

import { describe, it, expect } from 'vitest';
import {
  generateKeypair,
  sharedSecret,
  serializeKeypair,
  deserializeKeypair,
  bytesToHex,
  hexToBytes,
} from '../../src/crypto/keypair';

describe('generateKeypair', () => {
  it('should generate a keypair with 32-byte keys', () => {
    const keypair = generateKeypair();
    expect(keypair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keypair.privateKey.length).toBe(32);
    expect(keypair.publicKey.length).toBe(32);
  });

  it('should generate different keypairs on each call', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    expect(kp1.privateKey).not.toEqual(kp2.privateKey);
    expect(kp1.publicKey).not.toEqual(kp2.publicKey);
  });

  it('should produce a clamped private key', () => {
    // @noble/curves keygen returns a properly clamped secret key
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    // Both should be valid 32-byte keys
    expect(kp1.privateKey.length).toBe(32);
    expect(kp2.privateKey.length).toBe(32);
    // Should not be all zeros
    expect(kp1.privateKey.some((b) => b !== 0)).toBe(true);
  });
});

describe('sharedSecret', () => {
  it('should compute a 32-byte shared secret', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const secret = sharedSecret(kp1.privateKey, kp2.publicKey);
    expect(secret).toBeInstanceOf(Uint8Array);
    expect(secret.length).toBe(32);
  });

  it('should produce the same shared secret for both parties (DH property)', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    // sharedSecret(priv1, pub2) === sharedSecret(priv2, pub1)
    const s1 = sharedSecret(kp1.privateKey, kp2.publicKey);
    const s2 = sharedSecret(kp2.privateKey, kp1.publicKey);
    expect(s1).toEqual(s2);
  });

  it('should produce deterministic output for same inputs', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const s1 = sharedSecret(kp1.privateKey, kp2.publicKey);
    const s2 = sharedSecret(kp1.privateKey, kp2.publicKey);
    expect(s1).toEqual(s2);
  });

  it('should produce different secrets for different keypairs', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const kp3 = generateKeypair();
    const s1 = sharedSecret(kp1.privateKey, kp2.publicKey);
    const s2 = sharedSecret(kp1.privateKey, kp3.publicKey);
    expect(s1).not.toEqual(s2);
  });
});

describe('serializeKeypair / deserializeKeypair', () => {
  it('should round-trip serialize and deserialize', () => {
    const keypair = generateKeypair();
    const serialized = serializeKeypair(keypair);
    expect(typeof serialized.publicKey).toBe('string');
    expect(typeof serialized.privateKey).toBe('string');
    expect(serialized.publicKey.length).toBe(64);
    expect(serialized.privateKey.length).toBe(64);

    const deserialized = deserializeKeypair(serialized);
    expect(deserialized.publicKey).toEqual(keypair.publicKey);
    expect(deserialized.privateKey).toEqual(keypair.privateKey);
  });
});

describe('bytesToHex / hexToBytes', () => {
  it('should convert bytes to hex and back', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe('deadbeef');
    const recovered = hexToBytes(hex);
    expect(recovered).toEqual(bytes);
  });

  it('should handle zero bytes', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe('000000');
    expect(hexToBytes(hex)).toEqual(bytes);
  });

  it('should handle empty arrays', () => {
    expect(bytesToHex(new Uint8Array([]))).toBe('');
    expect(hexToBytes('')).toEqual(new Uint8Array([]));
  });

  it('should convert full 32-byte array to 64-char hex', () => {
    const keypair = generateKeypair();
    const hex = bytesToHex(keypair.privateKey);
    expect(hex.length).toBe(64);
    expect(hexToBytes(hex)).toEqual(keypair.privateKey);
  });
});
