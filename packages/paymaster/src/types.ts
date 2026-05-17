import type { Address, Hex } from 'viem';

/** Paymaster data returned for inclusion in a UserOperation */
export interface PaymasterData {
  paymaster: Address;
  paymasterData: Hex;
  paymasterVerificationGasLimit: bigint;
  paymasterPostOpGasLimit: bigint;
}

/** Paymaster verification result */
export interface PaymasterVerification {
  isValid: boolean;
  sponsor: Address;
  gasLimit: bigint;
}

/** Sponsorship request for a transaction */
export interface SponsorRequest {
  sender: Address;
  target: Address;
  callData: Hex;
  chainId: number;
  gasEstimate?: bigint;
}

/** Sponsorship result */
export interface SponsorResult {
  paymaster: Address;
  paymasterData: Hex;
  sponsorshipId: string;
}

/** Paymaster client configuration */
export interface PaymasterConfig {
  paymasterUrl: string;
  apiKey?: string;
}
