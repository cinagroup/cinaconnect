/**
 * Keys Server Integration Tests
 *
 * Tests key generation, encryption, storage, retrieval, and session management.
 * Uses the KeyManager TypeScript class with in-memory storage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KeyManager } from '@cinacoin/keys-server';

describe('Keys Server — Key Management', () => {
  let km: KeyManager;

  beforeEach(() => {
    km = new KeyManager({ encryptionKey: 'integration-test-key-2024' });
  });

  describe('storeKey / getKey', () => {
    it('should store and retrieve a key', async () => {
      const keyData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const stored = await km.storeKey('key-1', 'test key', keyData);

      expect(stored.id).toBe('key-1');
      expect(stored.label).toBe('test key');
      expect(stored.algorithm).toBe('aes-256-gcm');
      expect(stored.encrypted).toBeDefined();
      expect(stored.createdAt).toBeGreaterThan(0);
    });

    it('should return null for non-existent key', async () => {
      const result = await km.getKey('non-existent');
      expect(result).toBeNull();
    });

    it('should encrypt stored data', async () => {
      const keyData = new Uint8Array([10, 20, 30, 40]);
      await km.storeKey('enc-test', 'encrypted key', keyData);
      const stored = await km.getKey('enc-test');
      expect(stored).not.toBeNull();
      expect(stored!.encrypted).not.toBe('');
      // Encrypted data should be base64
      expect(stored!.encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should allow decrypting stored key data', async () => {
      const keyData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      await km.storeKey('decrypt-test', 'decryption test', keyData);
      const stored = await km.getKey('decrypt-test');
      expect(stored).not.toBeNull();

      const decrypted = km.decryptKey(stored!.encrypted);
      expect(Array.from(decrypted)).toEqual(Array.from(keyData));
    });

    it('should throw on invalid encrypted data', () => {
      expect(() => km.decryptKey('not-valid-base64!!!')).toThrow();
    });

    it('should overwrite existing key with same ID', async () => {
      await km.storeKey('same-id', 'first version', new Uint8Array([1]));
      await km.storeKey('same-id', 'second version', new Uint8Array([2, 3]));

      const stored = await km.getKey('same-id');
      expect(stored).not.toBeNull();
      expect(stored!.label).toBe('second version');

      const decrypted = km.decryptKey(stored!.encrypted);
      expect(Array.from(decrypted)).toEqual([2, 3]);
    });
  });

  describe('deleteKey', () => {
    it('should delete an existing key', async () => {
      await km.storeKey('del-1', 'to delete', new Uint8Array([1]));
      expect(km.deleteKey('del-1')).toBe(true);
      const result = await km.getKey('del-1');
      expect(result).toBeNull();
    });

    it('should return false for non-existent key', () => {
      expect(km.deleteKey('non-existent')).toBe(false);
    });
  });

  describe('listKeys', () => {
    it('should return metadata without encrypted data', async () => {
      await km.storeKey('list-1', 'key one', new Uint8Array([1]));
      await km.storeKey('list-2', 'key two', new Uint8Array([2]));

      const keys = km.listKeys();
      expect(keys).toHaveLength(2);
      // None should have 'encrypted' field
      keys.forEach((k) => {
        expect(k).not.toHaveProperty('encrypted');
      });
    });

    it('should return empty array when no keys stored', () => {
      const fresh = new KeyManager();
      expect(fresh.listKeys()).toHaveLength(0);
    });
  });
});

describe('Keys Server — Session Management', () => {
  let km: KeyManager;

  beforeEach(() => {
    km = new KeyManager({ encryptionKey: 'session-test-key', sessionTtlMs: 5000 });
  });

  it('should create a session with permissions', () => {
    const session = km.createSession('user-abc', ['sign', 'read']);
    expect(session.id).toMatch(/^[a-f0-9]+$/);
    expect(session.userId).toBe('user-abc');
    expect(session.permissions).toEqual(['sign', 'read']);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should validate a valid session', () => {
    const session = km.createSession('user-abc', ['read']);
    const validated = km.validateSession(session.id);
    expect(validated).not.toBeNull();
    expect(validated!.id).toBe(session.id);
  });

  it('should return null for non-existent session', () => {
    expect(km.validateSession('non-existent-session')).toBeNull();
  });

  it('should return null for expired session', async () => {
    const shortTtl = new KeyManager({ encryptionKey: 'test', sessionTtlMs: 5 });
    const session = shortTtl.createSession('user-xyz', ['read']);
    await new Promise((r) => setTimeout(r, 50));
    expect(shortTtl.validateSession(session.id)).toBeNull();
  });

  it('should revoke a session', () => {
    const session = km.createSession('user-abc', ['admin']);
    expect(km.revokeSession(session.id)).toBe(true);
    expect(km.validateSession(session.id)).toBeNull();
  });

  it('should return false when revoking non-existent session', () => {
    expect(km.revokeSession('ghost-session')).toBe(false);
  });

  it('should create multiple independent sessions', () => {
    const s1 = km.createSession('user-1', ['read']);
    const s2 = km.createSession('user-2', ['write']);
    expect(s1.id).not.toBe(s2.id);
    expect(km.validateSession(s1.id)!.userId).toBe('user-1');
    expect(km.validateSession(s2.id)!.userId).toBe('user-2');
  });
});

describe('Keys Server — Encryption Round-Trip', () => {
  it('should handle various key sizes', async () => {
    const km = new KeyManager({ encryptionKey: 'roundtrip-key' });

    const testCases: Uint8Array[] = [
      new Uint8Array([0]),
      new Uint8Array([255]),
      new Uint8Array([0, 1, 2, 3, 4, 5]),
      new Uint8Array(Array.from({ length: 64 }, (_, i) => i)), // 64 bytes
      new Uint8Array(Array.from({ length: 256 }, (_, i) => i % 256)), // 256 bytes
    ];

    for (let i = 0; i < testCases.length; i++) {
      const keyData = testCases[i];
      const id = `size-test-${i}`;
      await km.storeKey(id, `test ${i}`, keyData);
      const stored = await km.getKey(id);
      const decrypted = km.decryptKey(stored!.encrypted);
      expect(Array.from(decrypted)).toEqual(Array.from(keyData));
    }
  });

  it('should use different encrypted output for same plaintext with different IV', async () => {
    const km = new KeyManager({ encryptionKey: 'iv-test-key' });

    const data = new Uint8Array([42, 42, 42]);
    await km.storeKey('iv-1', 'first', data);
    await km.storeKey('iv-2', 'second', data);

    const s1 = await km.getKey('iv-1');
    const s2 = await km.getKey('iv-2');

    // Same key material but different IV → different ciphertext
    expect(s1!.encrypted).not.toBe(s2!.encrypted);

    // Both should decrypt to the same value
    expect(km.decryptKey(s1!.encrypted)).toEqual(km.decryptKey(s2!.encrypted));
  });
});
