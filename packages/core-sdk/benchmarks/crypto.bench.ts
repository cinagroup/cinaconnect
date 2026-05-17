/**
 * Benchmark — X25519 Key Exchange + ChaCha20-Poly1305 Encryption
 *
 * Measures cryptographic operation performance using @noble libraries.
 *
 * 5 scenarios:
 * - X25519 keypair generation
 * - Diffie-Hellman shared secret computation
 * - ChaCha20-Poly1305 encryption
 * - ChaCha20-Poly1305 decryption
 * - End-to-end encrypt/decrypt round-trip
 */

import { describe, it, expect } from 'vitest';
import {
  generateKeypair,
  sharedSecret,
  bytesToHex,
  hexToBytes,
} from '../src/crypto/keypair.js';
import {
  encrypt,
  decrypt,
  deriveSymmetricKey,
  generateNonce,
} from '../src/crypto/encrypt.js';

async function measureAsync(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

function measure(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe('Crypto Benchmarks', () => {
  it('should generate X25519 keypair within 5ms', async () => {
    const duration = await measureAsync(async () => {
      generateKeypair();
    });
    expect(duration).toBeLessThan(5);
  });

  it('should compute Diffie-Hellman shared secret within 2ms', async () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();

    const duration = await measureAsync(async () => {
      sharedSecret(kp1.privateKey, kp2.publicKey);
    });
    expect(duration).toBeLessThan(2);

    // Verify symmetry
    const secret1 = sharedSecret(kp1.privateKey, kp2.publicKey);
    const secret2 = sharedSecret(kp2.privateKey, kp1.publicKey);
    expect(bytesToHex(secret1)).toBe(bytesToHex(secret2));
  });

  it('should encrypt a payload within 5ms', async () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const key = deriveSymmetricKey(kp1.publicKey, kp2.publicKey);
    const plaintext = new TextEncoder().encode('Hello, encrypted world!');

    const duration = await measureAsync(async () => {
      encrypt(key, plaintext);
    });
    expect(duration).toBeLessThan(5);
  });

  it('should decrypt a payload within 5ms', async () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const key = deriveSymmetricKey(kp1.publicKey, kp2.publicKey);
    const plaintext = new TextEncoder().encode('Hello, encrypted world!');
    const encrypted = encrypt(key, plaintext);

    const duration = await measureAsync(async () => {
      decrypt(key, encrypted);
    });
    expect(duration).toBeLessThan(5);
  });

  it('should complete encrypt→decrypt round-trip within 10ms', async () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const key = deriveSymmetricKey(kp1.publicKey, kp2.publicKey);
    const plaintext = new TextEncoder().encode(
      'The quick brown fox jumps over the lazy dog. ' +
        'Round-trip benchmark for ChaCha20-Poly1305 AEAD.',
    );

    const duration = await measureAsync(async () => {
      const encrypted = encrypt(key, plaintext);
      const decrypted = decrypt(key, encrypted);
      expect(new TextDecoder().decode(decrypted)).toBe(
        new TextDecoder().decode(plaintext),
      );
    });
    expect(duration).toBeLessThan(10);
  });
});
