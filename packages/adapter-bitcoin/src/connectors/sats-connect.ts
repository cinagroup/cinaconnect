import type {
  BitcoinConnector,
  BitcoinPlatform,
  BitcoinFeature,
  BitcoinConnectionResult,
  BitcoinConnectorEvents,
} from '../types';

// Re-export sats-connect types so consumers don't need to install the package separately
export type {
  AddressPurpose,
  RpcError,
  RpcMethod,
  GetAddressResponse,
  SignMessageResponse,
  SignTransactionResponse,
  SendTransferResponse,
} from '@sats-connect/core';

/**
 * SatsConnect connector.
 *
 * Uses the `@sats-connect/core` SDK to connect to multiple Bitcoin wallets
 * through a unified interface. SatsConnect acts as an abstraction layer over
 * wallets like Xverse, Oyl, Leather, and others that implement the sats-connect protocol.
 *
 * @see https://github.com/secretkeylabs/sats-connect
 *
 * @example
 * ```ts
 * import { SatsConnectConnector } from '@cinacoin/adapter-bitcoin';
 *
 * const connector = new SatsConnectConnector();
 * if (connector.isAvailable()) {
 *   const result = await connector.connect();
 *   console.log(result.accounts);
 * }
 * ```
 */
export class SatsConnectConnector implements BitcoinConnector {
  readonly id = 'sats-connect';
  readonly name = 'SatsConnect';
  readonly icon =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23FF9500"/><text x="16" y="22" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif" font-weight="bold">S</text></svg>';
  readonly platforms: BitcoinPlatform[] = ['browser', 'mobile', 'extension'];
  readonly supportedFeatures: BitcoinFeature[] = [
    'bitcoin:connect',
    'bitcoin:signMessage',
    'bitcoin:signTransaction',
    'bitcoin:sendTransfer',
  ];

  private _handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _connectedAccounts: string[] = [];
  private _network: string = 'mainnet';

  // ─── Availability ────────────────────────────────────────────────

  isAvailable(): boolean {
    // SatsConnect uses postMessage-based communication,
    // so it's always "available" in a browser context.
    return typeof window !== 'undefined';
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async connect(params?: { accounts?: string[] }): Promise<BitcoinConnectionResult> {
    const { getAddress, AddressPurpose } = await import('@sats-connect/core');

    // Request Bitcoin address(es) from the sats-connect protocol
    const result = await getAddress({
      paymentType: 'P2WPKH' as any, // Native segwit
      purposes: [AddressPurpose.Payment],
      message: 'Connect to application',
    });

    if (!result.address || !result.addresses || result.addresses.length === 0) {
      throw new Error('No addresses returned from SatsConnect wallet');
    }

    const addresses = result.addresses
      .filter((a: any) => a.purpose === 'payment')
      .map((a: any) => a.address);

    this._connectedAccounts = addresses.length > 0 ? addresses : [result.address];
    this._network = result.addresses?.[0]?.publicKey ? 'mainnet' : 'mainnet';

    this._bindGlobalEvents();

    return {
      accounts: this._connectedAccounts,
      network: this._network,
    };
  }

  async disconnect(): Promise<void> {
    this._connectedAccounts = [];
    const handlers = this._handlers.get('disconnect') ?? new Set();
    for (const handler of handlers) {
      handler();
    }
  }

  // ─── RPC ─────────────────────────────────────────────────────────

  async request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T> {
    const { makeRPC } = await import('@sats-connect/core');

    // SatsConnect uses a postMessage-based RPC system
    // This is a simplified wrapper — production use should implement
    // a proper wallet picker to select which wallet to route to
    throw new Error(
      `SatsConnect direct RPC not yet implemented for method: ${args.method}. ` +
        `Use the typed methods (signMessage, signTransaction, sendTransfer) instead.`
    );
  }

  async getAccounts(): Promise<string[]> {
    if (this._connectedAccounts.length === 0) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this._connectedAccounts;
  }

  async getNetwork(): Promise<string> {
    return this._network;
  }

  async switchNetwork(network: string): Promise<void> {
    // SatsConnect wallet selection happens at connect time;
    // network is determined by the selected wallet.
    throw new Error(
      `SatsConnect does not support programmatic network switching. ` +
        `Reconnect with a wallet configured for "${network}".`
    );
  }

  // ─── Bitcoin-native methods ─────────────────────────────────────

  async signMessage(params: {
    message: string;
    address: string;
  }): Promise<{ signature: string }> {
    const { signMessage } = await import('@sats-connect/core');

    const result = await signMessage({
      address: params.address,
      message: params.message,
    });

    if (!result.signature) {
      throw new Error('SatsConnect signMessage returned no signature');
    }

    return { signature: result.signature };
  }

  async signPsbt(params: {
    psbt: string;
    signInputs?: Record<number, number[]>;
  }): Promise<{ psbt: string }> {
    const { signTransaction } = await import('@sats-connect/core');

    // signPsbt maps to signTransaction in sats-connect
    const result = await signTransaction({
      psbt: params.psbt,
      broadcast: false,
    });

    if (!result.psbt) {
      throw new Error('SatsConnect signTransaction returned no PSBT');
    }

    return { psbt: result.psbt };
  }

  async sendTransfer(params: {
    recipient: string;
    amount: number;
    feeRate?: number;
  }): Promise<{ txid: string }> {
    const { sendTransfer } = await import('@sats-connect/core');

    const result = await sendTransfer({
      recipient: params.recipient,
      amount: params.amount,
      feeRate: params.feeRate,
    });

    if (!result.txid) {
      throw new Error('SatsConnect sendTransfer returned no txid');
    }

    return { txid: result.txid };
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

  /**
   * Bind to sats-connect global events.
   *
   * SatsConnect uses postMessage, so we listen on window for relevant events.
   */
  private _bindGlobalEvents(): void {
    if (typeof window === 'undefined') return;

    // Listen for wallet disconnect events from sats-connect
    window.addEventListener('message', (event: MessageEvent) => {
      // SatsConnect events are namespaced; filter relevant ones
      if (typeof event.data === 'object' && event.data !== null) {
        const { type } = event.data;
        if (type === 'bitcoin_disconnected' || type === 'wallet_disconnected') {
          const handlers = this._handlers.get('disconnect') ?? new Set();
          for (const handler of handlers) {
            handler(new Error('Wallet disconnected'));
          }
        }
      }
    });
  }
}
