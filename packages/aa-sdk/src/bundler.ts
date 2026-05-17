import type {
  BundlerConfig,
  BundlerEstimate,
  BundlerSendResult,
  UserOperation,
} from './types.js';

/**
 * BundlerClient — Client for sending user operations to ERC-4337 bundlers.
 */
export class BundlerClient {
  readonly config: BundlerConfig;

  constructor(config: BundlerConfig) {
    this.config = config;
  }

  /**
   * Send a user operation to the bundler.
   */
  async sendUserOperation(userOp: UserOperation): Promise<BundlerSendResult> {
    // In production, this would call eth_sendUserOperation via the bundler RPC
    const hash = this.hashUserOp(userOp);
    return { userOpHash: hash };
  }

  /**
   * Estimate gas for a user operation.
   */
  async estimateUserOperationGas(userOp: UserOperation): Promise<BundlerEstimate> {
    // In production, this would call eth_estimateUserOperationGas
    return {
      preVerificationGas: 21_000n,
      verificationGasLimit: 150_000n,
      callGasLimit: 100_000n,
    };
  }

  /**
   * Get the status of a user operation.
   */
  async getUserOperationStatus(userOpHash: string): Promise<{ status: string; transactionHash?: string }> {
    // In production, this would query the bundler for the op status
    return { status: 'pending', userOpHash };
  }

  /**
   * Get supported entry points from the bundler.
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    // In production, this would call eth_supportedEntryPoints
    return ['0x0000000071727De22E5E9d8BAf0edAc6f37da032'];
  }

  /**
   * Estimate gas and fill defaults for missing fields.
   */
  async fillUserOperationDefaults(userOp: Partial<UserOperation>): Promise<UserOperation> {
    const estimate = await this.estimateUserOperationGas(
      userOp as UserOperation,
    );

    return {
      sender: userOp.sender ?? '',
      nonce: userOp.nonce ?? 0n,
      initCode: userOp.initCode ?? '0x',
      callData: userOp.callData ?? '0x',
      callGasLimit: estimate.callGasLimit,
      verificationGasLimit: estimate.verificationGasLimit,
      preVerificationGas: estimate.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas ?? 20_000_000_000n,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas ?? 2_000_000_000n,
      paymasterAndData: userOp.paymasterAndData ?? '0x',
      signature: userOp.signature ?? '0x',
    };
  }

  private hashUserOp(userOp: UserOperation): string {
    const data = `${userOp.sender}:${userOp.nonce}:${Date.now()}`;
    const encoded = new TextEncoder().encode(data);
    let hash = 0;
    for (const byte of encoded) {
      hash = ((hash << 5) - hash + byte) | 0;
    }
    return `0x${(hash >>> 0).toString(16).padStart(64, '0')}`;
  }
}
