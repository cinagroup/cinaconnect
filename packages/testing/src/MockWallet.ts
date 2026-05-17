/**
 * MockWallet — Simulated wallet connector for testing.
 *
 * Mimics the lifecycle of a wallet connector (connect, disconnect, switch chain)
 * without requiring a real browser extension or WalletConnect session.
 */

import { MockProvider } from "./MockProvider.js.js";

export interface WalletState {
  connected: boolean;
  accounts: string[];
  chainId: string;
  connectorId: string;
}

export interface MockWalletOptions {
  connectorId?: string;
  accounts?: string[];
  chainId?: string;
  /** Simulated connection delay in ms */
  connectDelay?: number;
  /** Simulated disconnection delay in ms */
  disconnectDelay?: number;
  /** Whether connect() should throw */
  connectError?: Error | null;
  /** Whether disconnect() should throw */
  disconnectError?: Error | null;
}

export class MockWallet {
  private _provider: MockProvider;
  private _connectorId: string;
  private _connected = false;
  private _connectDelay: number;
  private _disconnectDelay: number;
  private _connectError: Error | null;
  private _disconnectError: Error | null;

  constructor(opts?: MockWalletOptions) {
    this._connectorId = opts?.connectorId ?? "mock";
    this._connectDelay = opts?.connectDelay ?? 0;
    this._disconnectDelay = opts?.disconnectDelay ?? 0;
    this._connectError = opts?.connectError ?? null;
    this._disconnectError = opts?.disconnectError ?? null;
    this._provider = new MockProvider({
      accounts: opts?.accounts,
      chainId: opts?.chainId,
    });
  }

  /** The underlying mock provider */
  get provider(): MockProvider {
    return this._provider;
  }

  /** Current wallet state snapshot */
  get state(): WalletState {
    return {
      connected: this._connected,
      accounts: [...this._provider.accounts],
      chainId: this._provider.chainId,
      connectorId: this._connectorId,
    };
  }

  /** Whether the wallet is connected */
  get isConnected(): boolean {
    return this._connected;
  }

  /** Simulate connecting the wallet */
  async connect(): Promise<WalletState> {
    if (this._connectDelay > 0) {
      await new Promise((r) => setTimeout(r, this._connectDelay));
    }
    if (this._connectError) {
      throw this._connectError;
    }
    this._connected = true;
    return this.state;
  }

  /** Simulate disconnecting the wallet */
  async disconnect(): Promise<void> {
    if (this._disconnectDelay > 0) {
      await new Promise((r) => setTimeout(r, this._disconnectDelay));
    }
    if (this._disconnectError) {
      throw this._disconnectError;
    }
    this._connected = false;
  }

  /** Switch to a different chain */
  async switchChain(chainId: string): Promise<void> {
    if (!this._connected) {
      throw new Error("Wallet not connected");
    }
    this._provider.setChainId(chainId);
  }

  /** Reset the wallet to initial state */
  reset(opts?: MockWalletOptions): void {
    this._connected = false;
    this._provider.reset(opts);
    if (opts?.connectDelay !== undefined) this._connectDelay = opts.connectDelay;
    if (opts?.disconnectDelay !== undefined) this._disconnectDelay = opts.disconnectDelay;
    this._connectError = opts?.connectError ?? null;
    this._disconnectError = opts?.disconnectError ?? null;
    if (opts?.connectorId) this._connectorId = opts.connectorId;
  }

  /** Convenience: get EIP-1193 events from the provider */
  on = this._provider.on.bind(this._provider);
  removeListener = this._provider.removeListener.bind(this._provider);
  once = this._provider.once.bind(this._provider);
}
