const DEFAULT_METHODS = [
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v4',
];
const DEFAULT_EVENTS = ['chainChanged', 'accountsChanged'];
/**
 * Full WalletConnect v2 connector using @cinacoin/core-sdk SignClient.
 *
 * Supports pairing via QR code URI, deep links, and direct session management.
 */
export class WalletConnectConnector {
    constructor(options) {
        this.id = 'walletconnect';
        this.name = 'WalletConnect';
        this.icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%233B99FC" d="M16.275 5.366a.64.64 0 0 0-.913-.022l-3.139 2.78-3.139-2.78a.64.64 0 0 0-.914.022.683.683 0 0 0 .022.944l3.565 3.158-3.565 3.157a.683.683 0 0 0-.022.944c.237.257.643.272.913.022l3.14-2.78 3.139 2.78c.27.25.676.235.913-.022a.683.683 0 0 0-.022-.944L12.69 11.466l3.564-3.157a.683.683 0 0 0 .022-.944z"/></svg>';
        this.type = 'walletconnect';
        /** Internal event handlers */
        this._handlers = new Map();
        /** WalletConnect SignClient instance */
        this._signClient = null;
        /** Active session topic */
        this._sessionTopic = null;
        /** Cached accounts */
        this._accounts = [];
        /** Cached chain ID */
        this._chainId = '0x1';
        /** Whether connected */
        this._connected = false;
        /** Last generated URI */
        this._uri = null;
        this._options = options;
    }
    // ─── Lifecycle ──────────────────────────────────────────────────
    /**
     * Initialize the WalletConnect SignClient.
     *
     * Must be called before any connection attempt.
     */
    async init() {
        if (this._signClient)
            return;
        const { SignClient } = await import('@cinacoin/core-sdk');
        const metadata = this._options.metadata ?? {
            name: 'Cinacoin',
            description: 'Cinacoin Wallet',
            url: typeof window !== 'undefined' ? window.location.origin : '',
            icons: [],
        };
        this._signClient = await SignClient.init({
            projectId: this._options.projectId,
            metadata,
        });
        // Restore existing sessions if any
        await this._restoreSessions();
    }
    /**
     * Connect via WalletConnect.
     *
     * Generates a new pairing URI and waits for the remote wallet to approve.
     * Call getURI() after connect() to retrieve the QR code URI.
     */
    async connect(_params) {
        const client = await this._getClientOrThrow();
        const chains = this._options.chains ?? ['eip155:1'];
        const { uri, approval } = await client.connect({
            requiredNamespaces: {
                eip155: {
                    methods: [
                        ...DEFAULT_METHODS,
                        ...(this._options.optionalMethods ?? []),
                    ],
                    chains,
                    events: DEFAULT_EVENTS,
                },
            },
        });
        this._uri = uri ?? null;
        // Wait for wallet approval
        const session = await approval();
        this._sessionTopic = session.topic;
        this._connected = true;
        // Extract accounts from session namespace
        const wcAccounts = session.namespaces?.eip155?.accounts ?? [];
        this._accounts = wcAccounts.map((a) => a.split(':').pop());
        // Extract chain from first account
        if (wcAccounts.length > 0) {
            const parts = wcAccounts[0].split(':');
            this._chainId = `0x${parseInt(parts[1], 10).toString(16)}`;
        }
        this._bindSessionEvents();
        return {
            accounts: this._accounts,
            chainId: this._chainId,
            provider: session,
        };
    }
    /**
     * Disconnect the active WalletConnect session.
     */
    async disconnect() {
        if (this._sessionTopic && this._signClient) {
            try {
                await this._signClient.disconnect({
                    topic: this._sessionTopic,
                    reason: { code: 6000, message: 'User disconnected' },
                });
            }
            catch {
                // Session already gone — ignore
            }
        }
        this._connected = false;
        this._sessionTopic = null;
        this._uri = null;
        this._accounts = [];
        const handlers = this._handlers.get('disconnect') ?? new Set();
        for (const handler of handlers) {
            handler();
        }
    }
    // ─── Provider interaction ───────────────────────────────────────
    /**
     * Send a JSON-RPC request through the active WalletConnect session.
     */
    async request(args) {
        if (!this._sessionTopic || !this._signClient) {
            throw new Error('No active WalletConnect session. Call connect() first.');
        }
        const chainIdNum = parseInt(this._chainId, 16);
        return this._signClient.request({
            topic: this._sessionTopic,
            request: {
                method: args.method,
                params: args.params ?? [],
            },
            chainId: `eip155:${chainIdNum}`,
        });
    }
    async getAccounts() {
        return this._accounts;
    }
    async getChainId() {
        return this._chainId;
    }
    /**
     * WalletConnect is always available as long as the browser has network access.
     */
    isAvailable() {
        return true;
    }
    // ─── Accessors ──────────────────────────────────────────────────
    /**
     * Get the current pairing URI for QR code display.
     */
    getURI() {
        return this._uri;
    }
    /**
     * Get the raw SignClient instance for advanced usage.
     */
    getSignClient() {
        return this._signClient;
    }
    on(event, handler) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(handler);
    }
    off(event, handler) {
        this._handlers.get(event)?.delete(handler);
    }
    // ─── Internal ───────────────────────────────────────────────────
    async _getClientOrThrow() {
        if (!this._signClient) {
            await this.init();
        }
        if (!this._signClient) {
            throw new Error('SignClient initialization failed.');
        }
        return this._signClient;
    }
    /**
     * Attempt to restore active sessions from SignClient storage.
     */
    async _restoreSessions() {
        if (!this._signClient)
            return;
        try {
            const sessions = this._signClient.session.getAll();
            if (sessions.length > 0) {
                // Use the most recently active session
                const session = sessions[sessions.length - 1];
                this._sessionTopic = session.topic;
                this._connected = true;
                const wcAccounts = session.namespaces?.eip155?.accounts ?? [];
                this._accounts = wcAccounts.map((a) => a.split(':').pop());
                if (wcAccounts.length > 0) {
                    const parts = wcAccounts[0].split(':');
                    this._chainId = `0x${parseInt(parts[1], 10).toString(16)}`;
                }
                this._bindSessionEvents();
            }
        }
        catch {
            // No sessions to restore
        }
    }
    /**
     * Bind SignClient session events to internal event handlers.
     */
    _bindSessionEvents() {
        if (!this._signClient)
            return;
        this._signClient.on('session_event', (event) => {
            const { params } = event;
            if (params.event.name === 'accountsChanged') {
                const newAccounts = params.event.data ?? [];
                this._accounts = Array.isArray(newAccounts)
                    ? newAccounts.map((a) => typeof a === 'string' && a.includes(':') ? a.split(':').pop() : a)
                    : newAccounts;
                const handlers = this._handlers.get('accountsChanged') ?? new Set();
                for (const handler of handlers) {
                    handler(this._accounts);
                }
            }
            if (params.event.name === 'chainChanged') {
                const raw = params.event.data;
                this._chainId =
                    typeof raw === 'string' && raw.startsWith('0x')
                        ? raw
                        : `0x${Number(raw).toString(16)}`;
                const handlers = this._handlers.get('chainChanged') ?? new Set();
                for (const handler of handlers) {
                    handler(this._chainId);
                }
            }
        });
        this._signClient.on('session_delete', (event) => {
            const topic = event?.topic;
            if (topic === this._sessionTopic) {
                this._connected = false;
                this._sessionTopic = null;
                this._accounts = [];
                const handlers = this._handlers.get('disconnect') ?? new Set();
                for (const handler of handlers) {
                    handler();
                }
            }
        });
    }
}
//# sourceMappingURL=walletconnect.js.map