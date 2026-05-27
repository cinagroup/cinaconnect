/**
 * Argent X Wallet Connector.
 *
 * Interfaces with the Argent X browser extension wallet for Starknet.
 * Argent X natively supports account abstraction via the Argent account contract.
 */

import type { StarknetCall, StarknetTransactionResult, StarknetWalletConnector } from '../types.js';

/** Minimal Argent X provider type declarations. */
interface ArgentXProvider {
  id: string;
  name: string;
  icon: string;
  isConnected: boolean;
  account: StarknetAccount | null;

  enable(options?: { starknetVersion?: string }): Promise<StarknetAccount>;
  disconnect(): Promise<void>;
  on(event: 'accountsChanged' | 'networkChanged', handler: (...args: unknown[]) => void): void;
  off(event: 'accountsChanged' | 'networkChanged', handler: (...args: unknown[]) => void): void;
  request?(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface StarknetAccount {
  address: string;
  execute(
    calls: StarknetCall[],
    details?: { maxFee?: string; nonce?: string; version?: string },
  ): Promise<{ transaction_hash: string }>;
  estimateFee(calls: StarknetCall[]): Promise<{ suggestedMaxFee: string }>;
  signMessage(typedData: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    argentX?: ArgentXProvider;
  }
}

/**
 * Argent X wallet connector for Starknet.
 *
 * Provides a standardized interface over the Argent X browser extension,
 * leveraging Starknet's native account abstraction through the Argent
 * account contract.
 */
export class ArgentXConnector implements StarknetWalletConnector {
  readonly id = 'argent-x';
  readonly name = 'Argent X';

  private provider: ArgentXProvider | null = null;
  private accountAddress: string | null = null;

  /**
   * Check if the Argent X extension is installed.
   */
  isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.argentX;
  }

  /**
   * Connect to Argent X wallet.
   * @returns The connected Starknet account address.
   */
  async connect(): Promise<string> {
    const provider = this._getProvider();
    if (!provider) {
      throw new Error('Argent X wallet is not installed. Install it from https://www.argent.xyz/argent-x/');
    }

    const account = await provider.enable({ starknetVersion: 'v5' });
    this.provider = provider;
    this.accountAddress = account.address;

    return account.address;
  }

  /**
   * Disconnect from Argent X wallet.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (err) { console.warn('[argent-x] Operation failed:', err instanceof Error ? err.message : String(err));
        // Wallet may already be disconnected
      }
      this.provider = null;
      this.accountAddress = null;
    }
  }

  /**
   * Get the connected account address.
   */
  getAccount(): string | null {
    return this.accountAddress;
  }

  /**
   * Sign a Starknet transaction (does not broadcast).
   */
  async signTransaction(calls: StarknetCall[]): Promise<unknown> {
    if (!this.provider) throw new Error('Argent X not connected');

    const account = this.provider.account;
    if (!account) throw new Error('No account available from Argent X');

    return account.execute(calls, {});
  }

  /**
   * Execute a Starknet transaction on the connected wallet.
   * Leverages native account abstraction — the wallet's account contract
   * handles fee estimation, nonce management, and validation.
   */
  async executeTransaction(
    calls: StarknetCall[],
    details?: Record<string, unknown>,
  ): Promise<StarknetTransactionResult> {
    if (!this.provider) throw new Error('Argent X not connected');

    const account = this.provider.account;
    if (!account) throw new Error('No account available from Argent X');

    // Auto-estimate maxFee if not provided
    let maxFee = details?.maxFee as string | undefined;
    if (!maxFee) {
      const feeEstimate = await account.estimateFee(calls);
      maxFee = feeEstimate.suggestedMaxFee;
    }

    const result = await account.execute(calls as Parameters<NonNullable<StarknetAccount['execute']>>[0], {
      maxFee,
      nonce: details?.nonce as string | undefined,
      version: details?.version as string | undefined,
    });

    return { transactionHash: result.transaction_hash };
  }

  /**
   * Sign a message using the connected account.
   */
  async signMessage(message: string | unknown): Promise<string> {
    if (!this.provider) throw new Error('Argent X not connected');

    const account = this.provider.account;
    if (!account) throw new Error('No account available from Argent X');

    const result = await account.signMessage(
      typeof message === 'string' ? { domain: {}, types: {}, message: { content: message } } : message,
    );

    return JSON.stringify(result);
  }

  /** Get the underlying provider for advanced use cases. */
  getProvider(): ArgentXProvider | null {
    return this.provider;
  }

  private _getProvider(): ArgentXProvider | null {
    if (this.provider) return this.provider;
    if (typeof window === 'undefined') return null;
    return window.argentX ?? null;
  }
}
