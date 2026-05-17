/**
 * Tests for session key generation and management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionKeyManager, encodeEnableSessionKey, encodeDisableSessionKey, isKeyValidForOperation } from '../src/session-key.js';
import type { SessionKey, SessionKeyPolicy } from '../src/types.js';

describe('SessionKeyManager', () => {
  let manager: SessionKeyManager;

  beforeEach(() => {
    manager = new SessionKeyManager();
  });

  it('should generate a new session key with valid address', () => {
    const key = manager.generateKey();
    expect(key.publicKey).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(key.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('should set default 24h expiration when no policy provided', () => {
    const key = manager.generateKey();
    const now = Math.floor(Date.now() / 1000);
    expect(key.expiresAt).toBeGreaterThan(now);
    expect(key.expiresAt).toBeLessThanOrEqual(now + 86_400);
  });

  it('should use policy expiration when provided', () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const policy: SessionKeyPolicy = {
      id: 'policy-1',
      expiresAt,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const key = manager.generateKey(policy);
    expect(key.expiresAt).toBe(expiresAt);
    expect(key.policyId).toBe('policy-1');
  });

  it('should associate a label with the key', () => {
    const key = manager.generateKey(undefined, 'My Session Key');
    expect(key.label).toBe('My Session Key');
  });

  it('should store the key and return it via getKey', () => {
    const key = manager.generateKey();
    const retrieved = manager.getKey(key.publicKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.publicKey).toBe(key.publicKey);
  });

  it('should return null for unknown key', () => {
    const retrieved = manager.getKey('0x0000000000000000000000000000000000000000');
    expect(retrieved).toBeNull();
  });

  it('should import a key from private key', () => {
    // First generate a key to get a valid private key
    const generated = manager.generateKey();
    manager.revokeKey(generated.publicKey); // Remove the auto-added one

    const imported = manager.importKey(generated.privateKey);
    expect(imported.publicKey).toBe(generated.publicKey);
  });

  it('should return all keys including expired', () => {
    manager.generateKey(undefined, 'key1');
    manager.generateKey(undefined, 'key2');
    expect(manager.getAllKeys()).toHaveLength(2);
  });

  it('should filter out expired keys in getActiveKeys', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
    const expiredPolicy: SessionKeyPolicy = {
      id: 'expired',
      expiresAt: pastTimestamp,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };

    manager.generateKey(undefined, 'active');
    manager.generateKey(expiredPolicy, 'expired');

    const active = manager.getActiveKeys();
    expect(active).toHaveLength(1);
    expect(active[0].label).toBe('active');
  });

  it('should revoke a key', () => {
    const key = manager.generateKey();
    expect(manager.revokeKey(key.publicKey)).toBe(true);
    expect(manager.getKey(key.publicKey)).toBeNull();
  });

  it('should return false when revoking unknown key', () => {
    expect(manager.revokeKey('0x0000000000000000000000000000000000000000')).toBe(false);
  });

  it('should revoke all expired keys', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
    const expiredPolicy: SessionKeyPolicy = {
      id: 'exp1',
      expiresAt: pastTimestamp,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };

    manager.generateKey(undefined, 'active');
    manager.generateKey(expiredPolicy, 'exp1');
    manager.generateKey(expiredPolicy, 'exp2');

    const count = manager.revokeExpiredKeys();
    expect(count).toBe(2);
    expect(manager.getAllKeys()).toHaveLength(1);
  });

  it('should sign a message with a session key', async () => {
    const key = manager.generateKey();
    const signature = await manager.signWithKey(key.publicKey, 'Hello');
    expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(signature.length).toBeGreaterThan(66); // Ethereum signatures are 65 bytes + 0x prefix
  });

  it('should throw when signing with unknown key', async () => {
    await expect(
      manager.signWithKey('0x0000000000000000000000000000000000000000', 'msg')
    ).rejects.toThrow('Session key not found');
  });

  it('should throw when signing with expired key', async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
    const expiredPolicy: SessionKeyPolicy = {
      id: 'exp',
      expiresAt: pastTimestamp,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const key = manager.generateKey(expiredPolicy);
    await expect(manager.signWithKey(key.publicKey, 'msg')).rejects.toThrow('Session key expired');
  });

  it('should return policy associated with a key', () => {
    const policy: SessionKeyPolicy = {
      id: 'pol-1',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      allowedTargets: ['0xabc'],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [1],
      allowNativeTransfers: true,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const key = manager.generateKey(policy);
    const retrievedPolicy = manager.getPolicy(key.publicKey);
    expect(retrievedPolicy).not.toBeNull();
    expect(retrievedPolicy!.id).toBe('pol-1');
  });

  it('should return null when key has no policy', () => {
    const key = manager.generateKey();
    expect(manager.getPolicy(key.publicKey)).toBeNull();
  });

  it('should register standalone policies', () => {
    const policy: SessionKeyPolicy = {
      id: 'standalone',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    manager.registerPolicy(policy);
    expect(manager.policyCount).toBe(1);
    expect(manager.getPolicy('standalone')).not.toBeNull();
  });

  it('should return all policies', () => {
    const policy1: SessionKeyPolicy = {
      id: 'p1',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const policy2: SessionKeyPolicy = {
      id: 'p2',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    manager.registerPolicy(policy1);
    manager.registerPolicy(policy2);
    expect(manager.getAllPolicies()).toHaveLength(2);
  });

  it('should track key and policy counts', () => {
    const policy: SessionKeyPolicy = {
      id: 'p1',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(manager.keyCount).toBe(0);
    expect(manager.policyCount).toBe(0);

    manager.generateKey(policy);
    expect(manager.keyCount).toBe(1);
    expect(manager.policyCount).toBe(1);
  });
});

describe('encodeEnableSessionKey', () => {
  it('should return hex calldata for enabling a session key', () => {
    const manager = new SessionKeyManager();
    const key = manager.generateKey();
    const policy: SessionKeyPolicy = {
      id: 'p1',
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const calldata = encodeEnableSessionKey(key, policy);
    expect(calldata).toMatch(/^0x/);
    expect(calldata.length).toBeGreaterThan(2);
  });
});

describe('encodeDisableSessionKey', () => {
  it('should return hex calldata for disabling a session key', () => {
    const manager = new SessionKeyManager();
    const key = manager.generateKey();
    const calldata = encodeDisableSessionKey(key);
    expect(calldata).toMatch(/^0x/);
    expect(calldata.length).toBeGreaterThan(2);
  });
});

describe('isKeyValidForOperation', () => {
  const now = Math.floor(Date.now() / 1000);

  it('should return false for expired key', () => {
    const key: SessionKey = {
      publicKey: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0x' + 'aa'.repeat(32),
      expiresAt: now - 100,
      createdAt: now - 86400,
    };
    const policy: SessionKeyPolicy = {
      id: 'p',
      expiresAt: now + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(isKeyValidForOperation(key, policy, '0xtarget', '0xmethod', 1n)).toBe(false);
  });

  it('should return false when target not whitelisted', () => {
    const key: SessionKey = {
      publicKey: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0x' + 'aa'.repeat(32),
      expiresAt: now + 86400,
      createdAt: now,
    };
    const policy: SessionKeyPolicy = {
      id: 'p',
      expiresAt: now + 86400,
      allowedTargets: ['0xallowed'],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(isKeyValidForOperation(key, policy, '0xforbidden', '0xmethod', 1n)).toBe(false);
  });

  it('should return false when method not whitelisted', () => {
    const key: SessionKey = {
      publicKey: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0x' + 'aa'.repeat(32),
      expiresAt: now + 86400,
      createdAt: now,
    };
    const policy: SessionKeyPolicy = {
      id: 'p',
      expiresAt: now + 86400,
      allowedTargets: [],
      allowedMethods: ['0xallowed'],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(isKeyValidForOperation(key, policy, '0xtarget', '0xforbidden', 1n)).toBe(false);
  });

  it('should return false when amount exceeds maxAmountPerTx', () => {
    const key: SessionKey = {
      publicKey: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0x' + 'aa'.repeat(32),
      expiresAt: now + 86400,
      createdAt: now,
    };
    const policy: SessionKeyPolicy = {
      id: 'p',
      expiresAt: now + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(isKeyValidForOperation(key, policy, '0xtarget', '0xmethod', 200n)).toBe(false);
  });

  it('should return true when all conditions are met', () => {
    const key: SessionKey = {
      publicKey: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0x' + 'aa'.repeat(32),
      expiresAt: now + 86400,
      createdAt: now,
    };
    const policy: SessionKeyPolicy = {
      id: 'p',
      expiresAt: now + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(isKeyValidForOperation(key, policy, '0xtarget', '0xmethod', 50n)).toBe(true);
  });

  it('should allow any target when allowedTargets is empty', () => {
    const key: SessionKey = {
      publicKey: '0x1234567890abcdef1234567890abcdef12345678',
      privateKey: '0x' + 'aa'.repeat(32),
      expiresAt: now + 86400,
      createdAt: now,
    };
    const policy: SessionKeyPolicy = {
      id: 'p',
      expiresAt: now + 86400,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    expect(isKeyValidForOperation(key, policy, '0xany', '0xmethod', 10n)).toBe(true);
  });
});
