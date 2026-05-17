import type {
  BitcoinConnector,
  BitcoinPlatform,
  BitcoinFeature,
  BitcoinConnectionResult,
  BitcoinConnectorEvents,
} from '../types';

/**
 * Wallet Standard base interfaces for Bitcoin feature discovery.
 *
 * @see https://wallet-standard.com/
 * @see https://github.com/wallet-standard/wallet-standard
 */

/** Minimal Wallet Standard Wallet interface */
interface WalletStandardWallet {
  readonly version: '1.0.0';
  readonly name: string;
  readonly icon: `data:image/svg+xml;base64,${string}` | string;
  readonly chains: readonly string[];
  readonly features: Readonly<Record<string, unknown>>;
  readonly accounts: ReadonlyArray<{
    readonly address: string;
    readonly publicKey: Uint8Array;
    readonly chains: readonly string[];
    readonly features: Readonly<Record<string, unknown>>;
  }>;
}

/** Wallet Standard registry global */
interface WalletStandardWindow {
  wallets?: ReadonlyArray<WalletStandardWallet>;
  on?(callback: (wallets: ReadonlyArray<WalletStandardWallet>) => void): void;
}

declare global {
  interface Window {
    walletStandard?: WalletStandardWindow;
  }
}

/** Bitcoin feature namespaces recognized by the Wallet Standard */
const BITCOIN_FEATURES = [
  'bitcoin:connect',
  'bitcoin:signMessage',
  'bitcoin:signTransaction',
  'bitcoin:sendTransfer',
  'bitcoin:signPsbt',
  'bitcoin:sendBitcoin',
  'bitcoin:switchNetwork',
] as const;

type BitcoinFeatureNamespace = (typeof BITCOIN_FEATURES)[number];

/**
 * Wallet Standard connector for Bitcoin.
 *
 * Auto-discovers any wallet that implements the Wallet Standard interface
 * with Bitcoin feature support. Uses `window.walletStandard` for discovery.
 *
 * This is the most universal connector — any wallet implementing the
 * Wallet Standard protocol for Bitcoin chains will be detected and
 * usable through this connector.
 *
 * @see https://wallet-standard.com/
 *
 * @example
 * ```ts
 * const ws = new WalletStandardConnector();
 * const wallets = ws.getAvailableWallets();
 * console.log(wallets.map(w => w.name));
 *
 * if (wallets.length > 0) {
 *   const result = await ws.connect();
 *   console.log(result.accounts);
 * }
 * ```
 */
export class WalletStandardConnector implements BitcoinConnector {
  readonly id = 'wallet-standard';
  readonly name = 'Wallet Standard';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">W</text></svg>';
  readonly platforms: BitcoinPlatform[] = ['browser', 'mobile', 'extension'];
  readonly supportedFeatures: BitcoinFeature[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signTransaction',
    'bitcoin:sendTransfer',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _selectedWallet: WalletStandardWallet | null = null;
  private _connectedAccounts: string[] = [];

  // ─── Discovery ───────────────────────────────────────────────────

  /**
   * Get all wallets registered with the Wallet Standard that support Bitcoin.
   *
   * A wallet is considered Bitcoin-compatible if its `chains` array
   * includes a Bitcoin chain identifier (e.g. "bitcoin:mainnet").
   */
  getAvailableWallets(): WalletStandardWallet[] {
    if (typeof window === 'undefined') return [];

    const std = (window as Window).walletStandard;
    if (!std?.wallets) return [];

    return Array.from(std.wallets).filter((wallet) =>
      wallet.chains.some((chain) => chain.startsWith('bitcoin:'))
    );
  }

  /**
   * Check whether any Bitcoin-capable Wallet Standard wallet is available.
   */
  isAvailable(): boolean {
    return this.getAvailableWallets().length > 0;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async connect(params?: { accounts?: string[] }): Promise<BitcoinConnectionResult> {
    const wallets = this.getAvailableWallets();

    if (wallets.length === 0) {
      throw new Error(
        'No Bitcoin wallets found via Wallet Standard. Install a compatible wallet.'
      );
    }

    // Select the first available wallet; UI integrations can customize this
    this._selectedWallet = wallets[0];

    // Use the bitcoin:connect feature if available
    const connectFeature = this._selectedWallet.features['bitcoin:connect'] as
      | { connect: (params?: { accounts?: string[] }) => Promise<{ accounts: string[] }> }
      | undefined;

    let accounts: string[];

    if (connectFeature?.connect) {
      const result = await connectFeature.connect(params);
      accounts = result.accounts;
    } else {
      // Fallback: use account list from wallet state
      accounts = this._selectedWallet.accounts
        .filter((a) => a.chains.some((c) => c.startsWith('bitcoin:')))
        .map((a) => a.address);

      if (accounts.length === 0) {
        throw new Error(
          `Wallet "${this._selectedWallet.name}" has no Bitcoin accounts. ` +
            `It may require interactive connection.`
        );
      }
    }

    this._connectedAccounts = accounts;

    this._bindWalletEvents();

    return {
      accounts: this._connectedAccounts,
      network: this._inferNetwork(),
    };
  }

  async disconnect(): Promise<void> {
    this._selectedWallet = null;
    this._connectedAccounts = [];
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── RPC ─────────────────────────────────────────────────────────

  async request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T> {
    const wallet = this._getWalletOrThrow();

    // Wallet Standard doesn't have a generic request;
    // dispatch to feature-specific implementations
    const feature = wallet.features[`bitcoin:${args.method}`] as
      | { [key: string]: (...args: unknown[]) => Promise<unknown> }
      | undefined;

    if (!feature || typeof feature[args.method] !== 'function') {
      throw new Error(`Wallet "${wallet.name}" does not support method "${args.method}"`);
    }

    return (feature[args.method] as (...a: unknown[]) => Promise<T>)(
      ...(args.params ?? [])
    );
  }

  async getAccounts(): Promise<string[]> {
    if (this._connectedAccounts.length === 0) {
      // Try to read from wallet state
      const wallet = this._getWalletOrThrow();
      return wallet.accounts
        .filter((a) => a.chains.some((c) => c.startsWith('bitcoin:')))
        .map((a) => a.address);
    }
    return this._connectedAccounts;
  }

  async getNetwork(): Promise<string> {
    return this._inferNetwork();
  }

  async switchNetwork(_network: string): Promise<void> {
    throw new Error(
      'Wallet Standard does not support programmatic network switching for Bitcoin. ' +
        'Reconnect to a wallet configured for the desired network.'
    );
  }

  // ─── Bitcoin-native methods ─────────────────────────────────────

  async signMessage(params: {
    message: string;
    address: string;
  }): Promise<{ signature: string }> {
    const wallet = this._getWalletOrThrow();

    const feature = wallet.features['bitcoin:signMessage'] as
      | {
          signMessage: (params: { message: string; address: string }) => Promise<{
            signature: string;
          }>;
        }
      | undefined;

    if (!feature?.signMessage) {
      throw new Error(
        `Wallet "${wallet.name}" does not support bitcoin:signMessage`
      );
    }

    return feature.signMessage(params);
  }

  async signPsbt(params: {
    psbt: string;
    signInputs?: Record<number, number[]>;
  }): Promise<{ psbt: string }> {
    const wallet = this._getWalletOrThrow();

    // Try signTransaction first (generic), then signPsbt (specific)
    const signTxFeature = wallet.features['bitcoin:signTransaction'] as
      | {
          signTransaction: (params: {
            psbt: string;
            signInputs?: Record<number, number[]>;
          }) => Promise<{ psbt: string }>;
        }
      | undefined;

    if (signTxFeature?.signTransaction) {
      return signTxFeature.signTransaction(params);
    }

    const signPsbtFeature = wallet.features['bitcoin:signPsbt'] as
      | {
          signPsbt: (params: {
            psbt: string;
            signInputs?: Record<number, number[]>;
          }) => Promise<{ psbt: string }>;
        }
      | undefined;

    if (signPsbtFeature?.signPsbt) {
      return signPsbtFeature.signPsbt(params);
    }

    throw new Error(
      `Wallet "${wallet.name}" does not support bitcoin:signTransaction or bitcoin:signPsbt`
    );
  }

  async sendTransfer(params: {
    recipient: string;
    amount: number;
    feeRate?: number;
  }): Promise<{ txid: string }> {
    const wallet = this._getWalletOrThrow();

    const feature = wallet.features['bitcoin:sendTransfer'] as
      | {
          sendTransfer: (params: {
            recipient: string;
            amount: number;
            feeRate?: number;
          }) => Promise<{ txid: string }>;
        }
      | undefined;

    if (!feature?.sendTransfer) {
      throw new Error(
        `Wallet "${wallet.name}" does not support bitcoin:sendTransfer`
      );
    }

    return feature.sendTransfer(params);
  }

  // ─── Events ──────────────────────────────────────────────────────

  on<E extends keyof BitcoinConnectorEvents>(
    event: E,
    handler: BitcoinConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event)!.add(handler);
  }

  off<E extends keyof BitcoinConnectorEvents>(
    event: E,
    handler: BitcoinConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._handlers.get(event)?.delete(handler);
  }

  // ─── Internal ────────────────────────────────────────────────────

  private _getWalletOrThrow(): WalletStandardWallet {
    if (!this._selectedWallet) {
      throw new Error('No wallet selected. Call connect() first.');
    }
    return this._selectedWallet;
  }

  private _inferNetwork(): string {
    if (!this._selectedWallet) return 'mainnet';

    for (const chain of this._selectedWallet.chains) {
      if (chain.startsWith('bitcoin:')) {
        return chain.replace('bitcoin:', '');
      }
    }
    return 'mainnet';
  }

  private _bindWalletEvents(): void {
    if (typeof window === 'undefined') return;

    const std = (window as Window).walletStandard;
    if (!std) return;

    // Listen for wallet accounts changed events
    if (this._selectedWallet && 'on' in this._selectedWallet) {
      // Wallet Standard wallets may emit account changes
    }

    // Fallback: listen to registry changes
    std.on?.((wallets: ReadonlyArray<WalletStandardWallet>) => {
      const btcWallets = wallets.filter((w) =>
        w.chains.some((c) => c.startsWith('bitcoin:'))
      );
      if (btcWallets.length === 0 && this._selectedWallet) {
        // Previously connected wallet disappeared
        const handlers = this._handlers.get('disconnect') ?? new Set();
        for (const handler of handlers) {
          handler(new Error('Wallet removed from registry'));
        }
      }
    });
  }
}
