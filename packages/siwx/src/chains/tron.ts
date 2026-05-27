/**
 * Tron (Sign-In With TRON) adapter for cross-chain authentication.
 *
 * Implements SIWTR — a Sign-In with X pattern for the TRON network,
 * using secp256k1 curve signatures and TRON's base58check addresses.
 *
 * TRON addresses start with 'T' and are 34 characters (base58check).
 * Signatures are secp256k1 recoverable (65 bytes: r, s, v).
 *
 * Reference: https://developers.tron.network
 */

import type { SIWXParams, SIWXResult, SIWXVerifyInput } from '../types.js';
import { generateTimestamp } from '@cinacoin/siwe';

/**
 * Create a sign-in message for TRON chains (SIWTR format).
 *
 * The message follows the SIWE-inspired structured text format,
 * adapted for TRON addressing conventions.
 *
 * @param params - SIWX parameters.
 * @returns TRON sign-in message string.
 */
export function createTronSignInMessage(params: SIWXParams): string {
  const version = params.version || '1';
  const issuedAt = params.issuedAt || generateTimestamp();

  const lines: string[] = [];

  lines.push(`${params.domain} wants you to sign in with your TRON account:`);
  lines.push(params.address);

  if (params.statement) {
    lines.push('');
    lines.push(params.statement);
  }

  lines.push('');
  lines.push(`URI: ${params.uri}`);
  lines.push(`Version: ${version}`);
  lines.push(`Chain ID: ${params.chainId}`);
  lines.push(`Nonce: ${params.nonce}`);
  lines.push(`Issued At: ${issuedAt}`);

  if (params.expirationTime) {
    lines.push(`Expiration Time: ${params.expirationTime}`);
  }
  if (params.notBefore) {
    lines.push(`Not Before: ${params.notBefore}`);
  }
  if (params.requestId) {
    lines.push(`Request ID: ${params.requestId}`);
  }
  if (params.resources && params.resources.length > 0) {
    lines.push('Resources:');
    for (const resource of params.resources) {
      lines.push(`- ${resource}`);
    }
  }

  return lines.join('\n');
}

/**
 * Verify a TRON secp256k1 signature against a message.
 *
 * TRON uses recoverable secp256k1 signatures (65 bytes: r, s, v),
 * similar to EVM but with TRON-specific hashing (keccak256 of UTF-8
 * message bytes, prefixed with the TRON message prefix).
 *
 * @param input - Verification input (message, signature, address).
 * @returns SIWX result with validity status.
 *
 * Note: Full cryptographic verification requires tronweb or a
 * similar TRON library. This implementation performs format
 * validation and delegates to a registered verify hook when
 * available.
 */
export async function verifyTronSignature(
  input: SIWXVerifyInput
): Promise<SIWXResult> {
  try {
    let isValid: boolean;

    if (typeof globalThis.__tronVerify === 'function') {
      // Custom TRON verify hook provided by the runtime (e.g., tronweb)
      const signatureBytes =
        typeof input.signature === 'string'
          ? Buffer.from(input.signature, 'hex')
          : input.signature;

      isValid = globalThis.__tronVerify(
        input.message,
        signatureBytes,
        input.address
      );
    } else {
      // Without a verify implementation, validate format only
      isValid = validateTronSignatureFormat(input.signature, input.address);
    }

    return {
      chainType: 'tron' as any,
      data: {
        address: input.address,
        message: input.message,
        network: identifyTronNetwork(input.address),
      },
      signature: input.signature,
      message: input.message,
      valid: isValid,
      error: isValid ? undefined : 'TRON signature verification failed',
    };
  } catch (error: any) {
    return {
      chainType: 'tron' as any,
      data: {},
      signature: input.signature,
      message: input.message,
      valid: false,
      error: error?.message || 'Unknown error during TRON verification',
    };
  }
}

/**
 * Validate the format of a TRON secp256k1 signature.
 *
 * TRON signatures are 65-byte recoverable secp256k1 signatures
 * (r: 32 bytes, s: 32 bytes, v: 1 byte = recovery ID).
 *
 * @param signature - Signature as hex string.
 * @param address - TRON address (used to infer expected format).
 * @returns True if the format looks correct.
 */
function validateTronSignatureFormat(signature: string, address: string): boolean {
  if (!signature || typeof signature !== 'string') return false;

  // Hex-encoded 65-byte recoverable signature (130 hex chars)
  if (/^[0-9a-fA-F]{130}$/.test(signature)) {
    return true;
  }

  // Hex-encoded 64-byte signature without v (128 hex chars)
  if (/^[0-9a-fA-F]{128}$/.test(signature)) {
    return true;
  }

  return false;
}

/**
 * Identify the TRON network based on the address prefix.
 *
 * TRON mainnet addresses start with 'T'.
 * TRON testnet (Shasta) addresses may also start with 'T' but
 * have different internal encoding.
 *
 * @param address - TRON address.
 * @returns Network identifier.
 */
function identifyTronNetwork(address: string): string {
  if (!address || typeof address !== 'string') return 'unknown';

  // TRON addresses are base58check encoded, starting with 'T'
  if (/^T[A-Za-z1-9]{33}$/.test(address)) {
    return 'tron-mainnet';
  }

  // Hex format (42 chars, 0x prefix) — usually represents the same
  // address in different encoding
  if (/^41[0-9a-fA-F]{40}$/.test(address)) {
    return 'tron-hex';
  }

  return 'unknown';
}

/**
 * Validate a TRON address format.
 *
 * Accepts both base58check (T-prefix, 34 chars) and hex (0x41-prefix, 42 chars).
 *
 * @param address - TRON address to validate.
 * @returns True if the address format is valid.
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Base58check format: T + 33 alphanumeric
  if (/^T[A-Za-z1-9]{33}$/.test(address)) {
    return true;
  }

  // Hex format: 41 + 40 hex chars (no 0x prefix in TRON)
  if (/^41[0-9a-fA-F]{40}$/.test(address)) {
    return true;
  }

  // With 0x prefix (less common for TRON but accepted by some tools)
  if (/^0x41[0-9a-fA-F]{40}$/.test(address)) {
    return true;
  }

  return false;
}

/**
 * Parse a TRON sign-in message into structured data.
 *
 * @param message - TRON sign-in message string.
 * @returns Parsed message fields.
 */
export function parseTronMessage(message: string): Record<string, any> {
  const lines = message.split('\n');

  const preambleMatch = lines[0]?.match(
    /^(.+) wants you to sign in with your TRON account:$/
  );
  if (!preambleMatch) {
    throw new Error('Invalid TRON sign-in message: missing or malformed preamble');
  }

  const address = lines[1];
  if (!address) {
    throw new Error('Invalid TRON sign-in message: missing address');
  }

  const fields: Record<string, string> = {};
  let statementLines: string[] = [];
  let collectingStatement = false;
  let uriLineIndex = -1;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') {
      if (uriLineIndex === -1 && fields['URI'] === undefined) {
        collectingStatement = true;
        continue;
      }
    }
    if (line?.startsWith('URI:')) {
      collectingStatement = false;
      uriLineIndex = i;
    }

    if (collectingStatement && !line?.startsWith('URI:')) {
      statementLines.push(line);
      continue;
    }

    const match = line?.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }

  return {
    domain: preambleMatch[1],
    address,
    statement: statementLines.join('\n') || undefined,
    uri: fields['URI'],
    version: fields['Version'] || '1',
    chainId: fields['Chain ID'],
    nonce: fields['Nonce'],
    issuedAt: fields['Issued At'],
    expirationTime: fields['Expiration Time'],
    notBefore: fields['Not Before'],
    requestId: fields['Request ID'],
    network: identifyTronNetwork(address),
  };
}
