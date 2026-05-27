/**
 * FarcasterProvider adapts Farcaster Mini App context to a wallet provider interface.
 *
 * It extracts user data from the Farcaster context and provides EIP-1193-compatible
 * request handling for wallet operations within Farcaster Mini Apps.
 */
export class FarcasterProvider {
    constructor(config) {
        /** Farcaster context (may be mocked). */
        this._context = null;
        /** Whether the provider is ready. */
        this._ready = false;
        /** Currently connected wallet address. */
        this._account = null;
        /** Event listeners. */
        this._listeners = new Map();
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
    async init() {
        if (!this._context) {
            return null;
        }
        try {
            this._ready = true;
            return this._context;
        }
        catch {
            return null;
        }
    }
    /** Get the Farcaster context. */
    get context() {
        return this._context;
    }
    /** Get the Farcaster user. */
    get user() {
        return this._context?.user ?? null;
    }
    /** Get the current account address. */
    get account() {
        return this._account;
    }
    /** Get the current chain ID. */
    get chainId() {
        return this._chainId;
    }
    /** Check if the provider is running inside Farcaster. */
    get isInFarcaster() {
        return this._context !== null && this._context.isInFarcaster;
    }
    /** Check if the provider is ready. */
    get isReady() {
        return this._ready;
    }
    /** Set the wallet account address. */
    setAccount(address) {
        const prev = this._account;
        this._account = address;
        if (prev !== address) {
            this._emit('accountsChanged', [address]);
        }
    }
    /** Switch the active chain. */
    switchChain(chainId) {
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
    getSupportedChains() {
        return [...this._chains];
    }
    /** EIP-1193 compatible request handler. */
    async request(args) {
        const { method, params } = args;
        switch (method) {
            case 'eth_requestAccounts':
                return this._handleRequestAccounts();
            case 'eth_accounts':
                return this._handleAccounts();
            case 'eth_chainId':
                return `0x${this._chainId.toString(16)}`;
            case 'wallet_switchEthereumChain': {
                const chain = params?.[0]?.chainId;
                if (!chain)
                    throw new Error('Missing chainId');
                this.switchChain(parseInt(chain, 16));
                return null;
            }
            default:
                throw new Error(`Method ${method} not supported by FarcasterProvider`);
        }
    }
    /** Register an event listener. */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }
    /** Remove an event listener. */
    off(event, callback) {
        this._listeners.get(event)?.delete(callback);
    }
    // --- Private ---
    _detectFarcaster() {
        // Check for Farcaster context in browser
        if (typeof window !== 'undefined') {
            const fc = window.farcaster;
            if (fc?.context) {
                return fc.context;
            }
        }
        return null;
    }
    _handleRequestAccounts() {
        if (!this._account) {
            throw new Error('No wallet connected. Use setAccount() first.');
        }
        return Promise.resolve([this._account]);
    }
    _handleAccounts() {
        return Promise.resolve(this._account ? [this._account] : []);
    }
    _emit(event, args) {
        this._listeners.get(event)?.forEach((cb) => {
            try {
                cb(...args);
            }
            catch { /* ignore */ }
        });
    }
}
//# sourceMappingURL=FarcasterProvider.js.map