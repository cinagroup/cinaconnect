import { XamanConnector, announceXamanEIP6963 } from './connectors/xaman';
/**
 * XRP Ledger chain adapter for Cinacoin.
 *
 * Supports Xaman (formerly Xumm), Fireblocks, and Ledger.
 * Provides XRP transfers, account settings, trust lines,
 * and NFT minting/burning.
 *
 * @example
 * ```ts
 * import { XrplAdapter, XamanConnector, announceXrplProviders } from '@cinacoin/adapter-xrpl';
 *
 * // Announce providers for EIP-6963 discovery
 * announceXrplProviders();
 *
 * // Use the adapter directly
 * const adapter = new XrplAdapter();
 * const result = await adapter.connect({ connectorId: 'xaman' });
 * const { transactionHash } = await adapter.sendXRP({
 *   destination: 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDH',
 *   amount: '1000000', // 1 XRP in drops
 * });
 *
 * // Or use individual connectors
 * const xaman = new XamanConnector();
 * if (xaman.isAvailable()) {
 *   await xaman.connect();
 * }
 * ```
 */
export class XrplAdapter {
    constructor() {
        this.id = 'xrpl';
        this.name = 'XRP Ledger';
        this.icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="%23000"/><text x="16" y="22" text-anchor="middle" font-size="12" fill="white" font-family="sans-serif" font-weight="bold">XRP</text></svg>';
        this.platforms = ['browser', 'mobile', 'extension', 'hardware'];
        this._connector = null;
        this._registry = new Map();
        this._handlers = new Map();
        this._coreConnector = null;
        this._registerBuiltInConnectors();
    }
    // ─── Connector Registry ─────────────────────────────────────────
    _registerBuiltInConnectors() {
        this.registerConnector(new XamanConnector());
        // Fireblocks and Ledger connectors would be registered here
        // when their implementations are added:
        // this.registerConnector(new FireblocksXrplConnector());
        // this.registerConnector(new LedgerXrplConnector());
    }
    /**
     * Register an XRPL connector.
     */
    registerConnector(connector) {
        this._registry.set(connector.id, connector);
    }
    /**
     * Get a connector by id.
     */
    getConnector(id) {
        return this._registry.get(id);
    }
    /**
     * Get all registered connectors.
     */
    getAllConnectors() {
        return Array.from(this._registry.values());
    }
    /**
     * Detect which connectors are currently available (wallet installed).
     */
    detectAvailableConnectors() {
        return this.getAllConnectors().filter(c => c.isAvailable());
    }
    /**
     * Get recommended connectors in priority order.
     */
    getRecommendedConnectors() {
        const available = this.detectAvailableConnectors();
        const priority = ['xaman', 'fireblocks', 'ledger'];
        return priority
            .map(id => available.find(c => c.id === id))
            .filter((c) => c !== undefined);
    }
    /**
     * Set the underlying Cinacoin core connector.
     */
    setConnector(connector) {
        this._coreConnector = connector;
    }
    // ─── XrplConnector Implementation ───────────────────────────────
    get supportedFeatures() {
        return this._connector?.supportedFeatures ?? [
            'xrpl:connect',
            'xrpl:signTransaction',
            'xrpl:sendXRP',
            'xrpl:getBalance',
            'xrpl:accountSettings',
            'xrpl:trustLine',
            'xrpl:nftMint',
            'xrpl:nftBurn',
            'xrpl:signMessage',
        ];
    }
    /**
     * Connect via the best available connector.
     * Optionally specify a connector id to use a specific wallet.
     */
    async connect(params) {
        let connector;
        if (params?.connectorId) {
            const c = this.getConnector(params.connectorId);
            if (!c) {
                throw new Error(`Connector "${params.connectorId}" not found`);
            }
            connector = c;
        }
        else {
            const recommended = this.getRecommendedConnectors();
            if (recommended.length === 0) {
                throw new Error('No XRPL wallet found. Install Xaman Wallet or connect a Ledger.');
            }
            connector = recommended[0];
        }
        const result = await connector.connect({ network: params?.network });
        this._connector = connector;
        // Forward connector events through this adapter
        connector.on('accountsChanged', (accounts) => {
            const handlers = this._handlers.get('accountsChanged') ?? new Set();
            for (const handler of handlers) {
                handler(accounts);
            }
        });
        connector.on('networkChanged', (network) => {
            const handlers = this._handlers.get('networkChanged') ?? new Set();
            for (const handler of handlers) {
                handler(network);
            }
        });
        connector.on('disconnect', (error) => {
            this._connector = null;
            const handlers = this._handlers.get('disconnect') ?? new Set();
            for (const handler of handlers) {
                handler(error);
            }
        });
        return result;
    }
    async disconnect() {
        if (this._connector) {
            await this._connector.disconnect();
            this._connector = null;
        }
    }
    async request(args) {
        const connector = this._getConnectorOrThrow();
        return connector.request(args);
    }
    async getAccounts() {
        const connector = this._getConnectorOrThrow();
        return connector.getAccounts();
    }
    async getNetwork() {
        const connector = this._getConnectorOrThrow();
        return connector.getNetwork();
    }
    async switchNetwork(network) {
        const connector = this._getConnectorOrThrow();
        await connector.switchNetwork(network);
    }
    isAvailable() {
        return this.detectAvailableConnectors().length > 0;
    }
    async signTransaction(params) {
        const connector = this._getConnectorOrThrow();
        return connector.signTransaction(params);
    }
    async sendXRP(params) {
        const connector = this._getConnectorOrThrow();
        return connector.sendXRP(params);
    }
    async getBalance(address) {
        const connector = this._getConnectorOrThrow();
        return connector.getBalance(address);
    }
    async updateAccountSettings(params) {
        const connector = this._getConnectorOrThrow();
        return connector.updateAccountSettings(params);
    }
    async setTrustLine(params) {
        const connector = this._getConnectorOrThrow();
        return connector.setTrustLine(params);
    }
    async mintNFT(params) {
        const connector = this._getConnectorOrThrow();
        return connector.mintNFT(params);
    }
    async burnNFT(params) {
        const connector = this._getConnectorOrThrow();
        return connector.burnNFT(params);
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
    // ─── Internal ────────────────────────────────────────────────────
    _getConnectorOrThrow() {
        if (!this._connector) {
            throw new Error('No XRPL wallet connected. Call connect() first.');
        }
        return this._connector;
    }
}
/**
 * Announce all registered XRPL providers via EIP-6963.
 * Call this during application bootstrap.
 */
export function announceXrplProviders() {
    announceXamanEIP6963();
}
//# sourceMappingURL=XrplAdapter.js.map