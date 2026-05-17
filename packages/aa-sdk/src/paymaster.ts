import type {
  PaymasterConfig,
  PaymasterRequest,
  PaymasterResponse,
  UserOperation,
} from './types.js';

/**
 * PaymasterClient — Client for interacting with ERC-4337 paymaster services.
 */
export class PaymasterClient {
  readonly config: PaymasterConfig;

  constructor(config: PaymasterConfig) {
    this.config = config;
  }

  /**
   * Sponsor a user operation by returning paymasterAndData.
   */
  async sponsor(request: PaymasterRequest): Promise<PaymasterResponse> {
    // In production, this would call the paymaster API
    const paymasterAndData = this.generatePaymasterData(request);
    return {
      paymasterAndData,
      preVerificationGas: 50_000n,
      verificationGasLimit: 100_000n,
      callGasLimit: 200_000n,
    };
  }

  /**
   * Get paymaster gas limits for a user operation.
   */
  async getGasLimits(
    _userOp: UserOperation,
  ): Promise<{ verificationGasLimit: bigint; callGasLimit: bigint; preVerificationGas: bigint }> {
    return {
      verificationGasLimit: 100_000n,
      callGasLimit: 200_000n,
      preVerificationGas: 50_000n,
    };
  }

  /**
   * Get the paymaster balance.
   */
  async getBalance(): Promise<bigint> {
    // In production, this would query the paymaster contract
    return 1_000_000_000_000_000_000n; // 1 ETH
  }

  /**
   * Verify if the paymaster can sponsor a given operation.
   */
  canSponsor(_request: PaymasterRequest): boolean {
    return this.config.sponsorType !== undefined;
  }

  private generatePaymasterData(request: PaymasterRequest): string {
    // Simplified paymaster data encoding
    const paymaster = '0x0000000000000000000000000000000000000001';
    const validity = '0x' + Date.now().toString(16).padStart(16, '0');
    return paymaster + validity;
  }
}
