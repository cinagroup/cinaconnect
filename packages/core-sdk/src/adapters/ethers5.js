/**
 * ethers v5 Adapter — supports legacy dApps on ethers.js v5.
 *
 * Wraps ethers v5's BrowserProvider / Web3Provider and Signer-based
 * connection model for CinaConnect integration.
 *
 * @example
 * ```ts
 * import { Ethers5Adapter } from '@cinaconnect/core-sdk';
 * import { Web3Provider } from '@ethersproject/providers';
 *
 * const adapter = new Ethers5Adapter(provider);
 * await adapter.connect();
 * ```
 */
import { EventEmitter } from '../events.js';
// ---------------------------------------------------------------------------
// Ethers5Adapter
// ---------------------------------------------------------------------------
/**
 * ethers v5 adapter implementing the CinaConnect Connector interface.
 *
 * Wraps an ethers v5 provider and signer for seamless integration
 * with legacy dApps still on ethers v5.
 */
export class Ethers5Adapter extends EventEmitter {
    // Deep link stubs — injected connectors typically don't need these,
    // but the Connector interface requires them.
    async openDeepLink(_walletId, _uri, _params) {
        return { success: false, method: 'qr-code', url: '', fallbackUsed: false };
    }
    generateDeepLink(_walletId, _uri, _queryParams) {
        return '';
    }
    setRedirectHandler(_handler) {
        // no-op for injected connectors
    }
    /**
     * Create an ethers v5 adapter.
     *
     * @param provider - ethers v5 provider (Web3Provider, BrowserProvider, etc.)
     */
    constructor(provider) {
        super();
        this.id = 'ethers5';
        this.name = 'ethers v5';
        this.icon = '';
        this.type = 'injected';
        this.signer = null;
        this.chains = [];
        this.provider = provider ?? null;
        this.installed = provider !== null;
    }
    // -- Connector interface ---------------------------------------------------
    async connect(params) {
        if (!this.provider) {
            throw new Error('No ethers v5 provider set');
        }
        const accounts = await this.provider.listAccounts();
        if (accounts.length === 0) {
            throw new Error('No accounts available');
        }
        this.signer = this.provider.getSigner(0) ?? null;
        if (!this.signer) {
            throw new Error('Unable to get signer from provider');
        }
        const network = await this.provider.getNetwork();
        const address = await this.signer.getAddress();
        return {
            sessionId: `${this.id}:${address}`,
            accounts: [address],
            chainId: network.chainId,
            connectorId: this.id,
        };
    }
    async disconnect() {
        this.signer = null;
    }
    async getAccounts() {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider.listAccounts();
    }
    async getChainId() {
        if (!this.provider)
            throw new Error('No provider');
        const network = await this.provider.getNetwork();
        return network.chainId;
    }
    async switchChain(chainId) {
        if (!this.provider)
            throw new Error('No provider');
        try {
            // Try wallet_switchEthereumChain first
            await this.provider.send('wallet_switchEthereumChain', [{ chainId: `0x${chainId.toString(16)}` }]);
        }
        catch (switchError) {
            // Chain not added — try wallet_addEthereumChain
            const chain = this.findChain(chainId);
            if (chain) {
                await this.provider.send('wallet_addEthereumChain', [
                    {
                        chainId: `0x${chainId.toString(16)}`,
                        chainName: chain.name,
                        rpcUrls: [chain.rpcUrl],
                        nativeCurrency: chain.nativeCurrency ?? { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    },
                ]);
            }
            else {
                throw new Error(`Chain ${chainId} not found and cannot be added`);
            }
        }
    }
    async signMessage(message) {
        const signer = await this.getSigner();
        return signer.signMessage(message);
    }
    async signTransaction(tx) {
        const signer = await this.getSigner();
        return signer.signTransaction(toEthers5Tx(tx));
    }
    getProvider() {
        return this.provider;
    }
    // -- ethers v5 specific methods --------------------------------------------
    /**
     * Get the ethers v5 Signer.
     */
    async getSigner() {
        if (this.signer)
            return this.signer;
        if (!this.provider)
            throw new Error('No provider');
        this.signer = this.provider.getSigner(0) ?? null;
        if (!this.signer) {
            throw new Error('Unable to get signer');
        }
        return this.signer;
    }
    /**
     * Get the ethers v5 Provider.
     */
    getEthersProvider() {
        return this.provider;
    }
    /**
     * Get native balance for an address.
     */
    async getBalance(address) {
        if (!this.provider)
            throw new Error('No provider');
        const addr = address ?? (await this.getAccounts())[0];
        return this.provider.getBalance(addr);
    }
    /**
     * Get current gas price.
     */
    async getGasPrice() {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider.getGasPrice();
    }
    /**
     * Get current block number.
     */
    async getBlockNumber() {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider.getBlockNumber();
    }
    /**
     * Send a transaction.
     */
    async sendTransaction(tx) {
        const signer = await this.getSigner();
        return signer.sendTransaction(toEthers5Tx(tx));
    }
    /**
     * Get a transaction by hash.
     */
    async getTransaction(hash) {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider.getTransaction(hash);
    }
    /**
     * Get a transaction receipt.
     */
    async getTransactionReceipt(hash) {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider.getTransactionReceipt(hash);
    }
    /**
     * Call a contract method.
     */
    async call(to, data, from) {
        if (!this.provider)
            throw new Error('No provider');
        return (await this.provider.send('eth_call', [
            { to, data, from },
            'latest',
        ]));
    }
    /**
     * Get ERC-20 token balance.
     */
    async getTokenBalance(tokenAddress, userAddress) {
        const data = '0x70a08231' + userAddress.slice(2).padStart(64, '0').toLowerCase();
        return this.call(tokenAddress, data, userAddress);
    }
    /**
     * Register supported chains.
     */
    registerChains(chains) {
        this.chains = chains;
    }
    /**
     * Find a chain by ID.
     */
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
    /**
     * Set the provider (useful for reconnection).
     */
    setProvider(provider) {
        this.provider = provider;
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toEthers5Tx(tx) {
    const result = {};
    if (tx.from)
        result.from = tx.from;
    if (tx.to)
        result.to = tx.to;
    if (tx.value)
        result.value = tx.value;
    if (tx.data)
        result.data = tx.data;
    if (tx.gas)
        result.gasLimit = tx.gas;
    if (tx.gasPrice)
        result.gasPrice = tx.gasPrice;
    if (tx.maxFeePerGas)
        result.maxFeePerGas = tx.maxFeePerGas;
    if (tx.maxPriorityFeePerGas)
        result.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    if (tx.nonce)
        result.nonce = parseInt(tx.nonce, 16);
    if (tx.chainId)
        result.chainId = tx.chainId;
    return result;
}
//# sourceMappingURL=ethers5.js.map