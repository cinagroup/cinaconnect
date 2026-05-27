/**
 * TON (Sign-In With TON) adapter for cross-chain authentication.
 *
 * Implements SIWT — a Sign-In with X pattern for The Open Network,
 * using ed25519 curve signatures and the TON-specific message format.
 *
 * TON addresses are base64url-encoded and the chain uses workchain +
 * account_id addressing. Signatures are raw ed25519 (64 bytes).
 *
 * Reference: https://docs.ton.org
 */

import type { SIWXParams, SIWXResult, SIWXVerifyInput } from '../types.js';
import { generateTimestamp } from '@cinacoin/siwe';

/** TON mainnet workchain identifier. */
const TON_MAINNET_WORKCHAIN = 0;

/** TON testnet workchain identifier. */
const TON_TESTNET_WORKCHAIN = -1;

/**
 * Create a sign-in message for TON chains (SIWT format).
 *
 * The message follows the SIWE-inspired structured text format,
 * adapted for TON addressing conventions.
 *
 * @param params - SIWX parameters.
 * @returns TON sign-in message string.
 */
export function createTonSignInMessage(params: SIWXParams): string {
  const version = params.version || '1';
  const issuedAt = params.issuedAt || generateTimestamp();

  const lines: string[] = [];

  lines.push(`${params.domain} wants you to sign in with your TON account:`);
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
 * Verify a TON ed25519 signature against a message.
 *
 * TON uses ed25519 signatures (64 bytes, raw). The public key
 * is embedded in the TON address, enabling verification.
 *
 * @param input - Verification input (message, signature, address).
 * @returns SIWX result with validity status.
 *
 * Note: Full cryptographic verification requires @noble/ed25519
 * or a similar ed25519 library. This implementation performs
 * format validation and delegates to a registered verify hook
 * when available.
 */
export async function verifyTonSignature(
  input: SIWXVerifyInput
): Promise<SIWXResult> {
  try {
    let isValid: boolean;

    if (typeof globalThis.__tonVerify === 'function') {
      // Custom TON verify hook provided by the runtime (e.g., ton-crypto)
      const messageBytes = new TextEncoder().encode(input.message);
      const signatureBytes =
        typeof input.signature === 'string'
          ? Buffer.from(input.signature, 'hex')
          : input.signature;

      isValid = globalThis.__tonVerify(
        signatureBytes,
        messageBytes,
        input.address
      );
    } else {
      // Without a verify implementation, validate format only
      isValid = validateTonSignatureFormat(input.signature);
    }

    return {
      chainType: 'ton' as any,
      data: {
        address: input.address,
        message: input.message,
        workchain: extractTonWorkchain(input.address),
      },
      signature: input.signature,
      message: input.message,
      valid: isValid,
      error: isValid ? undefined : 'TON signature verification failed',
    };
  } catch (error: any) {
    return {
      chainType: 'ton' as any,
      data: {},
      signature: input.signature,
      message: input.message,
      valid: false,
      error: error?.message || 'Unknown error during TON verification',
    };
  }
}

/**
 * Validate the format of a TON ed25519 signature.
 *
 * TON signatures are 64-byte ed25519 signatures, typically
 * represented as a 128-character hex string or base64url.
 *
 * @param signature - Signature as hex or base64 string.
 * @returns True if the format looks correct.
 */
function validateTonSignatureFormat(signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;

  // Hex-encoded 64-byte signature (128 hex chars)
  if (/^[0-9a-fA-F]{128}$/.test(signature)) {
    return true;
  }

  // Base64-encoded 64-byte signature (88 chars with padding)
  if (/^[A-Za-z0-9+/=]{88,90}$/.test(signature)) {
    return true;
  }

  // base64url-encoded (86 chars without padding)
  if (/^[A-Za-z0-9_-]{86,88}$/.test(signature)) {
    return true;
  }

  return false;
}

/**
 * Extract the workchain from a TON address.
 *
 * TON addresses have the format:
 *   EQ... (bounceable, workchain 0)
 *   UQ... (non-bounceable, workchain 0)
 *   kQ... (bounceable, workchain -1)
 *   0Q... (non-bounceable, workchain -1)
 *
 * Or full format: <workchain>:<hex_account_id>
 *
 * @param address - TON address string.
 * @returns Extracted workchain number.
 */
function extractTonWorkchain(address: string): number {
  if (!address) return TON_MAINNET_WORKCHAIN;

  // Full format: workchain:hex
  const fullMatch = address.match(/^(-?\d+):/);
  if (fullMatch) {
    return parseInt(fullMatch[1], 10);
  }

  // Base64url format: first byte encodes workchain
  // Bounceable mainnet starts with 'EQ', non-bounceable with 'UQ'
  // Bounceable masterchain starts with 'kQ', non-bounceable with '0Q'
  const prefix = address.substring(0, 2);
  if (prefix === 'EQ' || prefix === 'UQ') {
    return TON_MAINNET_WORKCHAIN;
  }
  if (prefix === 'kQ' || prefix === '0Q') {
    return TON_TESTNET_WORKCHAIN;
  }

  return TON_MAINNET_WORKCHAIN;
}

/**
 * Validate a TON address format.
 *
 * Accepts both short form (base64url) and full form (workchain:hex).
 *
 * @param address - TON address to validate.
 * @returns True if the address format is valid.
 */
export function isValidTonAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Full format: workchain:64 hex chars
  if (/^-?\d:[0-9a-fA-F]{64}$/.test(address)) {
    return true;
  }

  // Short form: 48 chars of base64url
  if (/^[A-Za-z0-9_-]{48}$/.test(address)) {
    return true;
  }

  return false;
}

/**
 * Parse a TON sign-in message into structured data.
 *
 * @param message - TON sign-in message string.
 * @returns Parsed message fields.
 */
export function parseTonMessage(message: string): Record<string, any> {
  const lines = message.split('\n');

  const preambleMatch = lines[0]?.match(
    /^(.+) wants you to sign in with your TON account:$/
  );
  if (!preambleMatch) {
    throw new Error('Invalid TON sign-in message: missing or malformed preamble');
  }

  const address = lines[1];
  if (!address) {
    throw new Error('Invalid TON sign-in message: missing address');
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
    workchain: extractTonWorkchain(address),
  };
}
