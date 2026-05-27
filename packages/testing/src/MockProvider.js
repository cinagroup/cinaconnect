/**
 * MockProvider — Full EIP-1193 mock provider for testing.
 *
 * Supports configurable responses (success, error, delay), event emission,
 * chain switching, and account management.
 */
// ── MockProvider ────────────────────────────────────────────────────────────
export class MockProvider {
    constructor(opts) {
        /** EIP-1193: isMetaMask flag */
        this.isMetaMask = true;
        /** EIP-1193: isCinacoin mock flag */
        this.isCinacoin = true;
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
    get accounts() {
        return [...this._accounts];
    }
    /** Current chainId (hex) */
    get chainId() {
        return this._chainId;
    }
    /** Full call history */
    get callLog() {
        return [...this._callLog];
    }
    /** Set accounts and optionally emit accountsChanged */
    setAccounts(accounts, emit = true) {
        this._accounts = [...accounts];
        if (emit && this._autoEmit) {
            this.emit("accountsChanged", this._accounts);
        }
    }
    /** Set chainId and optionally emit chainChanged */
    setChainId(chainId, emit = true) {
        this._chainId = chainId;
        if (emit && this._autoEmit) {
            this.emit("chainChanged", chainId);
        }
    }
    /** Configure a response for a specific RPC method */
    mock(method, config) {
        this._responses.set(method, config);
    }
    /** Remove a mock for a specific method (falls back to default) */
    unmock(method) {
        this._responses.delete(method);
    }
    /** Clear all mocks */
    clearMocks() {
        this._responses.clear();
    }
    /** Reset call log */
    resetCallLog() {
        this._callLog = [];
    }
    /** Full reset: accounts, chainId, mocks, call log */
    reset(opts) {
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
    async request(args) {
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
            const err = new Error(cfg.error.message);
            err.code = cfg.error.code;
            err.data = cfg.error.data;
            throw err;
        }
        return cfg.result ?? null;
    }
    // ── EIP-1193: Events ───────────────────────────────────────────────────
    on(event, listener) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(listener);
    }
    removeListener(event, listener) {
        this._listeners.get(event)?.delete(listener);
    }
    once(event, listener) {
        const onceFn = (payload) => {
            this.removeListener(event, onceFn);
            listener(payload);
        };
        this.on(event, onceFn);
    }
    emit(event, payload) {
        const set = this._listeners.get(event);
        if (!set || set.size === 0)
            return false;
        for (const fn of set) {
            fn(payload);
        }
        return true;
    }
    removeAllListeners() {
        this._listeners.clear();
    }
    // ── Private helpers ────────────────────────────────────────────────────
    _handleBuiltin(method, params) {
        switch (method) {
            case "eth_accounts":
                return [...this._accounts];
            case "eth_chainId":
                return this._chainId;
            case "eth_sendTransaction": {
                const tx = params;
                return (tx?.hash ??
                    "0x0000000000000000000000000000000000000000000000000000000000000001");
            }
            case "eth_signTypedData_v4":
            case "eth_signTypedData":
                return ("0x" +
                    "a".repeat(130) // 65-byte signature
                );
            case "personal_sign":
                return ("0x" +
                    "b".repeat(130));
            case "wallet_switchEthereumChain": {
                const p = params?.[0];
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
    _sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }
}
//# sourceMappingURL=MockProvider.js.map