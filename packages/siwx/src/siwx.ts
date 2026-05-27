/**
 * SIWX (Sign-In with Cross-chain) — Cross-chain authentication abstraction.
 *
 * Unified interface for sign-in across EVM (EIP-4361), Solana (ed25519),
 * Bitcoin (BIP-322), TON (SIWT), and TRON (SIWTR).
 */

import type { SIWXParams, SIWXResult, SIWXVerifyInput, ChainType } from './types.js';
import { createEvmSignInMessage, verifyEvmSignature } from './chains/evm.js';
import { createSolanaSignInMessage, verifySolanaSignature } from './chains/solana.js';
import { createBitcoinSignInMessage, verifyBitcoinSignature } from './chains/bitcoin.js';
import { createTonSignInMessage, verifyTonSignature } from './chains/ton.js';
import { createTronSignInMessage, verifyTronSignature } from './chains/tron.js';
import { generateTimestamp } from '@cinacoin/siwe';
import { randomBytes } from 'crypto';

/**
 * Generate a cross-chain sign-in nonce.
 *
 * @param byteLength - Number of random bytes (default: 16).
 * @returns Hex-encoded nonce.
 */
function generateNonce(byteLength: number = 16): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Create a sign-in message for the specified chain type.
 *
 * Automatically enriches params with defaults (nonce, issuedAt) if not provided.
 *
 * @param params - SIWX parameters.
 * @param chainType - Target chain type ('evm' | 'solana' | 'bitcoin' | 'ton' | 'tron').
 * @returns Formatted sign-in message string.
 */
export function createSignInMessage(
  params: SIWXParams,
  chainType: ChainType
): string {
  // Enrich with defaults
  const enriched: SIWXParams = {
    ...params,
    nonce: params.nonce || generateNonce(),
    issuedAt: params.issuedAt || generateTimestamp(),
    version: params.version || '1',
  };

  switch (chainType) {
    case 'evm':
      return createEvmSignInMessage(enriched);
    case 'solana':
      return createSolanaSignInMessage(enriched);
    case 'bitcoin':
      return createBitcoinSignInMessage(enriched);
    case 'ton':
      return createTonSignInMessage(enriched);
    case 'tron':
      return createTronSignInMessage(enriched);
    default:
      throw new Error(`Unsupported chain type: ${chainType}`);
  }
}

/**
 * Verify a cross-chain sign-in signature.
 *
 * Dispatches to the appropriate chain-specific verification method.
 *
 * @param input - Verification input (message, signature, address, chainType).
 * @param provider - Optional provider (required for EVM verification).
 * @returns SIWX result with validity status.
 */
export async function verifySignIn(
  input: SIWXVerifyInput,
  provider?: any
): Promise<SIWXResult> {
  switch (input.chainType) {
    case 'evm':
      if (!provider) {
        throw new Error('EVM verification requires a provider');
      }
      return verifyEvmSignature(input, provider);
    case 'solana':
      return verifySolanaSignature(input);
    case 'bitcoin':
      return verifyBitcoinSignature(input);
    case 'ton':
      return verifyTonSignature(input);
    case 'tron':
      return verifyTronSignature(input);
    default:
      throw new Error(`Unsupported chain type for verification: ${input.chainType}`);
  }
}

/**
 * SIWX adapter interface for extending with new chain types.
 */
export interface SIWXAdapter {
  /** Chain type this adapter handles. */
  readonly chainType: ChainType;

  /**
   * Create a sign-in message for this chain.
   */
  createMessage(params: SIWXParams): string;

  /**
   * Verify a signature for this chain.
   */
  verify(input: SIWXVerifyInput, provider?: any): Promise<SIWXResult>;
}

/**
 * Registry of SIWX adapters for extensible chain support.
 */
export class SIWXRegistry {
  private adapters: Map<ChainType, SIWXAdapter> = new Map();

  /**
   * Register a new chain adapter.
   */
  register(adapter: SIWXAdapter): void {
    this.adapters.set(adapter.chainType, adapter);
  }

  /**
   * Get an adapter by chain type.
   */
  get(chainType: ChainType): SIWXAdapter | undefined {
    return this.adapters.get(chainType);
  }

  /**
   * Check if an adapter exists for a chain type.
   */
  has(chainType: ChainType): boolean {
    return this.adapters.has(chainType);
  }

  /**
   * Get all registered chain types.
   */
  getRegisteredChains(): ChainType[] {
    return Array.from(this.adapters.keys());
  }
}

// Default registry with built-in adapters
export const defaultRegistry = new SIWXRegistry();
