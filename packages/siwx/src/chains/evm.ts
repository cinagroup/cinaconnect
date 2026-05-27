/**
 * EVM SIWE adapter for cross-chain sign-in.
 *
 * Implements EIP-4361 (Sign-In with Ethereum) message generation
 * and verification for the EVM chain family.
 */

import type { SIWXParams, SIWXResult, SIWXVerifyInput } from '../types.js';
import { generateMessage as generateSIWEMessage, parseMessage, verifyMessage } from '@cinacoin/siwe';

/**
 * Create a sign-in message for EVM chains using EIP-4361 format.
 *
 * @param params - SIWX parameters.
 * @returns EIP-4361 formatted message string.
 */
export function createEvmSignInMessage(params: SIWXParams): string {
  return generateSIWEMessage({
    domain: params.domain,
    address: params.address,
    statement: params.statement,
    uri: params.uri,
    version: params.version,
    chainId: typeof params.chainId === 'number' ? params.chainId : parseInt(String(params.chainId), 10),
    nonce: params.nonce,
    issuedAt: params.issuedAt,
    expirationTime: params.expirationTime,
    notBefore: params.notBefore,
    requestId: params.requestId,
    resources: params.resources,
  });
}

/**
 * Verify an EVM SIWE signature.
 *
 * @param input - Verification input with message, signature, address.
 * @param provider - EIP-1193 or ethers/viem provider for cryptographic verification.
 * @returns SIWX result with validity status.
 */
export async function verifyEvmSignature(
  input: SIWXVerifyInput,
  provider: any
): Promise<SIWXResult> {
  const result = await verifyMessage(input.message, input.signature, provider);

  return {
    chainType: 'evm',
    data: result.data,
    signature: input.signature,
    message: input.message,
    valid: result.valid,
    error: result.error,
  };
}

/**
 * Parse an EVM SIWE message into structured data.
 *
 * @param message - EIP-4361 formatted message string.
 * @returns Parsed message fields.
 */
export function parseEvmMessage(message: string) {
  return parseMessage(message);
}
