import type { Address, Hex } from 'viem';
import type {
  PaymasterData,
  PaymasterVerification,
  SponsorRequest,
  SponsorResult,
  PaymasterConfig,
} from './types';

/**
 * PaymasterClient — interacts with a paymaster service to sponsor
 * gas costs for ERC-4337 UserOperations.
 */
export class PaymasterClient {
  private readonly paymasterUrl: string;
  private readonly apiKey?: string;

  constructor(config: PaymasterConfig) {
    this.paymasterUrl = config.paymasterUrl;
    this.apiKey = config.apiKey;
  }

  /**
   * Get paymaster data for inclusion in a UserOperation.
   */
  async getPaymasterData(params: {
    sender: Address;
    callData: Hex;
    chainId: number;
  }): Promise<PaymasterData> {
    const response = await this.rpcCall<{
      paymaster: Address;
      paymasterData: Hex;
      paymasterVerificationGasLimit: string;
      paymasterPostOpGasLimit: string;
    }>('pm_getPaymasterData', [params, { chainId: params.chainId }]);
    return {
      paymaster: response.paymaster,
      paymasterData: response.paymasterData,
      paymasterVerificationGasLimit: BigInt(response.paymasterVerificationGasLimit),
      paymasterPostOpGasLimit: BigInt(response.paymasterPostOpGasLimit),
    };
  }

  /**
   * Verify that a paymaster address is valid and trusted.
   */
  async verifyPaymaster(paymaster: Address, chainId: number): Promise<PaymasterVerification> {
    const response = await this.rpcCall<{
      isValid: boolean;
      sponsor: Address;
      gasLimit: string;
    }>('pm_verifyPaymaster', [paymaster, { chainId }]);
    return {
      isValid: response.isValid,
      sponsor: response.sponsor,
      gasLimit: BigInt(response.gasLimit),
    };
  }

  /**
   * Sponsor a transaction — the paymaster agrees to pay for gas.
   */
  async sponsorTransaction(request: SponsorRequest): Promise<SponsorResult> {
    const response = await this.rpcCall<{
      paymaster: Address;
      paymasterData: Hex;
      sponsorshipId: string;
    }>('pm_sponsorTransaction', [request]);
    return {
      paymaster: response.paymaster,
      paymasterData: response.paymasterData,
      sponsorshipId: response.sponsorshipId,
    };
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.paymasterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) {
      throw new Error(`Paymaster RPC error: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as { result: T; error?: { message: string } };
    if (json.error) {
      throw new Error(`Paymaster RPC error: ${json.error.message}`);
    }
    return json.result;
  }
}
