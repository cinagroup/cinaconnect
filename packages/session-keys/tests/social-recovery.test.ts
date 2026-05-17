/**
 * Tests for social recovery with guardian mechanism.
 * Tests 3-of-5 guardian threshold and full recovery flow.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SocialRecoveryManager } from '../src/social-recovery.js';
import type { Guardian, RecoveryConfig, RecoveryRequest } from '../src/types.js';

describe('SocialRecoveryManager - Initialization', () => {
  let manager: SocialRecoveryManager;

  beforeEach(() => {
    manager = new SocialRecoveryManager();
  });

  it('should initialize with default 3-of-5 threshold', () => {
    const guardians = Array.from({ length: 5 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    const config = manager.initialize(guardians);
    expect(config.threshold).toBe(3);
    expect(config.guardianCount).toBe(5);
    expect(config.recoveryDelay).toBe(86_400);
  });

  it('should allow custom threshold', () => {
    const guardians = Array.from({ length: 5 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    const config = manager.initialize(guardians, 4);
    expect(config.threshold).toBe(4);
  });

  it('should allow custom recovery delay', () => {
    const guardians = Array.from({ length: 5 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    const config = manager.initialize(guardians, undefined, 172800);
    expect(config.recoveryDelay).toBe(172800);
  });

  it('should throw when threshold exceeds guardian count', () => {
    const guardians = Array.from({ length: 3 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    expect(() => manager.initialize(guardians, 5)).toThrow(
      'Threshold (5) exceeds guardian count (3)'
    );
  });

  it('should default threshold to ceil(N/2)+1 for non-standard counts', () => {
    const guardians = Array.from({ length: 7 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    const config = manager.initialize(guardians);
    // Math.max(3, Math.floor(7/2) + 1) = Math.max(3, 4) = 4
    expect(config.threshold).toBe(4);
  });

  it('should set all guardians as active', () => {
    const guardians = Array.from({ length: 5 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    const config = manager.initialize(guardians);
    config.guardians.forEach((g) => {
      expect(g.isActive).toBe(true);
    });
  });
});

describe('SocialRecoveryManager - Guardian Management', () => {
  let manager: SocialRecoveryManager;

  beforeEach(() => {
    manager = new SocialRecoveryManager();
    const guardians = Array.from({ length: 3 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    manager.initialize(guardians);
  });

  it('should return active guardians', () => {
    const active = manager.getActiveGuardians();
    expect(active).toHaveLength(3);
  });

  it('should add a new guardian', () => {
    const newGuardian = manager.addGuardian('0xnewguardian', 'New Guardian');
    expect(newGuardian.address).toBe('0xnewguardian');
    expect(newGuardian.isActive).toBe(true);
    expect(manager.getActiveGuardians()).toHaveLength(4);
  });

  it('should throw when adding duplicate guardian', () => {
    const guardians = manager.getActiveGuardians();
    expect(() => manager.addGuardian(guardians[0].address, 'Duplicate')).toThrow(
      'Guardian already exists'
    );
  });

  it('should throw when adding without initialization', () => {
    const freshManager = new SocialRecoveryManager();
    expect(() => freshManager.addGuardian('0xabc', 'Test')).toThrow(
      'Recovery not initialized'
    );
  });

  it('should remove a guardian', () => {
    const guardians = manager.getActiveGuardians();
    manager.removeGuardian(guardians[0].address);
    const active = manager.getActiveGuardians();
    expect(active).toHaveLength(2);
    expect(active.find((g) => g.address === guardians[0].address)).toBeUndefined();
  });

  it('should adjust threshold after guardian removal', () => {
    // Initialize with 5 guardians
    const g5 = new SocialRecoveryManager();
    const guardians = Array.from({ length: 5 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    g5.initialize(guardians, 3);
    expect(g5.getConfig()!.threshold).toBe(3);

    // Remove 3 guardians, leaving 2 active
    g5.removeGuardian(guardians[0].address);
    g5.removeGuardian(guardians[1].address);
    g5.removeGuardian(guardians[2].address);

    const config = g5.getConfig()!;
    // threshold should adjust: Math.max(1, Math.floor(2/2)+1) = Math.max(1, 2) = 2
    expect(config.threshold).toBe(2);
  });

  it('should throw when removing unknown guardian', () => {
    expect(() => manager.removeGuardian('0xunknown')).toThrow(
      'Guardian not found or already inactive'
    );
  });

  it('should return null config before initialization', () => {
    const freshManager = new SocialRecoveryManager();
    expect(freshManager.getConfig()).toBeNull();
  });
});

describe('SocialRecoveryManager - Recovery Flow', () => {
  let manager: SocialRecoveryManager;
  const account = '0xaccount0000000000000000000000000000';
  const newOwner = '0xnewowner000000000000000000000000000';

  beforeEach(() => {
    manager = new SocialRecoveryManager();
    const guardians = Array.from({ length: 5 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      name: `Guardian ${i + 1}`,
    }));
    manager.initialize(guardians, 3); // 3-of-5
  });

  it('should initiate a recovery request', () => {
    const request = manager.initiateRecovery(account, newOwner);
    expect(request.account).toBe(account);
    expect(request.newOwner).toBe(newOwner);
    expect(request.signatureCount).toBe(0);
    expect(request.executed).toBe(false);
    expect(request.cancelled).toBe(false);
    expect(request.id).toMatch(/^recovery-/);
  });

  it('should throw when initiating recovery without initialization', () => {
    const freshManager = new SocialRecoveryManager();
    expect(() => freshManager.initiateRecovery(account, newOwner)).toThrow(
      'Recovery not initialized'
    );
  });

  it('should reject duplicate pending recovery requests', () => {
    manager.initiateRecovery(account, newOwner);
    expect(() => manager.initiateRecovery(account, newOwner)).toThrow(
      'Recovery request already pending'
    );
  });

  it('should accept guardian signatures and track count', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const guardians = manager.getActiveGuardians();

    const result1 = manager.addGuardianSignature(
      request.id,
      guardians[0].address,
      '0xsignature1',
    );
    expect(result1.count).toBe(1);
    expect(result1.thresholdReached).toBe(false);

    const result2 = manager.addGuardianSignature(
      request.id,
      guardians[1].address,
      '0xsignature2',
    );
    expect(result2.count).toBe(2);
    expect(result2.thresholdReached).toBe(false);

    const result3 = manager.addGuardianSignature(
      request.id,
      guardians[2].address,
      '0xsignature3',
    );
    expect(result3.count).toBe(3);
    expect(result3.thresholdReached).toBe(true);
  });

  it('should reject signature from inactive guardian', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const guardians = manager.getActiveGuardians();
    manager.removeGuardian(guardians[0].address);

    expect(() =>
      manager.addGuardianSignature(request.id, guardians[0].address, '0xsig')
    ).toThrow('Not an active guardian');
  });

  it('should reject duplicate signatures from same guardian', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const guardians = manager.getActiveGuardians();

    manager.addGuardianSignature(request.id, guardians[0].address, '0xsig1');
    expect(() =>
      manager.addGuardianSignature(request.id, guardians[0].address, '0xsig2')
    ).toThrow('Guardian already signed');
  });

  it('should reject signature on executed recovery', () => {
    const request = manager.initiateRecovery(account, newOwner);
    request.executed = true;
    const guardians = manager.getActiveGuardians();

    expect(() =>
      manager.addGuardianSignature(request.id, guardians[0].address, '0xsig')
    ).toThrow('Recovery request already executed');
  });

  it('should reject signature on cancelled recovery', () => {
    const request = manager.initiateRecovery(account, newOwner);
    request.cancelled = true;
    const guardians = manager.getActiveGuardians();

    expect(() =>
      manager.addGuardianSignature(request.id, guardians[0].address, '0xsig')
    ).toThrow('Recovery request was cancelled');
  });

  it('should reject signature for nonexistent request', () => {
    const guardians = manager.getActiveGuardians();
    expect(() =>
      manager.addGuardianSignature('nonexistent', guardians[0].address, '0xsig')
    ).toThrow('Recovery request not found');
  });

  it('should not execute before time lock expires', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const guardians = manager.getActiveGuardians();

    // Add all required signatures
    for (let i = 0; i < 3; i++) {
      manager.addGuardianSignature(request.id, guardians[i].address, `0xsig${i}`);
    }

    // Immediately: canExecute should be false (time lock not expired)
    expect(manager.canExecute(request.id)).toBe(false);

    // Execute should fail
    const result = manager.executeRecovery(request.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Recovery conditions not met');
  });

  it('should execute after time lock with enough signatures', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const guardians = manager.getActiveGuardians();

    // Add all required signatures
    for (let i = 0; i < 3; i++) {
      manager.addGuardianSignature(request.id, guardians[i].address, `0xsig${i}`);
    }

    // Move executableAt to the past
    request.executableAt = Math.floor(Date.now() / 1000) - 1;

    expect(manager.canExecute(request.id)).toBe(true);

    const result = manager.executeRecovery(request.id);
    expect(result.success).toBe(true);
    expect(result.requestId).toBe(request.id);
    expect(request.executed).toBe(true);
  });

  it('should prevent double execution', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const guardians = manager.getActiveGuardians();
    for (let i = 0; i < 3; i++) {
      manager.addGuardianSignature(request.id, guardians[i].address, `0xsig${i}`);
    }
    request.executableAt = Math.floor(Date.now() / 1000) - 1;

    manager.executeRecovery(request.id);
    const result2 = manager.executeRecovery(request.id);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Already executed');
  });

  it('should cancel a pending recovery request', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const result = manager.cancelRecovery(request.id);
    expect(result).toBe(true);
    expect(request.cancelled).toBe(true);
  });

  it('should not cancel an already executed recovery', () => {
    const request = manager.initiateRecovery(account, newOwner);
    request.executed = true;
    expect(manager.cancelRecovery(request.id)).toBe(false);
  });

  it('should return false when cancelling nonexistent request', () => {
    expect(manager.cancelRecovery('nonexistent')).toBe(false);
  });

  it('should return pending requests', () => {
    manager.initiateRecovery(account, newOwner);
    const request2 = manager.initiateRecovery(account, '0xdifferent');
    request2.cancelled = true;

    const pending = manager.getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).not.toBe(request2.id);
  });

  it('should return requests for specific account', () => {
    manager.initiateRecovery(account, newOwner);
    manager.initiateRecovery('0xdifferent', '0xnewowner');

    const accountRequests = manager.getRequestsForAccount(account);
    expect(accountRequests).toHaveLength(1);
    expect(accountRequests[0].account).toBe(account);
  });

  it('should return null for nonexistent request', () => {
    expect(manager.getRequest('nonexistent')).toBeNull();
  });

  it('should hash recovery request deterministically', () => {
    const request = manager.initiateRecovery(account, newOwner);
    const hash1 = manager.hashRecoveryRequest(request);
    const hash2 = manager.hashRecoveryRequest(request);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-fA-F0-9]+$/);
  });
});
