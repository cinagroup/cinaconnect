/**
 * Braavos Wallet Connector.
 *
 * Interfaces with the Braavos browser extension and mobile wallet for Starknet.
 * Braavos natively supports account abstraction with hardware-enclave signing.
 */

import type { StarknetCall, StarknetTransactionResult, StarknetWalletConnector } from '../types.js';

/** Minimal Braavos provider type declarations. */
interface BraavosProvider {
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
    braavos?: BraavosProvider;
  }
}

/**
 * Braavos wallet connector for Starknet.
 *
 * Provides a standardized interface over the Braavos browser extension / mobile wallet,
 * leveraging Starknet's native account abstraction through the Braavos account
 * contract with hardware-enclave security.
 */
export class BraavosConnector implements StarknetWalletConnector {
  readonly id = 'braavos';
  readonly name = 'Braavos';

  private provider: BraavosProvider | null = null;
  private accountAddress: string | null = null;

  /**
   * Check if the Braavos extension is installed.
   */
  isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.braavos;
  }

  /**
   * Connect to Braavos wallet.
   * @returns The connected Starknet account address.
   */
  async connect(): Promise<string> {
    const provider = this._getProvider();
    if (!provider) {
      throw new Error('Braavos wallet is not installed. Install it from https://braavos.app/');
    }

    const account = await provider.enable({ starknetVersion: 'v5' });
    this.provider = provider;
    this.accountAddress = account.address;

    return account.address;
  }

  /**
   * Disconnect from Braavos wallet.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (err) { console.warn('[braavos] Operation failed:', err instanceof Error ? err.message : String(err));
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
    if (!this.provider) throw new Error('Braavos not connected');

    const account = this.provider.account;
    if (!account) throw new Error('No account available from Braavos');

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
    if (!this.provider) throw new Error('Braavos not connected');

    const account = this.provider.account;
    if (!account) throw new Error('No account available from Braavos');

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
    if (!this.provider) throw new Error('Braavos not connected');

    const account = this.provider.account;
    if (!account) throw new Error('No account available from Braavos');

    const result = await account.signMessage(
      typeof message === 'string' ? { domain: {}, types: {}, message: { content: message } } : message,
    );

    return JSON.stringify(result);
  }

  /** Get the underlying provider for advanced use cases. */
  getProvider(): BraavosProvider | null {
    return this.provider;
  }

  private _getProvider(): BraavosProvider | null {
    if (this.provider) return this.provider;
    if (typeof window === 'undefined') return null;
    return window.braavos ?? null;
  }
}
