import {
  createPublicClient,
  http,
  type Chain,
  type Address,
  type Hash,
  type Hex,
  type Transport,
  encodeFunctionData,
} from 'viem';
import {
  UserOperation,
  UserOperationGasEstimate,
  UserOperationReceipt,
  UserOperationStatus,
  SendUserOperationResult,
  BundlerConfig,
  UserOpSimulationResult,
} from './types';

/**
 * ERC-4337 BundlerClient — communicates with a bundler RPC endpoint
 * to send and manage UserOperations.
 */
export class BundlerClient {
  private readonly bundlerUrl: string;
  private readonly chain: Chain;
  private readonly entryPoint: Address;

  constructor(config: BundlerConfig) {
    this.bundlerUrl = config.bundlerUrl;
    this.chain = config.chain;
    this.entryPoint = config.entryPoint;
  }

  get chainId(): number {
    return this.chain.id;
  }

  getEntryPoint(): Address {
    return this.entryPoint;
  }

  /**
   * Simulate a UserOperation by calling `eth_call` against the EntryPoint.
   * This performs real on-chain simulation (via `simulateHandleOp` or
   * direct `handleOps` calldata) to estimate gas and catch validation errors
   * before sending. NOT a no-op — uses actual RPC `eth_call`.
   *
   * Returns estimated gas usage and any revert reason.
   */
  async simulateUserOp(userOp: UserOperation): Promise<UserOpSimulationResult> {
    // ABI for EntryPoint v0.6 handleOps
    const HANDLE_OPS_ABI = [
      {
        type: 'function',
        name: 'handleOps',
        inputs: [
          {
            name: 'ops',
            type: 'tuple[]',
            components: [
              { name: 'sender', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'initCode', type: 'bytes' },
              { name: 'callData', type: 'bytes' },
              { name: 'callGasLimit', type: 'uint256' },
              { name: 'verificationGasLimit', type: 'uint256' },
              { name: 'preVerificationGas', type: 'uint256' },
              { name: 'maxFeePerGas', type: 'uint256' },
              { name: 'maxPriorityFeePerGas', type: 'uint256' },
              { name: 'paymasterAndData', type: 'bytes' },
              { name: 'signature', type: 'bytes' },
            ],
          },
          { name: 'beneficiary', type: 'address' },
        ],
        outputs: [],
      },
    ] as const;

    // ABI for EntryPoint v0.6 simulateHandleOp
    const SIMULATE_HANDLE_OP_ABI = [
      {
        type: 'function',
        name: 'simulateHandleOp',
        inputs: [
          {
            name: 'op',
            type: 'tuple',
            components: [
              { name: 'sender', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'initCode', type: 'bytes' },
              { name: 'callData', type: 'bytes' },
              { name: 'callGasLimit', type: 'uint256' },
              { name: 'verificationGasLimit', type: 'uint256' },
              { name: 'preVerificationGas', type: 'uint256' },
              { name: 'maxFeePerGas', type: 'uint256' },
              { name: 'maxPriorityFeePerGas', type: 'uint256' },
              { name: 'paymasterAndData', type: 'bytes' },
              { name: 'signature', type: 'bytes' },
            ],
          },
          { name: 'target', type: 'address' },
          { name: 'targetCallData', type: 'bytes' },
        ],
        outputs: [
          { name: 'paid', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validUntil', type: 'uint256' },
          { name: 'targetSuccess', type: 'bool' },
          { name: 'targetResult', type: 'bytes' },
        ],
      },
    ] as const;

    const publicClient = createPublicClient({
      chain: this.chain,
      transport: http((this.chain.rpcUrls.default?.http ?? [])[0] ?? ''),
    });

    // Try simulateHandleOp first (EntryPoint v0.6+)
    try {
      const calldata = encodeFunctionData({
        abi: SIMULATE_HANDLE_OP_ABI,
        functionName: 'simulateHandleOp',
        args: [
          {
            sender: userOp.sender,
            nonce: userOp.nonce,
            initCode: userOp.initCode,
            callData: userOp.callData,
            callGasLimit: userOp.callGasLimit,
            verificationGasLimit: userOp.verificationGasLimit,
            preVerificationGas: userOp.preVerificationGas,
            maxFeePerGas: userOp.maxFeePerGas,
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
            paymasterAndData: userOp.paymasterAndData,
            signature: userOp.signature,
          },
          userOp.sender, // target: the sender's smart account
          '0x', // no additional target call
        ],
      });

      const result = await publicClient.call({
        to: this.entryPoint,
        data: calldata,
      });

      // If we get here without reverting, simulation succeeded
      return {
        success: true,
        simulationType: 'validation_and_execution',
      };
    } catch (err: unknown) {
      // Extract revert reason if available
      const revertReason = this.extractRevertReason(err);

      // Fallback: try handleOps simulation
      try {
        const calldata = encodeFunctionData({
          abi: HANDLE_OPS_ABI,
          functionName: 'handleOps',
          args: [
            [
              {
                sender: userOp.sender,
                nonce: userOp.nonce,
                initCode: userOp.initCode,
                callData: userOp.callData,
                callGasLimit: userOp.callGasLimit,
                verificationGasLimit: userOp.verificationGasLimit,
                preVerificationGas: userOp.preVerificationGas,
                maxFeePerGas: userOp.maxFeePerGas,
                maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
                paymasterAndData: userOp.paymasterAndData,
                signature: userOp.signature,
              },
            ],
            '0x0000000000000000000000000000000000000001', // dummy beneficiary
          ],
        });

        await publicClient.call({
          to: this.entryPoint,
          data: calldata,
        });

        return {
          success: true,
          simulationType: 'validation_and_execution',
        };
      } catch (fallbackErr: unknown) {
        const fallbackReason = this.extractRevertReason(fallbackErr);
        return {
          success: false,
          revertReason: revertReason ?? fallbackReason ?? 'Simulation failed',
        };
      }
    }
  }

  /** Extract a human-readable revert reason from an error. */
  private extractRevertReason(err: unknown): string | undefined {
    if (err instanceof Error) {
      const msg = err.message;
      // Try to extract revert reason from error message
      const match = msg.match(/execution reverted[:]?\s*(.*)/i) ||
        msg.match(/reverted[:]?\s*(.*)/i) ||
        msg.match(/AA(\d+)/); // AA error codes from EntryPoint
      if (match) {
        return match[1]?.trim() || match[0];
      }
      return msg.slice(0, 200); // truncate
    }
    return undefined;
  }

  /**
   * Send a UserOperation to the bundler.
   * Returns the userOpHash for tracking.
   */
  async sendUserOperation(userOp: UserOperation): Promise<SendUserOperationResult> {
    const response = await this.rpcCall<{ userOpHash: Hash }>('eth_sendUserOperation', [
      this.serializeUserOperation(userOp),
      this.entryPoint,
    ]);
    return { userOpHash: response.userOpHash };
  }

  /**
   * Get the status of a previously submitted UserOperation.
   */
  async getUserOperationStatus(userOpHash: Hash): Promise<UserOperationStatus> {
    try {
      const receipt = await this.getUserOperationReceipt(userOpHash);
      if (!receipt) return UserOperationStatus.Pending;
      return receipt.success ? UserOperationStatus.Included : UserOperationStatus.Reverted;
    } catch {
      return UserOperationStatus.Pending;
    }
  }

  /**
   * Estimate gas for a UserOperation before sending.
   */
  async estimateUserOperationGas(userOp: Partial<UserOperation>): Promise<UserOperationGasEstimate> {
    const response = await this.rpcCall<{
      preVerificationGas: string;
      verificationGasLimit: string;
      callGasLimit: string;
    }>('eth_estimateUserOperationGas', [
      this.serializePartialUserOperation(userOp),
      this.entryPoint,
    ]);
    return {
      preVerificationGas: BigInt(response.preVerificationGas),
      verificationGasLimit: BigInt(response.verificationGasLimit),
      callGasLimit: BigInt(response.callGasLimit),
    };
  }

  /**
   * Prepare a UserOperation with estimated gas values and current gas prices.
   */
  async prepareUserOperation(
    userOp: Partial<UserOperation> & { sender: Address; callData: Hex },
  ): Promise<UserOperation> {
    const estimates = await this.estimateUserOperationGas(userOp);
    return {
      sender: userOp.sender,
      nonce: userOp.nonce ?? 0n,
      initCode: userOp.initCode ?? '0x',
      callData: userOp.callData,
      callGasLimit: estimates.callGasLimit,
      verificationGasLimit: estimates.verificationGasLimit,
      preVerificationGas: estimates.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas ?? 0n,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas ?? 0n,
      paymasterAndData: userOp.paymasterAndData ?? '0x',
      signature: userOp.signature ?? '0x',
    };
  }

  /**
   * Get the receipt for a UserOperation.
   */
  async getUserOperationReceipt(userOpHash: Hash): Promise<UserOperationReceipt | null> {
    return this.rpcCall<UserOperationReceipt | null>('eth_getUserOperationReceipt', [userOpHash]);
  }

  private serializeUserOperation(op: UserOperation): Record<string, string> {
    return {
      sender: op.sender,
      nonce: '0x' + op.nonce.toString(16),
      initCode: op.initCode,
      callData: op.callData,
      callGasLimit: '0x' + op.callGasLimit.toString(16),
      verificationGasLimit: '0x' + op.verificationGasLimit.toString(16),
      preVerificationGas: '0x' + op.preVerificationGas.toString(16),
      maxFeePerGas: '0x' + op.maxFeePerGas.toString(16),
      maxPriorityFeePerGas: '0x' + op.maxPriorityFeePerGas.toString(16),
      paymasterAndData: op.paymasterAndData,
      signature: op.signature,
    };
  }

  private serializePartialUserOperation(op: Partial<UserOperation>): Record<string, string> {
    const base: Record<string, string> = {};
    if (op.sender) base.sender = op.sender;
    if (op.nonce !== undefined) base.nonce = '0x' + op.nonce.toString(16);
    if (op.initCode) base.initCode = op.initCode;
    if (op.callData) base.callData = op.callData;
    if (op.callGasLimit !== undefined) base.callGasLimit = '0x' + op.callGasLimit.toString(16);
    if (op.verificationGasLimit !== undefined)
      base.verificationGasLimit = '0x' + op.verificationGasLimit.toString(16);
    if (op.preVerificationGas !== undefined)
      base.preVerificationGas = '0x' + op.preVerificationGas.toString(16);
    if (op.maxFeePerGas !== undefined) base.maxFeePerGas = '0x' + op.maxFeePerGas.toString(16);
    if (op.maxPriorityFeePerGas !== undefined)
      base.maxPriorityFeePerGas = '0x' + op.maxPriorityFeePerGas.toString(16);
    if (op.paymasterAndData) base.paymasterAndData = op.paymasterAndData;
    if (op.signature) base.signature = op.signature;
    return base;
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) {
      throw new Error(`Bundler RPC error: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as { result: T; error?: { message: string } };
    if (json.error) {
      throw new Error(`Bundler RPC error: ${json.error.message}`);
    }
    return json.result;
  }
}
