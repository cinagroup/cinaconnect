import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasskeyManager, MemoryStorage, bytesToHex } from '../src/index.js';
import { generateChallenge, encodeChallenge, deriveAddress, generateKeypair, signData, verifySignature } from '../src/crypto.js';
import type { PasskeyConfig } from '../src/types.js';

const testConfig: PasskeyConfig = {
  rpName: 'Test App',
  rpId: 'localhost',
  challengeLength: 32,
  timeout: 30000,
};

describe('PasskeyManager', () => {
  let manager: PasskeyManager;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    manager = new PasskeyManager(testConfig, storage);
  });

  describe('register', () => {
    it('should register a new passkey in fallback mode', async () => {
      const result = await manager.register('user1', 'test', 'Test User');
      expect(result.success).toBe(true);
      expect(result.credentialId).toBeDefined();
      expect(result.publicKey).toBeDefined();
    });

    it('should store the registered passkey', async () => {
      await manager.register('user1', 'test', 'Test User');
      const list = await manager.list();
      expect(list).toHaveLength(1);
    });
  });

  describe('authenticate', () => {
    it('should fail authentication with unknown credential ID', async () => {
      const result = await manager.authenticate('unknown-credential');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should succeed with known credential in fallback mode', async () => {
      const regResult = await manager.register('user1', 'test', 'Test User');
      expect(regResult.success).toBe(true);
      const authResult = await manager.authenticate(regResult.credentialId);
      expect(authResult.success).toBe(true);
    });
  });

  describe('list', () => {
    it('should return empty list initially', async () => {
      const list = await manager.list();
      expect(list).toEqual([]);
    });

    it('should return all registered passkeys', async () => {
      await manager.register('user1', 'test1', 'User One');
      await manager.register('user2', 'test2', 'User Two');
      const list = await manager.list();
      expect(list).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should remove a passkey by ID', async () => {
      const result = await manager.register('user1', 'test', 'Test User');
      expect(result.success).toBe(true);
      const removed = await manager.remove(result.credentialId);
      expect(removed).toBe(true);
      const list = await manager.list();
      expect(list).toHaveLength(0);
    });

    it('should return false for non-existent passkey', async () => {
      const removed = await manager.remove('nonexistent');
      expect(removed).toBe(false);
    });
  });
});

describe('Crypto Operations', () => {
  describe('generateKeypair', () => {
    it('should generate a valid P-256 keypair', () => {
      const keypair = generateKeypair();
      expect(keypair.publicKey).toBeDefined();
      expect(keypair.privateKey).toBeDefined();
      expect(keypair.publicKey.length).toBe(128); // 64 bytes * 2 hex chars
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify data successfully', () => {
      const keypair = generateKeypair();
      const data = new TextEncoder().encode('Hello, World!');
      const signature = signData(keypair.privateKey!, data);
      const valid = verifySignature(keypair.publicKey, data, bytesToHex(signature));
      expect(valid).toBe(true);
    });

    it('should reject tampered data', () => {
      const keypair = generateKeypair();
      const data = new TextEncoder().encode('Hello, World!');
      const tampered = new TextEncoder().encode('Hello, tampered!');
      const signature = signData(keypair.privateKey!, data);
      const valid = verifySignature(keypair.publicKey, tampered, bytesToHex(signature));
      expect(valid).toBe(false);
    });
  });

  describe('deriveAddress', () => {
    it('should derive a deterministic address from public key', () => {
      const keypair = generateKeypair();
      const address = deriveAddress(keypair.publicKey);
      expect(address.length).toBe(40); // 20 bytes * 2 hex chars
    });

    it('should produce the same address for the same public key', () => {
      const keypair = generateKeypair();
      const addr1 = deriveAddress(keypair.publicKey);
      const addr2 = deriveAddress(keypair.publicKey);
      expect(addr1).toBe(addr2);
    });
  });
});
