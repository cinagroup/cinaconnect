/**
 * Batch Transaction Support for Session Keys
 *
 * Enables session keys to execute multiple operations in a single
 * transaction, with atomic execution and policy enforcement per operation.
 */
import type { Address, Hex } from "viem";
import type { SessionKey, SessionKeyPolicy } from "./types.js";
/**
 * A single operation within a batch.
 */
export interface BatchOperation {
    /** Target contract address */
    target: Address;
    /** Encoded function call data */
    data: Hex;
    /** Native token value to send (in wei) */
    value?: bigint;
}
/**
 * Result of batch transaction execution.
 */
export interface BatchResult {
    /** Whether all operations succeeded */
    success: boolean;
    /** Encoded batch transaction calldata */
    calldata: Hex;
    /** Number of operations in the batch */
    operationCount: number;
    /** Total native value being transferred */
    totalValue: bigint;
    /** Per-operation validation results */
    validations: BatchOpValidation[];
}
/**
 * Per-operation validation result.
 */
export interface BatchOpValidation {
    /** Index of the operation */
    index: number;
    /** Whether the operation passed policy checks */
    valid: boolean;
    /** Reason for failure (if invalid) */
    reason?: string;
}
export declare class BatchTransactionBuilder {
    private operations;
    /**
     * Add an operation to the batch.
     *
     * @param target Target contract address
     * @param data Encoded function call data
     * @param value Native token value (default: 0)
     * @returns This builder for chaining
     */
    add(target: Address, data: Hex, value?: bigint): this;
    /**
     * Add an ERC-20 transfer operation.
     *
     * @param token ERC-20 token address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @returns This builder for chaining
     */
    addTransfer(token: Address, to: Address, amount: bigint): this;
    /**
     * Add an ERC-20 approve operation.
     *
     * @param token ERC-20 token address
     * @param spender Spender address
     * @param amount Amount to approve
     * @returns This builder for chaining
     */
    addApprove(token: Address, spender: Address, amount: bigint): this;
    /**
     * Clear all operations.
     */
    clear(): this;
    /**
     * Get the current operation count.
     */
    get count(): number;
    /**
     * Get all operations.
     */
    getOperations(): BatchOperation[];
    /**
     * Build the batch transaction with policy validation.
     *
     * @param sessionKey The session key to validate against
     * @param policy The associated policy
     * @returns The batch result with validation data
     */
    build(sessionKey: SessionKey, policy: SessionKeyPolicy): BatchResult;
    /**
     * Encode batch operations as a multicall.
     */
    private encodeBatch;
}
/**
 * Encode the calldata to enable a session key for batch operations
 * on a smart account contract.
 *
 * @param sessionKey The session key to enable
 * @param policy The associated policy
 * @param smartAccount The smart account address
 * @returns Encoded calldata for the enable call
 */
export declare function encodeEnableSessionKeyBatch(sessionKey: SessionKey, policy: SessionKeyPolicy, smartAccount: Address): Hex;
/**
 * Encode the calldata to disable a session key.
 *
 * @param sessionKey The session key to disable
 * @returns Encoded calldata
 */
export declare function encodeDisableSessionKey(sessionKey: SessionKey): Hex;
//# sourceMappingURL=batch.d.ts.map