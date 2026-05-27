/**
 * Farcaster Mini App provider.
 *
 * Adapts the Farcaster Mini App environment to the EIP-1193 provider interface,
 * enabling wallet operations inside Farcaster Mini Apps with Sign-In with Farcaster support.
 *
 * @packageDocumentation
 */
import type {
  FarcasterProviderConfig,
  FarcasterContext,
  FarcasterUser,
  FarcasterWalletState,
} from './types.js';

/**
 * Minimal Farcaster Mini App SDK interface.
 */
interface FarcasterContextSDK {
  user: FarcasterUser | null;
  client: { fid: number } | null;
  isReady: boolean;
}

/**
 * FarcasterProvider adapts Farcaster Mini App context to a wallet provider interface.
 *
 * It extracts user data from the Farcaster context and provides EIP-1193-compatible
 * request handling for wallet operations within Farcaster Mini Apps.
 */
export class FarcasterProvider {
  /** Farcaster context (may be mocked). */
  private _context: FarcasterContext | null = null;

  /** Whether the provider is ready. */
  private _ready = false;

  /** Currently connected wallet address. */
  private _account: `0x${string}` | null = null;

  /** Current chain ID. */
  private _chainId: number;

  /** Event listeners. */
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /** Supported chains. */
  private readonly _chains: number[];

  /** App name. */
  readonly appName: string;

  constructor(config?: FarcasterProviderConfig) {
    this._chains = config?.chains ?? [1, 10, 8453];
    this.appName = config?.appName ?? 'Cinacoin App';
    this._chainId = config?.chains?.[0] ?? 1;
    this._context = config?.contextOverride ?? this._detectFarcaster();
  }

  /**
   * Initialize the provider.
   *
   * @returns FarcasterContext if running inside Farcaster, null otherwise.
   */
  async init(): Promise<FarcasterContext | null> {
    if (!this._context) {
      return null;
    }

    try {
      this._ready = true;
      return this._context;
    } catch {
      return null;
    }
  }

  /** Get the Farcaster context. */
  get context(): FarcasterContext | null {
    return this._context;
  }

  /** Get the Farcaster user. */
  get user(): FarcasterUser | null {
    return this._context?.user ?? null;
  }

  /** Get the current account address. */
  get account(): `0x${string}` | null {
    return this._account;
  }

  /** Get the current chain ID. */
  get chainId(): number {
    return this._chainId;
  }

  /** Check if the provider is running inside Farcaster. */
  get isInFarcaster(): boolean {
    return this._context !== null && this._context.isInFarcaster;
  }

  /** Check if the provider is ready. */
  get isReady(): boolean {
    return this._ready;
  }

  /** Set the wallet account address. */
  setAccount(address: `0x${string}`): void {
    const prev = this._account;
    this._account = address;
    if (prev !== address) {
      this._emit('accountsChanged', [address]);
    }
  }

  /** Switch the active chain. */
  switchChain(chainId: number): void {
    if (!this._chains.includes(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }
    const prev = this._chainId;
    this._chainId = chainId;
    if (prev !== chainId) {
      this._emit('chainChanged', [chainId]);
    }
  }

  /** Get supported chains. */
  getSupportedChains(): number[] {
    return [...this._chains];
  }

  /** EIP-1193 compatible request handler. */
  async request(args: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    const { method, params } = args;

    switch (method) {
      case 'eth_requestAccounts':
        return this._handleRequestAccounts();
      case 'eth_accounts':
        return this._handleAccounts();
      case 'eth_chainId':
        return `0x${this._chainId.toString(16)}`;
      case 'wallet_switchEthereumChain': {
        const chain = (params?.[0] as { chainId: string })?.chainId;
        if (!chain) throw new Error('Missing chainId');
        this.switchChain(parseInt(chain, 16));
        return null;
      }
      default:
        throw new Error(`Method ${method} not supported by FarcasterProvider`);
    }
  }

  /** Register an event listener. */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
  }

  /** Remove an event listener. */
  off(event: string, callback: (...args: unknown[]) => void): void {
    this._listeners.get(event)?.delete(callback);
  }

  // --- Private ---

  private _detectFarcaster(): FarcasterContext | null {
    // Check for Farcaster context in browser
    if (typeof window !== 'undefined') {
      const fc = (window as any).farcaster;
      if (fc?.context) {
        return fc.context;
      }
    }
    return null;
  }

  private _handleRequestAccounts(): Promise<string[]> {
    if (!this._account) {
      throw new Error('No wallet connected. Use setAccount() first.');
    }
    return Promise.resolve([this._account]);
  }

  private _handleAccounts(): Promise<string[]> {
    return Promise.resolve(this._account ? [this._account] : []);
  }

  private _emit(event: string, args: unknown[]): void {
    this._listeners.get(event)?.forEach((cb) => {
      try { cb(...args); } catch { /* ignore */ }
    });
  }
}
