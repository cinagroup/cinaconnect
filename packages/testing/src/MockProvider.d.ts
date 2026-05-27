/**
 * MockProvider — Full EIP-1193 mock provider for testing.
 *
 * Supports configurable responses (success, error, delay), event emission,
 * chain switching, and account management.
 */
export type RpcMethod = string;
export type RpcParams = unknown[] | Record<string, unknown>;
export type RpcResponse = unknown;
export interface MockResponseConfig {
    /** Resolve with this value */
    result?: RpcResponse;
    /** Or reject with this error */
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
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
    connect: {
        chainId: string;
    };
    disconnect: {
        code: number;
        message: string;
    };
    chainChanged: string;
    accountsChanged: string[];
    message: {
        type: string;
        data: unknown;
    };
}
export type ProviderEventListener<K extends keyof ProviderEventMap> = (payload: ProviderEventMap[K]) => void;
export declare class MockProvider {
    /** EIP-1193: isMetaMask flag */
    readonly isMetaMask = true;
    /** EIP-1193: isCinacoin mock flag */
    readonly isCinacoin = true;
    private _accounts;
    private _chainId;
    private _defaultResponse;
    private _responses;
    private _listeners;
    private _callLog;
    private _autoEmit;
    constructor(opts?: MockProviderOptions);
    /** Current accounts (hex addresses) */
    get accounts(): readonly string[];
    /** Current chainId (hex) */
    get chainId(): string;
    /** Full call history */
    get callLog(): ReadonlyArray<{
        method: string;
        params: RpcParams;
        ts: number;
    }>;
    /** Set accounts and optionally emit accountsChanged */
    setAccounts(accounts: string[], emit?: boolean): void;
    /** Set chainId and optionally emit chainChanged */
    setChainId(chainId: string, emit?: boolean): void;
    /** Configure a response for a specific RPC method */
    mock(method: string, config: MockResponseConfig): void;
    /** Remove a mock for a specific method (falls back to default) */
    unmock(method: string): void;
    /** Clear all mocks */
    clearMocks(): void;
    /** Reset call log */
    resetCallLog(): void;
    /** Full reset: accounts, chainId, mocks, call log */
    reset(opts?: MockProviderOptions): void;
    /**
     * EIP-1193 `request` method.
     * Logs every call and returns a configured or default response.
     */
    request(args: {
        method: string;
        params?: RpcParams;
    }): Promise<RpcResponse>;
    on<K extends keyof ProviderEventMap>(event: K, listener: ProviderEventListener<K>): void;
    removeListener<K extends keyof ProviderEventMap>(event: K, listener: ProviderEventListener<K>): void;
    once<K extends keyof ProviderEventMap>(event: K, listener: ProviderEventListener<K>): void;
    emit<K extends keyof ProviderEventMap>(event: K, payload: ProviderEventMap[K]): boolean;
    removeAllListeners(): void;
    private _handleBuiltin;
    private _sleep;
}
//# sourceMappingURL=MockProvider.d.ts.map