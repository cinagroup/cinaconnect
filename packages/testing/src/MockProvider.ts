/**
 * MockProvider — Full EIP-1193 mock provider for testing.
 *
 * Supports configurable responses (success, error, delay), event emission,
 * chain switching, and account management.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type RpcMethod = string;
export type RpcParams = unknown[] | Record<string, unknown>;
export type RpcResponse = unknown;

export interface MockResponseConfig {
  /** Resolve with this value */
  result?: RpcResponse;
  /** Or reject with this error */
  error?: { code: number; message: string; data?: unknown };
  /** Artificial delay in ms */
  delay?: number;
}

export interface MockProviderOptions {
  /** Pre-configured accounts */
  accounts?: string[];
  /** Initial chainId (hex string) */
  chainId?: string;
  /** Default response for unconfigured methods */
  defaultResponse?: MockResponseConfig;
  /** Per-method response map */
  responses?: Record<RpcMethod, MockResponseConfig>;
  /** Whether to emit events automatically */
  autoEmit?: boolean;
}

export interface ProviderEventMap {
  connect: { chainId: string };
  disconnect: { code: number; message: string };
  chainChanged: string; // hex chainId
  accountsChanged: string[];
  message: { type: string; data: unknown };
}

export type ProviderEventListener<K extends keyof ProviderEventMap> = (
  payload: ProviderEventMap[K]
) => void;

// ── MockProvider ────────────────────────────────────────────────────────────

export class MockProvider {
  /** EIP-1193: isMetaMask flag */
  public readonly isMetaMask = true;
  /** EIP-1193: isCinacoin mock flag */
  public readonly isCinacoin = true;

  private _accounts: string[];
  private _chainId: string;
  private _defaultResponse: MockResponseConfig;
  private _responses: Map<RpcMethod, MockResponseConfig>;
  private _listeners: Map<string, Set<ProviderEventListener<any>>>;
  private _callLog: Array<{ method: string; params: RpcParams; ts: number }>;
  private _autoEmit: boolean;

  constructor(opts?: MockProviderOptions) {
    this._accounts = opts?.accounts ?? [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
    ];
    this._chainId = opts?.chainId ?? "0x1";
    this._defaultResponse = opts?.defaultResponse ?? { result: null };
    this._responses = new Map(Object.entries(opts?.responses ?? {}));
    this._listeners = new Map();
    this._callLog = [];
    this._autoEmit = opts?.autoEmit ?? true;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Current accounts (hex addresses) */
  get accounts(): readonly string[] {
    return [...this._accounts];
  }

  /** Current chainId (hex) */
  get chainId(): string {
    return this._chainId;
  }

  /** Full call history */
  get callLog(): ReadonlyArray<{ method: string; params: RpcParams; ts: number }> {
    return [...this._callLog];
  }

  /** Set accounts and optionally emit accountsChanged */
  setAccounts(accounts: string[], emit = true): void {
    this._accounts = [...accounts];
    if (emit && this._autoEmit) {
      this.emit("accountsChanged", this._accounts);
    }
  }

  /** Set chainId and optionally emit chainChanged */
  setChainId(chainId: string, emit = true): void {
    this._chainId = chainId;
    if (emit && this._autoEmit) {
      this.emit("chainChanged", chainId);
    }
  }

  /** Configure a response for a specific RPC method */
  mock(method: string, config: MockResponseConfig): void {
    this._responses.set(method, config);
  }

  /** Remove a mock for a specific method (falls back to default) */
  unmock(method: string): void {
    this._responses.delete(method);
  }

  /** Clear all mocks */
  clearMocks(): void {
    this._responses.clear();
  }

  /** Reset call log */
  resetCallLog(): void {
    this._callLog = [];
  }

  /** Full reset: accounts, chainId, mocks, call log */
  reset(opts?: MockProviderOptions): void {
    this._accounts = opts?.accounts ?? [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
    ];
    this._chainId = opts?.chainId ?? "0x1";
    this._defaultResponse = opts?.defaultResponse ?? { result: null };
    this._responses.clear();
    if (opts?.responses) {
      this._responses = new Map(Object.entries(opts.responses));
    }
    this._callLog = [];
  }

  // ── EIP-1193: request ──────────────────────────────────────────────────

  /**
   * EIP-1193 `request` method.
   * Logs every call and returns a configured or default response.
   */
  async request(args: {
    method: string;
    params?: RpcParams;
  }): Promise<RpcResponse> {
    const { method, params = [] } = args;
    this._callLog.push({ method, params, ts: Date.now() });

    // Built-in method handlers
    const builtin = this._handleBuiltin(method, params);
    if (builtin !== undefined) {
      return builtin;
    }

    // Configured mock response
    const cfg = this._responses.get(method) ?? this._defaultResponse;

    if (cfg.delay) {
      await this._sleep(cfg.delay);
    }

    if (cfg.error) {
      const err = new Error(cfg.error.message) as Error & {
        code: number;
        data?: unknown;
      };
      err.code = cfg.error.code;
      err.data = cfg.error.data;
      throw err;
    }

    return cfg.result ?? null;
  }

  // ── EIP-1193: Events ───────────────────────────────────────────────────

  on<K extends keyof ProviderEventMap>(
    event: K,
    listener: ProviderEventListener<K>
  ): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener);
  }

  removeListener<K extends keyof ProviderEventMap>(
    event: K,
    listener: ProviderEventListener<K>
  ): void {
    this._listeners.get(event)?.delete(listener);
  }

  once<K extends keyof ProviderEventMap>(
    event: K,
    listener: ProviderEventListener<K>
  ): void {
    const onceFn: ProviderEventListener<K> = (payload) => {
      this.removeListener(event, onceFn);
      listener(payload);
    };
    this.on(event, onceFn);
  }

  emit<K extends keyof ProviderEventMap>(
    event: K,
    payload: ProviderEventMap[K]
  ): boolean {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const fn of set) {
      fn(payload);
    }
    return true;
  }

  removeAllListeners(): void {
    this._listeners.clear();
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private _handleBuiltin(method: string, params: RpcParams): unknown {
    switch (method) {
      case "eth_accounts":
        return [...this._accounts];

      case "eth_chainId":
        return this._chainId;

      case "eth_sendTransaction": {
        const tx = params as Record<string, unknown>;
        return (
          (tx as any)?.hash ??
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
      }

      case "eth_signTypedData_v4":
      case "eth_signTypedData":
        return (
          "0x" +
          "a".repeat(130) // 65-byte signature
        );

      case "personal_sign":
        return (
          "0x" +
          "b".repeat(130)
        );

      case "wallet_switchEthereumChain": {
        const p = (params as any)?.[0];
        if (p?.chainId) {
          this.setChainId(p.chainId);
        }
        return null;
      }

      case "wallet_addEthereumChain":
        return null;

      case "wallet_requestPermissions":
        return [
          {
            parentCapability: "eth_accounts",
            invoker: "https://example.com",
          },
        ];

      case "wallet_getPermissions":
        return [
          {
            parentCapability: "eth_accounts",
            invoker: "https://example.com",
          },
        ];

      case "net_version":
        return parseInt(this._chainId, 16).toString();

      default:
        return undefined; // fall through to configured mocks
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
