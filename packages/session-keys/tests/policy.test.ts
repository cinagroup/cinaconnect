/**
 * Tests for session key policy creation, validation, and presets.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionKeyPolicyManager } from '../src/policy';
import type { SessionKeyPolicy } from '../src/types';

describe('SessionKeyPolicyManager', () => {
  let manager: SessionKeyPolicyManager;

  beforeEach(() => {
    manager = new SessionKeyPolicyManager();
  });

  it('should create a policy with auto-generated ID', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    const policy = manager.createPolicy({
      expiresAt: now,
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
    });
    expect(policy.id).toMatch(/^policy-/);
    expect(policy.expiresAt).toBe(now);
    expect(policy.maxAmountPerTx).toBe(100n);
    expect(policy.dailyLimit).toBe(1000n);
  });

  it('should set default values for optional fields', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    const policy = manager.createPolicy({ expiresAt: now });
    expect(policy.allowedTargets).toEqual([]);
    expect(policy.allowedMethods).toEqual([]);
    expect(policy.maxAmountPerTx).toBe(0n);
    expect(policy.dailyLimit).toBe(0n);
    expect(policy.allowedChains).toEqual([]);
    expect(policy.allowNativeTransfers).toBe(false);
    expect(policy.allowErc20Transfers).toBe(false);
    expect(policy.allowedTokens).toEqual([]);
  });

  it('should apply all provided policy parameters', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    const policy = manager.createPolicy({
      expiresAt: now,
      allowedTargets: ['0xtarget1', '0xtarget2'],
      allowedMethods: ['0xmethod1'],
      maxAmountPerTx: 500n,
      dailyLimit: 5000n,
      allowedChains: [1, 137],
      allowNativeTransfers: true,
      allowErc20Transfers: true,
      allowedTokens: ['0xtoken'],
      metadata: { type: 'custom' },
    });
    expect(policy.allowedTargets).toEqual(['0xtarget1', '0xtarget2']);
    expect(policy.allowedMethods).toEqual(['0xmethod1']);
    expect(policy.maxAmountPerTx).toBe(500n);
    expect(policy.dailyLimit).toBe(5000n);
    expect(policy.allowedChains).toEqual([1, 137]);
    expect(policy.allowNativeTransfers).toBe(true);
    expect(policy.allowErc20Transfers).toBe(true);
    expect(policy.allowedTokens).toEqual(['0xtoken']);
    expect(policy.metadata).toEqual({ type: 'custom' });
  });

  it('should store and retrieve policy by ID', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    const policy = manager.createPolicy({ expiresAt: now });
    const retrieved = manager.getPolicy(policy.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(policy.id);
  });

  it('should return null for unknown policy ID', () => {
    expect(manager.getPolicy('nonexistent')).toBeNull();
  });

  it('should return all policies', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    manager.createPolicy({ expiresAt: now });
    manager.createPolicy({ expiresAt: now });
    expect(manager.getAllPolicies()).toHaveLength(2);
  });

  it('should remove a policy', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    const policy = manager.createPolicy({ expiresAt: now });
    expect(manager.removePolicy(policy.id)).toBe(true);
    expect(manager.getPolicy(policy.id)).toBeNull();
  });

  it('should return false when removing nonexistent policy', () => {
    expect(manager.removePolicy('nonexistent')).toBe(false);
  });
});

describe('validatePolicy', () => {
  let manager: SessionKeyPolicyManager;

  beforeEach(() => {
    manager = new SessionKeyPolicyManager();
  });

  it('should return empty errors for valid policy', () => {
    const now = Math.floor(Date.now() / 1000) + 86400;
    const policy: SessionKeyPolicy = {
      id: 'valid',
      expiresAt: now,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 1000n,
      allowedChains: [1],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const errors = manager.validatePolicy(policy);
    expect(errors).toEqual([]);
  });

  it('should flag expired policy', () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    const policy: SessionKeyPolicy = {
      id: 'expired',
      expiresAt: past,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 0n,
      dailyLimit: 0n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const errors = manager.validatePolicy(policy);
    expect(errors).toContain('Policy has already expired');
  });

  it('should flag when maxAmountPerTx exceeds dailyLimit', () => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const policy: SessionKeyPolicy = {
      id: 'over-limit',
      expiresAt: future,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 200n,
      dailyLimit: 100n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const errors = manager.validatePolicy(policy);
    expect(errors).toContain('maxAmountPerTx exceeds dailyLimit');
  });

  it('should pass when maxAmountPerTx equals dailyLimit', () => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const policy: SessionKeyPolicy = {
      id: 'equal',
      expiresAt: future,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 100n,
      dailyLimit: 100n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const errors = manager.validatePolicy(policy);
    expect(errors).not.toContain('maxAmountPerTx exceeds dailyLimit');
  });

  it('should pass when maxAmountPerTx is less than dailyLimit', () => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const policy: SessionKeyPolicy = {
      id: 'under',
      expiresAt: future,
      allowedTargets: [],
      allowedMethods: [],
      maxAmountPerTx: 50n,
      dailyLimit: 100n,
      allowedChains: [],
      allowNativeTransfers: false,
      allowErc20Transfers: false,
      allowedTokens: [],
    };
    const errors = manager.validatePolicy(policy);
    expect(errors).toEqual([]);
  });
});

describe('Policy presets', () => {
  it('should create a DEX policy with correct defaults', () => {
    const params = SessionKeyPolicyManager.createDexPolicy(
      '0xDexRouter',
      100n,
      1000n,
      Math.floor(Date.now() / 1000) + 86400,
      1,
    );
    expect(params.allowedTargets).toEqual(['0xDexRouter']);
    expect(params.allowedMethods.length).toBeGreaterThan(0);
    expect(params.maxAmountPerTx).toBe(100n);
    expect(params.dailyLimit).toBe(1000n);
    expect(params.allowedChains).toEqual([1]);
    expect(params.allowNativeTransfers).toBe(true);
    expect(params.metadata).toEqual({ type: 'dex', router: '0xDexRouter' });
  });

  it('should create an NFT mint policy with correct defaults', () => {
    const params = SessionKeyPolicyManager.createNftMintPolicy(
      '0xNFTContract',
      50n,
      10,
      Math.floor(Date.now() / 1000) + 86400,
      1,
    );
    expect(params.allowedTargets).toEqual(['0xNFTContract']);
    expect(params.maxAmountPerTx).toBe(50n);
    expect(params.dailyLimit).toBe(500n); // 50 * 10
    expect(params.metadata).toEqual({ type: 'nft-mint', contract: '0xNFTContract' });
  });

  it('should create an open policy with no restrictions', () => {
    const params = SessionKeyPolicyManager.createOpenPolicy(
      Math.floor(Date.now() / 1000) + 86400,
      1000n,
      1,
    );
    expect(params.allowedTargets).toEqual([]);
    expect(params.allowedMethods).toEqual([]);
    expect(params.maxAmountPerTx).toBe(1000n);
    expect(params.dailyLimit).toBe(1000n);
    expect(params.allowNativeTransfers).toBe(true);
    expect(params.allowErc20Transfers).toBe(true);
    expect(params.metadata).toEqual({ type: 'open' });
  });
});
