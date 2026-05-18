/**
 * Social Recovery with Guardian Mechanism
 *
 * Implements a (M-of-N) multi-signature social recovery system for
 * smart accounts. If a user loses access to their account, trusted
 * guardians can collectively authorize an account recovery.
 *
 * Default configuration: 3-of-5 threshold (3 out of 5 guardians
 * must approve before a recovery can be executed).
 *
 * Recovery flow:
 * 1. User initiates a recovery request with a new owner address
 * 2. Guardians sign the recovery request off-chain
 * 3. Once threshold is reached, a time lock begins
 * 4. After the time lock expires, anyone can execute the recovery
 * 5. During the time lock, the original owner can cancel
 */

import type { Guardian, RecoveryConfig, RecoveryRequest, RecoveryResult } from "./types.js";
import type { Address, Hex, ByteArray } from "viem";
import { keccak256, stringToBytes, bytesToHex } from "viem";

// ============================================================
// SocialRecoveryManager
// ============================================================

export class SocialRecoveryManager {
  private recoveryConfig: RecoveryConfig | null = null;
  private pendingRequests: Map<string, RecoveryRequest> = new Map();

  /**
   * Initialize the recovery configuration.
   *
   * @param guardians Array of guardian addresses
   * @param threshold Required number of signatures (default: 3)
   * @param recoveryDelay Time lock delay in seconds (default: 86400 = 24h)
   * @returns The configured recovery config
   */
  initialize(
    guardians: Omit<Guardian, "isActive" | "addedAt">[],
    threshold?: number,
    recoveryDelay?: number,
  ): RecoveryConfig {
    const effectiveThreshold = threshold ?? Math.max(3, Math.floor(guardians.length / 2) + 1);
    const effectiveDelay = recoveryDelay ?? 86_400; // 24 hours

    if (effectiveThreshold > guardians.length) {
      throw new Error(
        `Threshold (${effectiveThreshold}) exceeds guardian count (${guardians.length})`,
      );
    }

    const now = Math.floor(Date.now() / 1000);

    this.recoveryConfig = {
      guardianCount: guardians.length,
      threshold: effectiveThreshold,
      recoveryDelay: effectiveDelay,
      guardians: guardians.map((g) => ({
        ...g,
        isActive: true,
        addedAt: now,
      })),
    };

    return this.recoveryConfig;
  }

  /**
   * Get the current recovery configuration.
   */
  getConfig(): RecoveryConfig | null {
    return this.recoveryConfig;
  }

  /**
   * Add a new guardian.
   *
   * @param address Guardian address
   * @param name Guardian name/label
   */
  addGuardian(address: Address, name: string): Guardian {
    if (!this.recoveryConfig) {
      throw new Error("Recovery not initialized. Call initialize() first.");
    }

    if (this.recoveryConfig.guardians.some((g) => g.address === address)) {
      throw new Error(`Guardian already exists: ${address}`);
    }

    const guardian: Guardian = {
      address,
      name,
      isActive: true,
      addedAt: Math.floor(Date.now() / 1000),
    };

    this.recoveryConfig.guardians.push(guardian);
    this.recoveryConfig.guardianCount = this.recoveryConfig.guardians.length;

    return guardian;
  }

  /**
   * Remove a guardian.
   *
   * @param address Guardian address to remove
   */
  removeGuardian(address: Address): void {
    if (!this.recoveryConfig) {
      throw new Error("Recovery not initialized");
    }

    const idx = this.recoveryConfig.guardians.findIndex(
      (g) => g.address === address && g.isActive,
    );

    if (idx === -1) {
      throw new Error(`Guardian not found or already inactive: ${address}`);
    }

    this.recoveryConfig.guardians[idx].isActive = false;
    const activeCount = this.recoveryConfig.guardians.filter((g) => g.isActive).length;

    // Adjust threshold if needed
    if (this.recoveryConfig.threshold > activeCount) {
      this.recoveryConfig.threshold = Math.max(1, Math.floor(activeCount / 2) + 1);
    }

    this.recoveryConfig.guardianCount = activeCount;
  }

  /**
   * Get active guardians.
   */
  getActiveGuardians(): Guardian[] {
    if (!this.recoveryConfig) return [];
    return this.recoveryConfig.guardians.filter((g) => g.isActive);
  }

  /**
   * Initiate a new recovery request.
   *
   * @param account The smart account being recovered
   * @param newOwner The new owner address to set
   * @returns The created recovery request
   */
  initiateRecovery(account: Address, newOwner: Address): RecoveryRequest {
    if (!this.recoveryConfig) {
      throw new Error("Recovery not initialized");
    }

    const now = Math.floor(Date.now() / 1000);
    const id = generateRequestId(account, newOwner, now);

    // Check for existing pending request
    if (this.pendingRequests.has(id)) {
      const existing = this.pendingRequests.get(id)!;
      if (!existing.executed && !existing.cancelled) {
        throw new Error(`Recovery request already pending: ${id}`);
      }
    }

    const request: RecoveryRequest = {
      id,
      account,
      newOwner,
      signatureCount: 0,
      signedGuardians: [],
      initiatedAt: now,
      executableAt: now + this.recoveryConfig.recoveryDelay,
      executed: false,
      cancelled: false,
    };

    this.pendingRequests.set(id, request);
    return request;
  }

  /**
   * Record a guardian's signature on a recovery request.
   *
   * @param requestId The recovery request ID
   * @param guardianAddress The guardian's address
   * @param signature The guardian's signature (for on-chain verification)
   * @returns Updated signature count
   */
  addGuardianSignature(
    requestId: string,
    guardianAddress: Address,
    signature: Hex,
  ): { count: number; thresholdReached: boolean } {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Recovery request not found: ${requestId}`);
    }

    if (request.executed) {
      throw new Error("Recovery request already executed");
    }

    if (request.cancelled) {
      throw new Error("Recovery request was cancelled");
    }

    // Verify guardian is active
    const guardian = this.recoveryConfig?.guardians.find(
      (g) => g.address === guardianAddress && g.isActive,
    );

    if (!guardian) {
      throw new Error(`Not an active guardian: ${guardianAddress}`);
    }

    // Prevent duplicate signatures
    if (request.signedGuardians.includes(guardianAddress)) {
      throw new Error(`Guardian already signed: ${guardianAddress}`);
    }

    request.signedGuardians.push(guardianAddress);
    request.signatureCount = request.signedGuardians.length;

    const thresholdReached = request.signatureCount >= (this.recoveryConfig?.threshold ?? 0);

    return {
      count: request.signatureCount,
      thresholdReached,
    };
  }

  /**
   * Check if a recovery request is ready to execute.
   *
   * @param requestId The recovery request ID
   * @returns Whether the request can be executed
   */
  canExecute(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    if (request.executed || request.cancelled) return false;
    if (request.signatureCount < (this.recoveryConfig?.threshold ?? 0)) return false;

    const now = Math.floor(Date.now() / 1000);
    return now >= request.executableAt;
  }

  /**
   * Execute a recovery request (after time lock expires).
   *
   * @param requestId The recovery request ID
   * @returns The recovery result
   */
  executeRecovery(requestId: string): RecoveryResult {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return { success: false, error: "Recovery request not found" };
    }

    if (request.executed) {
      return { success: false, error: "Already executed" };
    }

    if (request.cancelled) {
      return { success: false, error: "Request was cancelled" };
    }

    if (!this.canExecute(requestId)) {
      return { success: false, error: "Recovery conditions not met" };
    }

    // In production, this would call the smart account's recovery function
    request.executed = true;

    return {
      success: true,
      requestId,
    };
  }

  /**
   * Cancel a pending recovery request (by the original account owner).
   *
   * @param requestId The recovery request ID
   * @returns Whether the cancellation was successful
   */
  cancelRecovery(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    if (request.executed) return false;

    request.cancelled = true;
    return true;
  }

  /**
   * Get a recovery request by ID.
   */
  getRequest(requestId: string): RecoveryRequest | null {
    return this.pendingRequests.get(requestId) ?? null;
  }

  /**
   * Get all pending (non-executed, non-cancelled) recovery requests.
   */
  getPendingRequests(): RecoveryRequest[] {
    return Array.from(this.pendingRequests.values()).filter(
      (r) => !r.executed && !r.cancelled,
    );
  }

  /**
   * Get all recovery requests for a specific account.
   */
  getRequestsForAccount(account: Address): RecoveryRequest[] {
    return Array.from(this.pendingRequests.values()).filter(
      (r) => r.account === account,
    );
  }

  /**
   * Hash a recovery request for signing.
   *
   * @param request The recovery request
   * @returns The hash to sign
   */
  hashRecoveryRequest(request: RecoveryRequest): Hex {
    const data = `${request.account}:${request.newOwner}:${request.initiatedAt}:${this.recoveryConfig?.threshold}`;
    return keccak256(stringToBytes(data));
  }
}

// ============================================================
// Helpers
// ============================================================

function generateRequestId(
  account: Address,
  newOwner: Address,
  timestamp: number,
): string {
  const hash = keccak256(stringToBytes(`${account}:${newOwner}:${timestamp}`));
  return `recovery-${hash.slice(0, 18).slice(2)}`;
}
