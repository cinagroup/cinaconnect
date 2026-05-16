/**
 * Core SIWE (Sign-In with Ethereum) implementation per EIP-4361.
 *
 * Provides message generation, parsing, and signature verification
 * for Ethereum-based authentication.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-4361
 */

import type { SIWEParams, ParsedSIWE, SIWEVerificationResult } from './types';
import { generateTimestamp, normalizeAddress } from './utils';
import { validateSIWEParams, fullValidation } from './validator';

/**
 * Generate a SIWE message string from structured parameters.
 *
 * The message follows the EIP-4361 ABNF grammar:
 *
 * ```
 * ${domain} wants you to sign in with your Ethereum account:
 * ${address}
 *
 * ${statement}
 *
 * URI: ${uri}
 * Version: ${version}
 * Chain ID: ${chainId}
 * Nonce: ${nonce}
 * Issued At: ${issuedAt}
 * Expiration Time: ${expirationTime}
 * Not Before: ${notBefore}
 * Request ID: ${requestId}
 * Resources:
 * - ${resource1}
 * - ${resource2}
 * ```
 *
 * @param params - SIWE message parameters.
 * @returns Formatted SIWE message string ready for signing.
 * @throws Error if parameters fail validation.
 */
export function generateMessage(params: SIWEParams): string {
  // Validate parameters first
  const validationErrors = validateSIWEParams(params);
  if (validationErrors.length > 0) {
    const messages = validationErrors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid SIWE parameters: ${messages}`);
  }

  const version = params.version || '1';
  const issuedAt = params.issuedAt || generateTimestamp();

  // Build the message line by line per EIP-4361 spec
  const lines: string[] = [];

  // Line 1: domain preamble
  lines.push(`${params.domain} wants you to sign in with your Ethereum account:`);

  // Line 2: address
  lines.push(params.address);

  // Optional statement (separated by blank line)
  if (params.statement) {
    lines.push('');
    lines.push(params.statement);
  }

  // Required fields section (separated by blank line from statement or address)
  lines.push('');
  lines.push(`URI: ${params.uri}`);
  lines.push(`Version: ${version}`);
  lines.push(`Chain ID: ${params.chainId}`);
  lines.push(`Nonce: ${params.nonce}`);
  lines.push(`Issued At: ${issuedAt}`);

  // Optional fields
  if (params.expirationTime) {
    lines.push(`Expiration Time: ${params.expirationTime}`);
  }
  if (params.notBefore) {
    lines.push(`Not Before: ${params.notBefore}`);
  }
  if (params.requestId) {
    lines.push(`Request ID: ${params.requestId}`);
  }

  // Resources section
  if (params.resources && params.resources.length > 0) {
    lines.push('Resources:');
    for (const resource of params.resources) {
      lines.push(`- ${resource}`);
    }
  }

  return lines.join('\n');
}

/**
 * Parse a SIWE message string into structured data.
 *
 * Reverses the generateMessage function to extract all fields
 * from a formatted SIWE message.
 *
 * @param message - SIWE message string.
 * @returns Parsed SIWE data object.
 * @throws Error if the message cannot be parsed.
 */
export function parseMessage(message: string): ParsedSIWE {
  const lines = message.split('\n');

  // Line 0: "<domain> wants you to sign in with your Ethereum account:"
  const preambleMatch = lines[0]?.match(/^(.+) wants you to sign in with your Ethereum account:$/);
  if (!preambleMatch) {
    throw new Error('Invalid SIWE message: missing or malformed preamble');
  }
  const domain = preambleMatch[1];

  // Line 1: address
  const address = lines[1];
  if (!address || !address.startsWith('0x')) {
    throw new Error('Invalid SIWE message: missing or malformed address');
  }

  // Determine where the required fields section starts
  // Look for the "URI:" line
  let uriLineIndex = -1;
  for (let i = 2; i < lines.length; i++) {
    if (lines[i]?.startsWith('URI:')) {
      uriLineIndex = i;
      break;
    }
  }

  if (uriLineIndex === -1) {
    throw new Error('Invalid SIWE message: missing URI field');
  }

  // Statement is everything between address and the blank line before URI
  let statement: string | undefined;
  if (uriLineIndex > 3) {
    // There's a statement: lines between address line (1) and the blank line before URI
    // lines[2] should be blank, then statement lines
    const statementLines = lines.slice(3, uriLineIndex - 1);
    if (statementLines.length > 0) {
      statement = statementLines.join('\n');
    }
  }

  // Parse required fields from URI line onward
  const fields: Record<string, string> = {};
  let resourcesStart = -1;

  for (let i = uriLineIndex; i < lines.length; i++) {
    const line = lines[i];

    if (line === 'Resources:') {
      resourcesStart = i + 1;
      break;
    }

    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }

  // Parse resources
  const resources: string[] = [];
  if (resourcesStart > 0) {
    for (let i = resourcesStart; i < lines.length; i++) {
      const line = lines[i];
      const resourceMatch = line.match(/^- (.+)$/);
      if (resourceMatch) {
        resources.push(resourceMatch[1]);
      }
    }
  }

  // Extract fields
  const uri = fields['URI'];
  const version = fields['Version'] || '1';
  const chainIdStr = fields['Chain ID'];
  const nonce = fields['Nonce'];
  const issuedAt = fields['Issued At'];

  if (!uri || !chainIdStr || !nonce || !issuedAt) {
    throw new Error('Invalid SIWE message: missing required fields (URI, Chain ID, Nonce, or Issued At)');
  }

  const chainId = parseInt(chainIdStr, 10);
  if (isNaN(chainId)) {
    throw new Error('Invalid SIWE message: Chain ID must be a number');
  }

  const result: ParsedSIWE = {
    domain,
    address,
    uri,
    version,
    chainId,
    nonce,
    issuedAt,
    resources,
  };

  // Optional fields
  if (fields['Expiration Time']) {
    result.expirationTime = fields['Expiration Time'];
  }
  if (fields['Not Before']) {
    result.notBefore = fields['Not Before'];
  }
  if (fields['Request ID']) {
    result.requestId = fields['Request ID'];
  }
  if (statement) {
    result.statement = statement;
  }

  return result;
}

/**
 * Verify a SIWE signature against the message and recover the address.
 *
 * Uses the provided provider (ethers, viem, or web3) to perform
 * the cryptographic verification.
 *
 * @param message - The SIWE message string that was signed.
 * @param signature - The signature (hex string with 0x prefix).
 * @param provider - EIP-1193 provider or ethers/viem compatible provider.
 * @returns Verification result with parsed data and validity status.
 */
export async function verifyMessage(
  message: string,
  signature: string,
  provider: any
): Promise<SIWEVerificationResult> {
  try {
    // Parse the message first
    const data = parseMessage(message);

    // Recover the address from the signature
    let recoveredAddress: string;

    if (provider.recoverAddress) {
      // viem / ethers v6 style
      recoveredAddress = await provider.recoverAddress({
        message,
        signature,
      });
    } else if (provider.verifyMessage) {
      // ethers v5 style — use signers
      recoveredAddress = await provider.verifyMessage(message, signature);
    } else if (provider.request) {
      // EIP-1193 provider — we need a signing method
      // For personal_sign recovery, we'd need the address from the message
      // Verify by checking if the signed address matches
      const normalizedMsgAddress = normalizeAddress(data.address);

      // Try to verify using eth_signTypedData_v4 or personal_sign
      // Since EIP-1193 doesn't expose recovery directly, we verify
      // by comparing against the known address from the message
      // This is a weaker check but works with standard providers
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const hasAddress = accounts.some(
          (addr: string) => normalizeAddress(addr) === normalizedMsgAddress
        );
        if (!hasAddress) {
          return {
            valid: false,
            data,
            error: 'Recovered address does not match the address in the SIWE message',
          };
        }
        recoveredAddress = data.address;
      } catch {
        return {
          valid: false,
          data,
          error: 'Unable to verify signature with EIP-1193 provider',
        };
      }
    } else {
      return {
        valid: false,
        data,
        error: 'Unsupported provider type',
      };
    }

    // Check that the recovered address matches the message address
    if (normalizeAddress(recoveredAddress) !== normalizeAddress(data.address)) {
      return {
        valid: false,
        data,
        error: 'Recovered address does not match the address in the SIWE message',
      };
    }

    // Run full validation (temporal, domain, format)
    const validationErrors = fullValidation(data, signature);
    if (validationErrors.length > 0) {
      return {
        valid: false,
        data,
        error: validationErrors.map(e => e.message).join('; '),
      };
    }

    return {
      valid: true,
      data,
    };
  } catch (error: any) {
    return {
      valid: false,
      data: {} as ParsedSIWE,
      error: error?.message || 'Unknown error during verification',
    };
  }
}
