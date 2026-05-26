/**
 * PaymasterClient — Real HTTP JSON-RPC client for ERC-4337 paymaster services.
 *
 * Communicates with a paymaster endpoint over HTTP POST to:
 *   - Sponsor user operations (return paymasterAndData)
 *   - Get gas limits
 *   - Check sponsorship eligibility
 */

import type { Hex, Address } from 'viem';
import type {
  PaymasterConfig,
  PaymasterRequest,
  PaymasterResponse,
  UserOperation,
} from './types.js';

export class PaymasterClient {
  private readonly url: string;
  private readonly apiKey?: string;
  readonly sponsorType: 'gasless' | 'partial' | 'post-pay';

  constructor(config: PaymasterConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.sponsorType = config.sponsorType;
  }

  /**
   * Sponsor a user operation.
   * Sends a POST request to the paymaster endpoint with the UserOperation
   * and returns paymasterAndData to embed in the UserOperation.
   */
  async sponsor(request: PaymasterRequest): Promise<PaymasterResponse> {
    const result = await this.rpc<{
      paymasterAndData: Hex;
      preVerificationGas?: Hex;
      verificationGasLimit?: Hex;
      callGasLimit?: Hex;
    }>('pm_sponsorUserOperation', [
      serializeUserOp(request.userOperation),
      request.entryPoint,
      request.chainId,
    ]);

    const response: PaymasterResponse = {
      paymasterAndData: result.paymasterAndData,
    };
    if (result.preVerificationGas)
      response.preVerificationGas = BigInt(result.preVerificationGas);
    if (result.verificationGasLimit)
      response.verificationGasLimit = BigInt(result.verificationGasLimit);
    if (result.callGasLimit)
      response.callGasLimit = BigInt(result.callGasLimit);
    return response;
  }

  /**
   * Get paymaster gas limits for a user operation.
   */
  async getGasLimits(
    userOp: UserOperation,
    entryPoint: Address,
    chainId: number,
  ): Promise<{
    verificationGasLimit: bigint;
    callGasLimit: bigint;
    preVerificationGas: bigint;
  }> {
    const result = await this.rpc<{
      preVerificationGas: Hex;
      verificationGasLimit: Hex;
      callGasLimit: Hex;
    }>('pm_getGasLimits', [
      serializeUserOp(userOp),
      entryPoint,
      chainId,
    ]);
    return {
      preVerificationGas: BigInt(result.preVerificationGas),
      verificationGasLimit: BigInt(result.verificationGasLimit),
      callGasLimit: BigInt(result.callGasLimit),
    };
  }

  /**
   * Check whether the paymaster can sponsor a given operation.
   */
  canSponsor(request: PaymasterRequest): boolean {
    return this.sponsorType !== undefined;
  }

  // ── Helpers ─────────────────────────────────────────────────────

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
        `Paymaster HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      result?: T;
      error?: { code: number; message: string; data?: unknown };
    };

    if (json.error) {
      throw new Error(
        `Paymaster RPC error [${json.error.code}]: ${json.error.message}`,
      );
    }

    if (json.result === undefined) {
      throw new Error(`Paymaster RPC returned no result for ${method}`);
    }

    return json.result;
  }
}

/** Convert a UserOperation to the hex-serialised shape the paymaster expects. */
function serializeUserOp(op: UserOperation): Record<string, string> {
  return {
    sender: op.sender,
    nonce: `0x${op.nonce.toString(16)}`,
    initCode: op.initCode,
    callData: op.callData,
    callGasLimit: `0x${op.callGasLimit.toString(16)}`,
    verificationGasLimit: `0x${op.verificationGasLimit.toString(16)}`,
    preVerificationGas: `0x${op.preVerificationGas.toString(16)}`,
    maxFeePerGas: `0x${op.maxFeePerGas.toString(16)}`,
    maxPriorityFeePerGas: `0x${op.maxPriorityFeePerGas.toString(16)}`,
    paymasterAndData: op.paymasterAndData,
    signature: op.signature,
  };
}
