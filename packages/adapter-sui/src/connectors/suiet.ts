/**
 * Suiet Wallet connector.
 *
 * Connects via the `window.suietWallet` injected object provided by
 * the Suiet Wallet browser extension.
 *
 * @module connectors/suiet
 */

import type { SuiConnector, SuiPlatform, SuiFeature, SuiWalletProvider } from '../types.js';

/**
 * Connector for the Suiet Wallet browser extension.
 *
 * @example
 * ```ts
 * const connector = new SuietConnector();
 * if (connector.isAvailable()) {
 *   const { accounts } = await connector.connect();
 *   console.log('Connected:', accounts[0]);
 * }
 * ```
 */
export class SuietConnector implements SuiConnector {
  readonly id = 'suiet';
  readonly name = 'Suiet Wallet';
  readonly icon = 'https://suiet.app/favicon.svg';
  readonly platforms: SuiPlatform[] = ['browser', 'extension'];
  readonly supportedFeatures: SuiFeature[] = [
    'sui:connect',
    'sui:signTransaction',
    'sui:signAndExecuteTransaction',
    'sui:signMessage',
    'sui:switchNetwork',
  ];

  private provider: SuiWalletProvider | null = null;

  /**
   * Resolve the injected Suiet Wallet provider.
   */
  private _resolveProvider(): SuiWalletProvider | null {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as Record<string, unknown>;

    // Suiet exposes `window.suietWallet`
    return (win.suietWallet as SuiWalletProvider) ?? null;
  }

  isAvailable(): boolean {
    return this._resolveProvider() !== null;
  }

  getAddress(): string | null {
    return this.provider?.account ?? null;
  }

  getProvider(): SuiWalletProvider | null {
    return this.provider;
  }

  /**
   * Connect to Suiet Wallet.
   */
  async connect(): Promise<{ accounts: string[]; chain?: string }> {
    const provider = this._resolveProvider();
    if (!provider) throw new Error('Suiet Wallet not found. Install the Suiet Wallet extension.');

    const result = await provider.connect();
    this.provider = provider;
    this._bindEvents(provider);

    return result;
  }

  /**
   * Disconnect from Suiet Wallet.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
    }
  }

  async signTransaction(tx: string): Promise<{ bytes: string; signature: string }> {
    if (!this.provider) throw new Error('Not connected. Call connect() first.');
    return this.provider.signTransaction(tx);
  }

  async signAndExecuteTransaction(
    tx: string,
    options?: { requestType?: 'WaitForLocalExec' | 'WaitForEffectsCert' },
  ): Promise<{ digest: string; effects?: unknown }> {
    if (!this.provider) throw new Error('Not connected. Call connect() first.');
    return this.provider.signAndExecuteTransaction(tx, options);
  }

  /**
   * Subscribe to connector events.
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (this.provider) {
      this.provider.on(event as 'accountChanged', handler as never);
    }
  }

  /**
   * Unsubscribe from connector events.
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    if (this.provider) {
      this.provider.off(event as 'accountChanged', handler as never);
    }
  }

  private _bindEvents(provider: SuiWalletProvider): void {
    provider.on('disconnect', () => {
      this.provider = null;
    });
  }
}
