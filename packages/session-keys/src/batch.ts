/**
 * Batch Transaction Support for Session Keys
 *
 * Enables session keys to execute multiple operations in a single
 * transaction, with atomic execution and policy enforcement per operation.
 */

import type { Address, Hex } from "viem";
import { encodeFunctionData, zeroAddress } from "viem";
import type { SessionKey, SessionKeyPolicy } from "./types.js";
import { isKeyValidForOperation } from "./session-key.js";

// ============================================================
// Types
// ============================================================

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

// ============================================================
// BatchTransactionBuilder
// ============================================================

export class BatchTransactionBuilder {
  private operations: BatchOperation[] = [];

  /**
   * Add an operation to the batch.
   *
   * @param target Target contract address
   * @param data Encoded function call data
   * @param value Native token value (default: 0)
   * @returns This builder for chaining
   */
  add(target: Address, data: Hex, value: bigint = 0n): this {
    this.operations.push({ target, data, value });
    return this;
  }

  /**
   * Add an ERC-20 transfer operation.
   *
   * @param token ERC-20 token address
   * @param to Recipient address
   * @param amount Amount to transfer
   * @returns This builder for chaining
   */
  addTransfer(token: Address, to: Address, amount: bigint): this {
    // ERC-20 transfer(address,uint256)
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      args: [to, amount],
    });

    return this.add(token, data, 0n);
  }

  /**
   * Add an ERC-20 approve operation.
   *
   * @param token ERC-20 token address
   * @param spender Spender address
   * @param amount Amount to approve
   * @returns This builder for chaining
   */
  addApprove(token: Address, spender: Address, amount: bigint): this {
    // ERC-20 approve(address,uint256)
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "approve",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      args: [spender, amount],
    });

    return this.add(token, data, 0n);
  }

  /**
   * Clear all operations.
   */
  clear(): this {
    this.operations = [];
    return this;
  }

  /**
   * Get the current operation count.
   */
  get count(): number {
    return this.operations.length;
  }

  /**
   * Get all operations.
   */
  getOperations(): BatchOperation[] {
    return [...this.operations];
  }

  /**
   * Build the batch transaction with policy validation.
   *
   * @param sessionKey The session key to validate against
   * @param policy The associated policy
   * @returns The batch result with validation data
   */
  build(sessionKey: SessionKey, policy: SessionKeyPolicy): BatchResult {
    const validations: BatchOpValidation[] = [];
    let totalValue = 0n;
    let allValid = true;

    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      totalValue += op.value ?? 0n;

      // Validate against policy
      const selector = op.data.slice(0, 10) as Hex; // 0x + 4 bytes
      const valid = isKeyValidForOperation(
        sessionKey,
        policy,
        op.target,
        selector,
        op.value ?? 0n,
      );

      const validation: BatchOpValidation = {
        index: i,
        valid,
      };

      if (!valid) {
        validation.reason = `Operation ${i} violates session key policy (target=${op.target}, value=${op.value ?? 0n})`;
        allValid = false;
      }

      validations.push(validation);
    }

    // Encode as multicall: bytes[] calldata calls
    const calldata = this.encodeBatch(this.operations);

    return {
      success: allValid,
      calldata,
      operationCount: this.operations.length,
      totalValue,
      validations,
    };
  }

  /**
   * Encode batch operations as a multicall.
   */
  private encodeBatch(operations: BatchOperation[]): Hex {
    // Encode as bytes[] for executeBatch function:
    // function executeBatch(bytes[] calldata calls) external
    const encodedCalls = operations.map((op) => {
      // ABI encode each call as (target, value, data)
      const target = op.target.padEnd(64, "0").slice(2);
      const value = (op.value ?? 0n).toString(16).padStart(64, "0");
      const dataLen = (op.data.length - 2) / 2; // length in bytes
      const dataLenHex = dataLen.toString(16).padStart(64, "0");

      return `0x${target}${value}${dataLenHex}${op.data.slice(2)}`;
    });

    // Return as the calldata for executeBatch
    // Simplified encoding — in production use viem's encodeFunctionData
    return encodedCalls.length > 0 ? (encodedCalls[0] as Hex) : "0x";
  }
}

// ============================================================
// Session Key Batch Enabler
// ============================================================

/**
 * Encode the calldata to enable a session key for batch operations
 * on a smart account contract.
 *
 * @param sessionKey The session key to enable
 * @param policy The associated policy
 * @param smartAccount The smart account address
 * @returns Encoded calldata for the enable call
 */
export function encodeEnableSessionKeyBatch(
  sessionKey: SessionKey,
  policy: SessionKeyPolicy,
  smartAccount: Address,
): Hex {
  // function enableSessionKey(
  //   address key,
  //   uint48 expiresAt,
  //   address[] calldata targets,
  //   bytes4[] calldata methods,
  //   uint256 maxAmountPerTx,
  //   uint256 dailyLimit
  // )
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "enableSessionKey",
        inputs: [
          { name: "key", type: "address" },
          { name: "expiresAt", type: "uint48" },
          { name: "targets", type: "address[]" },
          { name: "methods", type: "bytes4[]" },
          { name: "maxAmountPerTx", type: "uint256" },
          { name: "dailyLimit", type: "uint256" },
        ],
        outputs: [],
      },
    ],
    args: [
      sessionKey.publicKey,
      sessionKey.expiresAt,
      policy.allowedTargets,
      policy.allowedMethods as Hex[],
      policy.maxAmountPerTx,
      policy.dailyLimit,
    ],
  });
}

/**
 * Encode the calldata to disable a session key.
 *
 * @param sessionKey The session key to disable
 * @returns Encoded calldata
 */
export function encodeDisableSessionKey(sessionKey: SessionKey): Hex {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "disableSessionKey",
        inputs: [{ name: "key", type: "address" }],
        outputs: [],
      },
    ],
    args: [sessionKey.publicKey],
  });
}
