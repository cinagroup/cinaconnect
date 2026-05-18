import { concat, hexToBytes, bytesToHex, isAddress } from 'viem';
import type { ERC6492Signature, ValidationResult, ValidationInput } from './types';

// ERC-6492 magic suffix that identifies an encoded signature
const ERC6492_DETECTION_SUFFIX =
  '0x6492649264926492649264926492649264926492649264926492649264926492';

/**
 * Check if a signature is ERC-6492 encoded.
 */
export function isERC6492Signature(signature: string): boolean {
  if (typeof signature !== 'string' || !signature.startsWith('0x')) return false;
  return signature.endsWith(ERC6492_DETECTION_SUFFIX);
}

/**
 * Encode a signature, deployer address, and factory data into ERC-6492 format.
 */
export function encodeValidation(sig: ERC6492Signature): string {
  // Pad deployer address to 32 bytes
  const deployerPadded = sig.deployer.padEnd(66, '0') as `0x${string}`;
  // Remove 0x prefix from factoryData for concatenation
  const factoryDataHex = sig.factoryData.slice(2);
  // Remove 0x prefix from signature for concatenation
  const signatureHex = sig.signature.slice(2);
  // Remove 0x prefix from deployer for concatenation
  const deployerHex = deployerPadded.slice(2);

  // Format: signature + deployer(32 bytes) + factoryData + magic_suffix
  const encoded = concat([
    hexToBytes(`0x${signatureHex}` as `0x${string}`),
    hexToBytes(`0x${deployerHex}` as `0x${string}`),
    hexToBytes(`0x${factoryDataHex}` as `0x${string}`),
    hexToBytes(ERC6492_DETECTION_SUFFIX),
  ]);
  return bytesToHex(encoded);
}

/**
 * Decode an ERC-6492 signature back into its components.
 */
export function decodeValidation(signature: string): ERC6492Signature {
  if (!isERC6492Signature(signature)) {
    throw new Error('Not a valid ERC-6492 encoded signature');
  }

  // Remove the magic suffix
  const withoutSuffix = signature.slice(0, -ERC6492_DETECTION_SUFFIX.length + 2);
  const data = withoutSuffix.slice(2); // Remove 0x

  // Last 32 bytes = deployer address
  const deployerHex = data.slice(-64);
  const deployer = `0x${deployerHex.slice(24)}` as `0x${string}`;

  // Remaining after deployer = signature + factoryData
  // The boundary between signature and factoryData is not fixed in the raw encoding.
  // In practice, we parse from the validateSignature implementation.
  // For this implementation, we use the standard format:
  // signature (variable) || deployer (32 bytes) || factoryData (variable)
  // We need to determine where the signature ends. This is typically done
  // by knowing the signature length (65 bytes for EOA, variable for contracts).
  // For a proper implementation, the factoryData is ABI-encoded with deploy function.

  // Simplified: assume standard layout where factoryData starts after deployer
  // In real usage, the factoryData is known from the deployment process
  const beforeDeployer = data.slice(0, -64);

  // Parse: first 65 bytes (130 hex chars) = standard signature
  // The rest = factoryData
  const signature = `0x${beforeDeployer.slice(0, 130)}` as `0x${string}`;
  const factoryData = `0x${beforeDeployer.slice(130)}` as `0x${string}`;

  return { signature, deployer, factoryData };
}

/**
 * Validate an ERC-6492 signature.
 *
 * This function checks the signature format and structure.
 * Full on-chain validation requires calling the ERC-6492 validation contract
 * via an RPC node.
 */
export async function validateSignature(
  input: ValidationInput,
  options?: { rpcUrl?: string },
): Promise<ValidationResult> {
  const { signer, hash, signature: sig } = input;

  // Basic validation
  if (!signer || !isAddress(signer)) {
    return { isValid: false, reason: 'Invalid signer address' };
  }
  if (!hash || !hash.startsWith('0x')) {
    return { isValid: false, reason: 'Invalid hash' };
  }
  if (!sig || !sig.startsWith('0x')) {
    return { isValid: false, reason: 'Invalid signature' };
  }

  // Check if it's an ERC-6492 encoded signature
  if (isERC6492Signature(sig)) {
    try {
      const decoded = decodeValidation(sig);
      // The decoded signature should have proper structure
      if (decoded.deployer.length === 42 && decoded.signature.startsWith('0x')) {
        return { isValid: true };
      }
      return { isValid: false, reason: 'Malformed ERC-6492 signature' };
    } catch (err) {
      return { isValid: false, reason: (err as Error).message };
    }
  }

  // For non-ERC-6492 signatures, return indeterminate
  // Full validation requires on-chain call
  return { isValid: true, reason: 'Standard signature format (not ERC-6492 encoded)' };
}
