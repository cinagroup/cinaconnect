/**
 * viem Adapter — wraps viem's Client and Transport for CinaConnect.
 *
 * Provides a ChainAdapter-compatible interface using viem's native
 * methods: getAccount, getBalance, sendTransaction, signMessage,
 * and chain switching via switchChain.
 *
 * @example
 * ```ts
 * import { createViemAdapter } from '@cinaconnect/core-sdk';
 *
 * const adapter = createViemAdapter({
 *   chain: mainnet,
 *   transport: http(),
 * });
 *
 * const balance = await adapter.getBalance('0x...');
 * ```
 */
// ---------------------------------------------------------------------------
// ViemChainAdapter
// ---------------------------------------------------------------------------
/**
 * viem-backed chain adapter implementing the CinaConnect ChainAdapter interface.
 */
export class ViemChainAdapter {
    constructor(client, connector) {
        this.id = 'viem';
        this.name = 'viem';
        this.client = null;
        this.connector = null;
        this.chains = [];
        if (client)
            this.client = client;
        if (connector)
            this.connector = connector;
    }
    // -- ChainAdapter interface ------------------------------------------------
    /** Set the active viem client. */
    setClient(client) {
        this.client = client;
    }
    /** Set the active connector. */
    setConnector(connector) {
        this.connector = connector;
    }
    /** Register supported chains. */
    registerChains(chains) {
        this.chains = chains;
    }
    /** Find a registered chain by numeric ID. */
    findChain(chainId) {
        return this.chains.find((c) => {
            try {
                const id = parseInt(c.id, 16) || parseInt(c.id, 10);
                return id === chainId;
            }
            catch {
                return false;
            }
        });
    }
    // -- viem-style methods ----------------------------------------------------
    /**
     * Get the connected account address(es).
     * Mirrors viem's wallet_getAccounts.
     *
     * @returns Array of addresses.
     */
    async getAccounts() {
        // Prefer client.account if available
        if (this.client?.account) {
            const acc = this.client.account;
            return Array.isArray(acc) ? acc.map((a) => a.address) : [acc.address];
        }
        if (this.connector) {
            return this.connector.getAccounts();
        }
        throw new Error('No viem client or connector set');
    }
    /**
     * Get native balance for an address via viem.
     *
     * @param address - Ethereum address.
     * @returns Balance in wei (hex string).
     */
    async getBalance(address) {
        const provider = this.provider();
        return (await provider.request({
            method: 'eth_getBalance',
            params: [address, 'latest'],
        }));
    }
    /**
     * Send a transaction via viem's client.
     *
     * @param tx - Transaction request.
     * @returns Transaction hash.
     */
    async sendTransaction(tx) {
        const provider = this.provider();
        const formatted = this.formatTransaction(tx);
        return (await provider.request({
            method: 'eth_sendTransaction',
            params: [formatted],
        }));
    }
    /**
     * Sign a message with the connected account.
     *
     * @param message - Message to sign (hex or UTF-8 string).
     * @returns Signature as hex string.
     */
    async signMessage(message) {
        // If message doesn't start with 0x, hex-encode it
        const data = message.startsWith('0x') ? message : stringToHex(message);
        const provider = this.provider();
        const accounts = await this.getAccounts();
        if (accounts.length === 0) {
            throw new Error('No account connected');
        }
        return (await provider.request({
            method: 'personal_sign',
            params: [data, accounts[0]],
        }));
    }
    /**
     * Switch the active chain.
     *
     * Uses viem's wallet_switchEthereumChain or the connector's switchChain.
     *
     * @param chainId - Target chain ID.
     */
    async switchChain(chainId) {
        const hexChainId = `0x${chainId.toString(16)}`;
        const provider = this.provider();
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: hexChainId }],
            });
        }
        catch {
            // Fallback to connector switchChain
            if (this.connector) {
                return this.connector.switchChain(chainId);
            }
            throw new Error(`Unable to switch to chain ${chainId}`);
        }
    }
    // -- helpers ---------------------------------------------------------------
    provider() {
        if (this.client?.transport?.value) {
            return this.client.transport.value;
        }
        if (this.client) {
            return this.client;
        }
        if (this.connector) {
            const p = this.connector.getProvider();
            if (p)
                return p;
        }
        throw new Error('No viem client, transport, or connector available');
    }
    formatTransaction(tx) {
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
}
// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
/**
 * Create a ViemChainAdapter from a viem client.
 *
 * @param client - viem Client instance.
 * @param connector - Optional CinaConnect Connector.
 * @returns ViemChainAdapter instance.
 */
export function createViemAdapter(client, connector) {
    return new ViemChainAdapter(client, connector);
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Convert a UTF-8 string to hex (0x-prefixed). */
function stringToHex(str) {
    const bytes = new TextEncoder().encode(str);
    return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
//# sourceMappingURL=viem.js.map