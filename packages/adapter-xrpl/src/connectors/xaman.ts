import type {
  XrplConnector,
  XrplPlatform,
  XrplFeature,
  XrplConnectionResult,
  XrplConnectorEvents,
  XrplProvider,
  XrplNetwork,
  XrpSendParams,
  AccountSettingsParams,
  TrustLineParams,
  NftMintParams,
  NftBurnParams,
} from '../types';

/**
 * Shape of the Xaman (formerly Xumm) provider.
 *
 * Xaman is the primary XRPL mobile/desktop wallet.
 * It uses a payload-based signing flow via SDK or deep links.
 *
 * @see https://xaman.app/
 */
interface XamanProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    xaman?: XamanProvider;
    xumm?: XamanProvider; // legacy name
  }
}

/**
 * Xaman (formerly Xumm) wallet connector for the XRP Ledger.
 *
 * Detects `window.xaman` (or legacy `window.xumm`) and wraps it with
 * the standard {@link XrplConnector} interface.
 *
 * Xaman uses a payload-based flow: you submit a transaction payload,
 * the user approves it in the wallet, and you receive the signed result.
 *
 * @see https://xaman.app/
 *
 * @example
 * ```ts
 * const xaman = new XamanConnector();
 * if (xaman.isAvailable()) {
 *   const result = await xaman.connect();
 *   console.log(result.accounts); // ["rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH"]
 * }
 * ```
 */
export class XamanConnector implements XrplConnector {
  readonly id = 'xaman';
  readonly name = 'Xaman Wallet';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">X</text></svg>';
  readonly platforms: XrplPlatform[] = ['browser', 'mobile', 'extension'];
  readonly supportedFeatures: XrplFeature[] = [
    'xrpl:connect',
    'xrpl:signTransaction',
    'xrpl:sendXRP',
    'xrpl:getBalance',
    'xrpl:accountSettings',
    'xrpl:trustLine',
    'xrpl:nftMint',
    'xrpl:nftBurn',
    'xrpl:signMessage',
    'xrpl:switchNetwork',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _provider: XamanProvider | null = null;

  constructor() {
    this._captureProvider();
  }

  // ─── Availability ────────────────────────────────────────────────

  isAvailable(): boolean {
    this._captureProvider();
    return this._provider !== null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async connect(params?: { network?: XrplNetwork }): Promise<XrplConnectionResult> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'connect',
      params: { network: params?.network ?? 'mainnet' },
    })) as { account: { address: string }; network: XrplNetwork };

    this._bindProviderEvents(provider);

    return {
      accounts: [result.account.address],
      network: result.network,
      provider: provider as XrplProvider,
    };
  }

  async disconnect(): Promise<void> {
    const provider = this._provider;
    if (provider) {
      try {
        await provider.request({ method: 'disconnect' });
      } catch (err) { console.warn('[xaman] Operation failed:', err instanceof Error ? err.message : String(err));
        // Xaman may not support programmatic disconnect
      }
    }
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── RPC ─────────────────────────────────────────────────────────

  async request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T> {
    const provider = this._getProviderOrThrow();
    return provider.request(args) as Promise<T>;
  }

  async getAccounts(): Promise<string[]> {
    const provider = this._getProviderOrThrow();
    const result = (await provider.request({
      method: 'getAccount',
    })) as { address: string };
    return [result.address];
  }

  async getNetwork(): Promise<XrplNetwork> {
    const provider = this._getProviderOrThrow();
    const result = (await provider.request({
      method: 'getNetwork',
    })) as { network: XrplNetwork };
    return result.network;
  }

  async switchNetwork(network: XrplNetwork): Promise<void> {
    const provider = this._getProviderOrThrow();
    await provider.request({
      method: 'switchNetwork',
      params: { network },
    });
  }

  // ─── XRPL-native methods ────────────────────────────────────────

  async signTransaction(params: {
    transaction: Record<string, unknown>;
  }): Promise<{ signedTransaction: Record<string, unknown>; txBlob: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'sign',
      params: {
        txjson: params.transaction,
      },
    })) as { signedTransaction: Record<string, unknown>; txBlob: string };

    return {
      signedTransaction: result.signedTransaction,
      txBlob: result.txBlob,
    };
  }

  async sendXRP(params: XrpSendParams): Promise<{ transactionHash: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'sendXRP',
      params: {
        destination: params.destination,
        amount: params.amount,
        destinationTag: params.destinationTag,
        memo: params.memo,
      },
    })) as { transactionHash: string };

    return { transactionHash: result.transactionHash };
  }

  async getBalance(address?: string): Promise<{ balance: string; unit: 'drops' }> {
    const provider = this._getProviderOrThrow();
    const account = address ?? (await this.getAccounts())[0];

    const result = (await provider.request({
      method: 'getBalance',
      params: { address: account },
    })) as { balance: string };

    return { balance: result.balance, unit: 'drops' };
  }

  async updateAccountSettings(params: AccountSettingsParams): Promise<{ transactionHash: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'accountSet',
      params: {
        requireDestTag: params.requireDestTag,
        requireAuth: params.requireAuth,
        disallowIncomingXrp: params.disallowIncomingXrp,
        domain: params.domain,
        emailHash: params.emailHash,
        regularKey: params.regularKey,
        transferFee: params.transferFee,
      },
    })) as { transactionHash: string };

    return { transactionHash: result.transactionHash };
  }

  async setTrustLine(params: TrustLineParams): Promise<{ transactionHash: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'trustSet',
      params: {
        counterparty: params.counterparty,
        currency: params.currency,
        limit: params.limit,
        qualityIn: params.qualityIn,
        qualityOut: params.qualityOut,
      },
    })) as { transactionHash: string };

    return { transactionHash: result.transactionHash };
  }

  async mintNFT(params: NftMintParams): Promise<{ nftId: string; transactionHash: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'nftMint',
      params: {
        tokenTaxon: params.tokenTaxon,
        uri: params.uri,
        transferFee: params.transferFee,
        flags: params.flags,
      },
    })) as { nftId: string; transactionHash: string };

    return { nftId: result.nftId, transactionHash: result.transactionHash };
  }

  async burnNFT(params: NftBurnParams): Promise<{ transactionHash: string }> {
    const provider = this._getProviderOrThrow();

    const result = (await provider.request({
      method: 'nftBurn',
      params: {
        nftId: params.nftId,
      },
    })) as { transactionHash: string };

    return { transactionHash: result.transactionHash };
  }

  // ─── Events ──────────────────────────────────────────────────────

  on<E extends keyof XrplConnectorEvents>(
    event: E,
    handler: XrplConnectorEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event)!.add(handler);
  }

  off<E extends keyof XrplConnectorEvents>(
    event: E,
    handler: XrplConnectorEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void {
    this._handlers.get(event)?.delete(handler);
  }

  // ─── Internal ────────────────────────────────────────────────────

  private _captureProvider(): void {
    if (this._provider) return;
    if (typeof window === 'undefined') return;

    const win = window as Window;
    if (win.xaman) {
      this._provider = win.xaman;
    } else if (win.xumm) {
      // Legacy Xumm name
      this._provider = win.xumm;
    }
  }

  private _getProviderOrThrow(): XamanProvider {
    this._captureProvider();
    if (!this._provider) {
      throw new Error(
        'Xaman Wallet not found. Install the Xaman app: https://xaman.app/'
      );
    }
    return this._provider;
  }

  private _bindProviderEvents(provider: XamanProvider): void {
    provider.on('accountChanged', (account: unknown) => {
      const handlers = this._handlers.get('accountsChanged') ?? new Set();
      for (const handler of handlers) {
        handler(account);
      }
    });

    provider.on('networkChanged', (network: unknown) => {
      const handlers = this._handlers.get('networkChanged') ?? new Set();
      for (const handler of handlers) {
        handler(network);
      }
    });

    provider.on('disconnect', (error: unknown) => {
      const handlers = this._handlers.get('disconnect') ?? new Set();
      for (const handler of handlers) {
        handler(error);
      }
    });
  }
}

/**
 * Announce the Xaman XRPL provider via EIP-6963 event.
 */
export function announceXamanEIP6963(): void {
  if (typeof window === 'undefined') return;

  const win = window as Window;
  if (!win.xaman && !win.xumm) return;

  const provider = win.xaman ?? win.xumm;

  const detail = {
    info: {
      uuid: crypto.randomUUID(),
      name: 'Xaman Wallet',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif" font-weight="bold">X</text></svg>',
      rdns: 'app.xaman',
    },
    provider: provider as unknown as import('../types').XrplProvider,
  };

  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail })
    );
  });

  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', { detail })
  );
}
