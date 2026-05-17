import type { Address, Hex } from 'viem';

/**
 * ERC-6492 encoded signature format.
 * The signature is concatenated with the deployer address and create2 factory call data.
 */
export interface ERC6492Signature {
  /** Original signature */
  signature: Hex;
  /** Address of the deployer/forwarder */
  deployer: Address;
  /** Create2 factory calldata to deploy the counterfactual contract */
  factoryData: Hex;
}

/** ERC-6492 validation result */
export interface ValidationResult {
  /** Whether the signature is valid */
  isValid: boolean;
  /** Reason for invalid signatures */
  reason?: string;
}

/** Input for signature validation */
export interface ValidationInput {
  /** Address of the signer (may be a counterfactual address) */
  signer: Address;
  /** Hash of the message that was signed */
  hash: Hex;
  /** ERC-6492 encoded signature */
  signature: Hex;
}
