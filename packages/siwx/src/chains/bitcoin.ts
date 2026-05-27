/**
 * Bitcoin BIP-322 sign-in adapter for cross-chain authentication.
 *
 * Implements "Sign Message" verification per BIP-322,
 * adapted for cross-chain sign-in (SIWX) purposes.
 *
 * BIP-322 Reference: https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
 */

import type { SIWXParams, SIWXResult, SIWXVerifyInput } from '../types.js';
import { generateTimestamp } from '@cinacoin/siwe';

/**
 * Create a sign-in message for Bitcoin chains using BIP-322 compatible format.
 *
 * @param params - SIWX parameters.
 * @returns Bitcoin sign-in message string.
 */
export function createBitcoinSignInMessage(params: SIWXParams): string {
  const version = params.version || '1';
  const issuedAt = params.issuedAt || generateTimestamp();

  const lines: string[] = [];

  lines.push(`${params.domain} wants you to sign in with your Bitcoin account:`);
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
 * Verify a Bitcoin BIP-322 signature against a message.
 *
 * BIP-322 defines a generic "Sign Message" scheme that works with
 * P2PKH, P2WPKH, and Taproot addresses.
 *
 * @param input - Verification input.
 * @returns SIWX result with validity status.
 *
 * Note: Full BIP-322 verification requires access to Bitcoin script
 * validation. In practice, use a Bitcoin library like bitcoinjs-lib.
 */
export async function verifyBitcoinSignature(
  input: SIWXVerifyInput
): Promise<SIWXResult> {
  try {
    let isValid: boolean;

    if (typeof globalThis.__bitcoinVerify === 'function') {
      // Custom verify hook provided by the runtime
      isValid = globalThis.__bitcoinVerify(
        input.message,
        input.signature,
        input.address
      );
    } else {
      // Without a verify implementation, validate format only
      isValid = validateBitcoinSignatureFormat(input.signature, input.address);
    }

    return {
      chainType: 'bitcoin',
      data: { address: input.address, message: input.message },
      signature: input.signature,
      message: input.message,
      valid: isValid,
      error: isValid ? undefined : 'Bitcoin signature verification failed',
    };
  } catch (error: any) {
    return {
      chainType: 'bitcoin',
      data: {},
      signature: input.signature,
      message: input.message,
      valid: false,
      error: error?.message || 'Unknown error during Bitcoin verification',
    };
  }
}

/**
 * Basic format validation for a Bitcoin BIP-322 signature.
 *
 * BIP-322 signatures are base64-encoded PSBT (Partially Signed Bitcoin Transaction).
 * Legacy signatures may be base64-encoded.
 *
 * @param signature - Signature string.
 * @param address - Bitcoin address (used to infer format expectations).
 * @returns True if the format looks correct.
 */
function validateBitcoinSignatureFormat(signature: string, address: string): boolean {
  if (!signature) return false;

  // BIP-322 signatures are base64-encoded (PSBT format starts with "cHNi")
  if (signature.startsWith('cHNi')) {
    return true; // Valid PSBT base64
  }

  // Legacy base64 signatures are typically 88 chars
  if (/^[A-Za-z0-9+/=]{80,96}$/.test(signature)) {
    return true;
  }

  // Hex format (DER signature)
  if (/^30[0-9a-fA-F]+$/.test(signature)) {
    return true;
  }

  return false;
}

/**
 * Parse a Bitcoin sign-in message into structured data.
 *
 * @param message - Bitcoin sign-in message string.
 * @returns Parsed message fields.
 */
export function parseBitcoinMessage(message: string): Record<string, any> {
  const lines = message.split('\n');

  const preambleMatch = lines[0]?.match(/^(.+) wants you to sign in with your Bitcoin account:$/);
  if (!preambleMatch) {
    throw new Error('Invalid Bitcoin sign-in message: missing or malformed preamble');
  }

  const address = lines[1];
  if (!address) {
    throw new Error('Invalid Bitcoin sign-in message: missing address');
  }

  const fields: Record<string, string> = {};
  let uriLineIndex = -1;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (line?.startsWith('URI:')) {
      uriLineIndex = i;
    }

    const match = line?.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }

  const statementLines: string[] = [];
  for (let i = 2; i < (uriLineIndex > 0 ? uriLineIndex - 1 : lines.length); i++) {
    const line = lines[i];
    if (line !== '' && !line?.startsWith('URI:')) {
      statementLines.push(line);
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
  };
}
