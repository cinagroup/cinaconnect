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
import type { Address, Hex } from "viem";
export declare class SocialRecoveryManager {
    private recoveryConfig;
    private pendingRequests;
    /**
     * Initialize the recovery configuration.
     *
     * @param guardians Array of guardian addresses
     * @param threshold Required number of signatures (default: 3)
     * @param recoveryDelay Time lock delay in seconds (default: 86400 = 24h)
     * @returns The configured recovery config
     */
    initialize(guardians: Omit<Guardian, "isActive" | "addedAt">[], threshold?: number, recoveryDelay?: number): RecoveryConfig;
    /**
     * Get the current recovery configuration.
     */
    getConfig(): RecoveryConfig | null;
    /**
     * Add a new guardian.
     *
     * @param address Guardian address
     * @param name Guardian name/label
     */
    addGuardian(address: Address, name: string): Guardian;
    /**
     * Remove a guardian.
     *
     * @param address Guardian address to remove
     */
    removeGuardian(address: Address): void;
    /**
     * Get active guardians.
     */
    getActiveGuardians(): Guardian[];
    /**
     * Initiate a new recovery request.
     *
     * @param account The smart account being recovered
     * @param newOwner The new owner address to set
     * @returns The created recovery request
     */
    initiateRecovery(account: Address, newOwner: Address): RecoveryRequest;
    /**
     * Record a guardian's signature on a recovery request.
     *
     * @param requestId The recovery request ID
     * @param guardianAddress The guardian's address
     * @param signature The guardian's signature (for on-chain verification)
     * @returns Updated signature count
     */
    addGuardianSignature(requestId: string, guardianAddress: Address, signature: Hex): {
        count: number;
        thresholdReached: boolean;
    };
    /**
     * Check if a recovery request is ready to execute.
     *
     * @param requestId The recovery request ID
     * @returns Whether the request can be executed
     */
    canExecute(requestId: string): boolean;
    /**
     * Execute a recovery request (after time lock expires).
     *
     * @param requestId The recovery request ID
     * @returns The recovery result
     */
    executeRecovery(requestId: string): RecoveryResult;
    /**
     * Cancel a pending recovery request (by the original account owner).
     *
     * @param requestId The recovery request ID
     * @returns Whether the cancellation was successful
     */
    cancelRecovery(requestId: string): boolean;
    /**
     * Get a recovery request by ID.
     */
    getRequest(requestId: string): RecoveryRequest | null;
    /**
     * Get all pending (non-executed, non-cancelled) recovery requests.
     */
    getPendingRequests(): RecoveryRequest[];
    /**
     * Get all recovery requests for a specific account.
     */
    getRequestsForAccount(account: Address): RecoveryRequest[];
    /**
     * Hash a recovery request for signing.
     *
     * @param request The recovery request
     * @returns The hash to sign
     */
    hashRecoveryRequest(request: RecoveryRequest): Hex;
}
//# sourceMappingURL=social-recovery.d.ts.map