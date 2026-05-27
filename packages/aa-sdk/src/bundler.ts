/**
 * BundlerClient — Real HTTP JSON-RPC client for ERC-4337 bundlers.
 *
 * Communicates with the cinacoin bundler (or any ERC-4337 compliant
 * bundler) over HTTP POST using the standard RPC methods:
 *   - eth_sendUserOperation
 *   - eth_estimateUserOperationGas
 *   - eth_getUserOperationByHash
 *   - eth_getUserOperationReceipt
 *   - eth_supportedEntryPoints
 */

import type { Hex, Hash, Address } from 'viem';
import type {
  UserOperation,
  UserOperationGasEstimate,
  BundlerConfig,
  BundlerSendResult,
  UserOperationReceipt,
} from './types.js';

// ── Internal serialised shape for wire format ───────────────────────

interface SerOp {
  sender: Address;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
  signature: Hex;
}

// ── Client ──────────────────────────────────────────────────────────

export class BundlerClient {
  private readonly url: string;
  private readonly apiKey?: string;

  constructor(config: BundlerConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Send a UserOperation to the bundler.
   * Calls `eth_sendUserOperation([userOp, entryPoint])`.
   */
  async sendUserOperation(
    userOp: UserOperation,
    entryPoint: Address,
  ): Promise<BundlerSendResult> {
    const result = await this.rpc<string>('eth_sendUserOperation', [
      this.serializeUserOperation(userOp),
      entryPoint,
    ]);
    return { userOpHash: result as Hash };
  }

  /**
   * Estimate gas for a UserOperation.
   * Calls `eth_estimateUserOperationGas([userOp, entryPoint])`.
   */
  async estimateUserOperationGas(
    userOp: Partial<UserOperation>,
    entryPoint: Address,
  ): Promise<UserOperationGasEstimate> {
    const result = await this.rpc<{
      preVerificationGas: Hex;
      verificationGasLimit: Hex;
      callGasLimit: Hex;
    }>('eth_estimateUserOperationGas', [
      this.serializePartialUserOperation(userOp),
      entryPoint,
    ]);
    return {
      preVerificationGas: BigInt(result.preVerificationGas),
      verificationGasLimit: BigInt(result.verificationGasLimit),
      callGasLimit: BigInt(result.callGasLimit),
    };
  }

  /**
   * Get the status / receipt of a previously submitted UserOperation.
   * Calls `eth_getUserOperationReceipt([userOpHash])`.
   * Returns null if the bundler has no record yet.
   */
  async getUserOperationReceipt(
    userOpHash: Hash,
  ): Promise<UserOperationReceipt | null> {
    return this.rpc<UserOperationReceipt | null>(
      'eth_getUserOperationReceipt',
      [userOpHash],
    );
  }

  /**
   * Poll for receipt with retries. Resolves when the bundler returns
   * a non-null receipt or throws after `maxRetries` attempts.
   */
  async waitForReceipt(
    userOpHash: Hash,
    opts?: { intervalMs?: number; maxRetries?: number },
  ): Promise<UserOperationReceipt> {
    const interval = opts?.intervalMs ?? 2_000;
    const maxRetries = opts?.maxRetries ?? 30;

    for (let i = 0; i < maxRetries; i++) {
      const receipt = await this.getUserOperationReceipt(userOpHash);
      if (receipt) return receipt;
      await this.sleep(interval);
    }
    throw new Error(
      `waitForReceipt timed out after ${maxRetries} attempts for ${userOpHash}`,
    );
  }

  /**
   * Retrieve the full UserOperation from the bundler by hash.
   */
  async getUserOperationByHash(
    userOpHash: Hash,
  ): Promise<UserOperation | null> {
    return this.rpc<UserOperation | null>('eth_getUserOperationByHash', [
      userOpHash,
    ]);
  }

  /**
   * Return the entry points supported by this bundler.
   */
  async getSupportedEntryPoints(): Promise<Address[]> {
    return this.rpc<Address[]>('eth_supportedEntryPoints', []);
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private serializeUserOperation(op: UserOperation): SerOp {
    return {
      sender: op.sender,
      nonce: toHex(op.nonce),
      initCode: op.initCode,
      callData: op.callData,
      callGasLimit: toHex(op.callGasLimit),
      verificationGasLimit: toHex(op.verificationGasLimit),
      preVerificationGas: toHex(op.preVerificationGas),
      maxFeePerGas: toHex(op.maxFeePerGas),
      maxPriorityFeePerGas: toHex(op.maxPriorityFeePerGas),
      paymasterAndData: op.paymasterAndData,
      signature: op.signature,
    };
  }

  private serializePartialUserOperation(op: Partial<UserOperation>): Partial<SerOp> {
    const out: Partial<SerOp> = {};
    if (op.sender) out.sender = op.sender;
    if (op.nonce !== undefined) out.nonce = toHex(op.nonce);
    if (op.initCode) out.initCode = op.initCode;
    if (op.callData) out.callData = op.callData;
    if (op.callGasLimit !== undefined) out.callGasLimit = toHex(op.callGasLimit);
    if (op.verificationGasLimit !== undefined)
      out.verificationGasLimit = toHex(op.verificationGasLimit);
    if (op.preVerificationGas !== undefined)
      out.preVerificationGas = toHex(op.preVerificationGas);
    if (op.maxFeePerGas !== undefined) out.maxFeePerGas = toHex(op.maxFeePerGas);
    if (op.maxPriorityFeePerGas !== undefined)
      out.maxPriorityFeePerGas = toHex(op.maxPriorityFeePerGas);
    if (op.paymasterAndData) out.paymasterAndData = op.paymasterAndData;
    if (op.signature) out.signature = op.signature;
    return out;
  }

  /**
   * Generic JSON-RPC POST call.
   */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Bundler HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      result?: T;
      error?: { code: number; message: string; data?: unknown };
    };

    if (json.error) {
      throw new Error(
        `Bundler RPC error [${json.error.code}]: ${json.error.message}`,
      );
    }

    if (json.result === undefined) {
      throw new Error(`Bundler RPC returned no result for ${method}`);
    }

    return json.result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// ── Utilities ───────────────────────────────────────────────────────

/** Convert a bigint to a 0x‑prefixed hex string. */
function toHex(n: bigint): Hex {
  return `0x${n.toString(16)}`;
}
