/**
 * Farcaster Sign-In authentication.
 *
 * Provides Sign-In with Farcaster (SIWF) message generation and validation.
 *
 * @packageDocumentation
 */
import type { FarcasterUser, SignInWithFarcasterParams, SignInWithFarcasterResult } from './types.js';

/**
 * Generate a Sign-In with Farcaster (SIWE-compatible) message.
 *
 * Follows EIP-4361 format adapted for Farcaster identity.
 *
 * @param user - Farcaster user data.
 * @param params - Sign-in parameters.
 * @returns Formatted sign-in message.
 */
export function createSiweMessage(
  user: FarcasterUser,
  params: SignInWithFarcasterParams,
): string {
  const domain = params.domain;
  const nonce = params.nonce;
  const statement = params.statement ?? `${domain} wants you to sign in with your Ethereum account`;
  const uri = params.uri ?? domain;
  const version = params.version ?? '1';
  const chainId = params.chainId ?? 1;

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    `Farcaster FID: ${user.fid}`,
    ``,
    statement,
    ``,
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
}

/**
 * Validate a signature against a signed message.
 *
 * This is a placeholder that would be implemented with viem's
 * verifyMessage or similar on the server side.
 *
 * @param message - The message that was signed.
 * @param signature - The signature to verify.
 * @param address - The expected signer address.
 * @returns true if the signature is valid.
 */
export function verifySignature(
  _message: string,
  _signature: `0x${string}`,
  _address: `0x${string}`,
): boolean {
  // In production, use viem's verifyMessage:
  // import { verifyMessage } from 'viem';
  // return verifyMessage({ message, signature, address });
  throw new Error('verifySignature requires viem. Install as a dependency.');
}

/**
 * FarcasterAuth: Authentication utilities for Farcaster Mini Apps.
 */
export class FarcasterAuth {
  /**
   * Create a sign-in message for a Farcaster user.
   *
   * @param user - Farcaster user data.
   * @param params - Sign-in parameters.
   * @returns SIWE-formatted message string.
   */
  static createSignInMessage(user: FarcasterUser, params: SignInWithFarcasterParams): string {
    return createSiweMessage(user, params);
  }

  /**
   * Generate a nonce for replay protection.
   *
   * @returns Random hex string (32 chars).
   */
  static generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Extract the Farcaster FID from a sign-in message.
   *
   * @param message - SIWE message string.
   * @returns Farcaster FID or null.
   */
  static extractFid(message: string): number | null {
    const match = message.match(/Farcaster FID: (\d+)/);
    if (!match) return null;
    return parseInt(match[1], 10);
  }

  /**
   * Build a sign-in result from user data.
   *
   * @param user - Farcaster user.
   * @param params - Sign-in parameters.
   * @returns Partial SignInWithFarcasterResult (without signature).
   */
  static buildResult(user: FarcasterUser, params: SignInWithFarcasterParams): Omit<SignInWithFarcasterResult, 'success'> {
    const message = createSiweMessage(user, params);
    return {
      user,
      message,
    };
  }

  /**
   * Check if a Farcaster user has a verified Ethereum address.
   *
   * @param user - Farcaster user.
   * @returns First verified ETH address or null.
   */
  static getVerifiedAddress(user: FarcasterUser): `0x${string}` | null {
    const addresses = user.verified_addresses?.eth_addresses;
    if (!addresses || addresses.length === 0) return null;
    return addresses[0];
  }
}
