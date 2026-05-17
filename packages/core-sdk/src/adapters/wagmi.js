/**
 * wagmi Adapter — integrates wagmi's hooks and config with CinaConnect.
 *
 * Provides a WagmiConnector that wraps wagmi's createConfig and supports
 * multi-chain via wagmi's chains configuration.
 *
 * Designed for React/Next.js apps using wagmi v2+.
 *
 * @example
 * ```ts
 * import { createWagmiConnector } from '@cinaconnect/core-sdk';
 * import { http } from 'viem';
 * import { mainnet, polygon } from 'wagmi/chains';
 *
 * const connector = createWagmiConnector({
 *   chains: [mainnet, polygon],
 *   transports: {
 *     [mainnet.id]: http(),
 *     [polygon.id]: http(),
 *   },
 * });
 * ```
 */
import { EventEmitter } from '../events.js';
// ---------------------------------------------------------------------------
// WagmiConnector
// ---------------------------------------------------------------------------
/**
 * WagmiConnector bridges wagmi's configuration and connector system
 * with CinaConnect's Connector abstract base class.
 *
 * It wraps a WagmiConnectorInstance (injected, walletconnect, etc.)
 * and exposes the standard CinaConnect connector API.
 */
export class WagmiConnector extends EventEmitter {
    constructor(wagmiConnector, wagmiConfig, options) {
        super();
        this._accounts = [];
        this._chainId = null;
        this.wagmiConnector = wagmiConnector;
        this.wagmiConfig = wagmiConfig;
        this.id = wagmiConnector.id;
        this.name = wagmiConnector.name;
        this.type = wagmiConnector.type;
        this.icon = options?.icon ?? '';
        this.installed = true; // wagmi connectors are always "available"
    }
    async connect(params) {
        if (!this.wagmiConnector) {
            throw new Error('wagmi connector not available');
        }
        const result = await this.wagmiConnector.connect({
            chainId: params?.chains?.[0],
        });
        this._accounts = result.accounts;
        this._chainId = result.chainId;
        return {
            sessionId: `${this.id}:${result.accounts[0] ?? 'unknown'}`,
            accounts: result.accounts,
            chainId: result.chainId,
            connectorId: this.id,
        };
    }
    async disconnect() {
        if (this.wagmiConnector) {
            await this.wagmiConnector.disconnect();
        }
        this._accounts = [];
        this._chainId = null;
    }
    async getAccounts() {
        if (this._accounts.length > 0) {
            return this._accounts;
        }
        if (this.wagmiConnector) {
            return this.wagmiConnector.getAccounts();
        }
        return [];
    }
    async getChainId() {
        if (this._chainId !== null) {
            return this._chainId;
        }
        if (this.wagmiConnector) {
            return this.wagmiConnector.getChainId();
        }
        return 0;
    }
    async switchChain(chainId) {
        // Check if the chain is in our config
        const chain = this.wagmiConfig.chains.find((c) => c.id === chainId);
        if (!chain) {
            throw new Error(`Chain ${chainId} not configured in wagmi`);
        }
        if (this.wagmiConnector?.switchChain) {
            await this.wagmiConnector.switchChain(chainId);
        }
        else {
            throw new Error(`switchChain not supported by ${this.id}`);
        }
        this._chainId = chainId;
    }
    async signMessage(message) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No provider available');
        }
        const accounts = await this.getAccounts();
        if (accounts.length === 0) {
            throw new Error('No account connected');
        }
        const data = message.startsWith('0x') ? message : stringToHex(message);
        return (await provider.request({
            method: 'personal_sign',
            params: [data, accounts[0]],
        }));
    }
    async signTransaction(tx) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No provider available');
        }
        return (await provider.request({
            method: 'eth_signTransaction',
            params: [formatTx(tx)],
        }));
    }
    getProvider() {
        // Return the transport for the active chain
        if (this._chainId) {
            const transport = this.wagmiConfig.transports[this._chainId];
            if (transport?.value) {
                return transport.value;
            }
            if (typeof transport === 'function') {
                return transport();
            }
        }
        // Fallback: return first available transport
        const firstTransport = Object.values(this.wagmiConfig.transports)[0];
        if (firstTransport?.value)
            return firstTransport.value;
        if (typeof firstTransport === 'function')
            return firstTransport();
        return null;
    }
    /** Get the underlying wagmi config. */
    getWagmiConfig() {
        return this.wagmiConfig;
    }
    /** Get the underlying wagmi connector instance. */
    getWagmiConnectorInstance() {
        return this.wagmiConnector;
    }
    // Deep link stubs — wagmi connectors handle their own linking
    async openDeepLink(_walletId, _uri, _params) {
        return { success: false, method: 'qr-code', url: '', fallbackUsed: false };
    }
    generateDeepLink(_walletId, _uri, _queryParams) {
        return '';
    }
    setRedirectHandler(_handler) {
        // no-op for wagmi connectors
    }
}
// ---------------------------------------------------------------------------
// MultiChainConnector — supports multiple wagmi connectors
// ---------------------------------------------------------------------------
/**
 * MultiChainConnector wraps a full wagmi config with multiple connector
 * instances and exposes the CinaConnect Connector API.
 *
 * Use this when you need to support multiple wallet types (injected,
 * WalletConnect, Coinbase, etc.) through a single connector.
 */
export class MultiChainConnector extends EventEmitter {
    constructor(config) {
        super();
        this.id = 'wagmi-multi';
        this.name = 'wagmi Multi-Chain';
        this.icon = '';
        this.installed = true;
        this.type = 'multi';
        this.activeConnector = null;
        this._accounts = [];
        this._chainId = null;
        this.config = config;
    }
    /** Set the active wagmi connector by ID. */
    setActiveConnector(connectorId) {
        const connector = this.config.connectors?.find((c) => c.id === connectorId);
        if (!connector) {
            throw new Error(`Connector ${connectorId} not found in wagmi config`);
        }
        this.activeConnector = connector;
    }
    /** Get all available connector IDs. */
    getAvailableConnectors() {
        return this.config.connectors?.map((c) => c.id) ?? [];
    }
    async connect(params) {
        if (!this.activeConnector) {
            throw new Error('No active wagmi connector set');
        }
        const result = await this.activeConnector.connect({
            chainId: params?.chains?.[0],
        });
        this._accounts = result.accounts;
        this._chainId = result.chainId;
        return {
            sessionId: `${this.id}:${result.accounts[0] ?? 'unknown'}`,
            accounts: result.accounts,
            chainId: result.chainId,
            connectorId: this.activeConnector.id,
        };
    }
    async disconnect() {
        if (this.activeConnector) {
            await this.activeConnector.disconnect();
        }
        this._accounts = [];
        this._chainId = null;
    }
    async getAccounts() {
        if (this._accounts.length > 0)
            return this._accounts;
        if (this.activeConnector)
            return this.activeConnector.getAccounts();
        return [];
    }
    async getChainId() {
        if (this._chainId !== null)
            return this._chainId;
        if (this.activeConnector)
            return this.activeConnector.getChainId();
        return 0;
    }
    async switchChain(chainId) {
        const chain = this.config.chains.find((c) => c.id === chainId);
        if (!chain) {
            throw new Error(`Chain ${chainId} not in wagmi config`);
        }
        if (this.activeConnector?.switchChain) {
            await this.activeConnector.switchChain(chainId);
        }
        this._chainId = chainId;
    }
    async signMessage(message) {
        const provider = this.getProvider();
        if (!provider)
            throw new Error('No provider');
        const accounts = await this.getAccounts();
        if (accounts.length === 0)
            throw new Error('No account');
        const data = message.startsWith('0x') ? message : stringToHex(message);
        return (await provider.request({
            method: 'personal_sign',
            params: [data, accounts[0]],
        }));
    }
    async signTransaction(tx) {
        const provider = this.getProvider();
        if (!provider)
            throw new Error('No provider');
        return (await provider.request({
            method: 'eth_signTransaction',
            params: [formatTx(tx)],
        }));
    }
    getProvider() {
        if (this._chainId) {
            const t = this.config.transports[this._chainId];
            if (t?.value)
                return t.value;
            if (typeof t === 'function')
                return t();
        }
        const first = Object.values(this.config.transports)[0];
        if (first?.value)
            return first.value;
        if (typeof first === 'function')
            return first();
        return null;
    }
    // Deep link stubs
    async openDeepLink(_walletId, _uri, _params) {
        return { success: false, method: 'qr-code', url: '', fallbackUsed: false };
    }
    generateDeepLink(_walletId, _uri, _queryParams) {
        return '';
    }
    setRedirectHandler(_handler) {
        // no-op for multi-chain connector
    }
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Create a WagmiConnector from a wagmi connector instance and config.
 *
 * @param wagmiConnector - wagmi ConnectorInstance (e.g., injected).
 * @param wagmiConfig - wagmi Config object.
 * @param options - Optional settings (icon).
 * @returns WagmiConnector instance.
 */
export function createWagmiConnector(wagmiConnector, wagmiConfig, options) {
    return new WagmiConnector(wagmiConnector, wagmiConfig, options);
}
/**
 * Create a MultiChainConnector from a full wagmi config.
 *
 * @param config - wagmi Config with multiple connectors.
 * @returns MultiChainConnector instance.
 */
export function createMultiChainConnector(config) {
    return new MultiChainConnector(config);
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function stringToHex(str) {
    const bytes = new TextEncoder().encode(str);
    return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function formatTx(tx) {
    const formatted = {};
    if (tx.from)
        formatted.from = tx.from;
    if (tx.to)
        formatted.to = tx.to;
    if (tx.value)
        formatted.value = tx.value;
    if (tx.data)
        formatted.data = tx.data;
    if (tx.gas)
        formatted.gas = tx.gas;
    if (tx.gasPrice)
        formatted.gasPrice = tx.gasPrice;
    if (tx.maxFeePerGas)
        formatted.maxFeePerGas = tx.maxFeePerGas;
    if (tx.maxPriorityFeePerGas)
        formatted.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    if (tx.nonce)
        formatted.nonce = tx.nonce;
    if (tx.chainId)
        formatted.chainId = `0x${tx.chainId.toString(16)}`;
    return formatted;
}
//# sourceMappingURL=wagmi.js.map