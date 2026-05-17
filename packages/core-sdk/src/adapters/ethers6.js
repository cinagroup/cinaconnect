/**
 * ethers v6 Adapter — modern Promise-based API for ethers.js v6.
 *
 * Supports BrowserProvider, JsonRpcSigner, and EIP-1559 transactions
 * through the latest ethers v6 interface.
 *
 * @example
 * ```ts
 * import { Ethers6Adapter } from '@cinaconnect/core-sdk';
 * import { BrowserProvider } from 'ethers';
 *
 * const provider = new BrowserProvider(window.ethereum);
 * const adapter = new Ethers6Adapter(provider);
 * await adapter.connect();
 * ```
 */
import { EventEmitter } from '../events.js';
// ---------------------------------------------------------------------------
// Ethers6Adapter
// ---------------------------------------------------------------------------
/**
 * ethers v6 adapter implementing the CinaConnect Connector interface.
 *
 * Uses the modern Promise-based API of ethers v6 with BrowserProvider
 * and JsonRpcSigner.
 */
export class Ethers6Adapter extends EventEmitter {
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
     * Create an ethers v6 adapter.
     *
     * @param provider - ethers v6 provider (BrowserProvider, JsonRpcProvider).
     */
    constructor(provider) {
        super();
        this.id = 'ethers6';
        this.name = 'ethers v6';
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
            throw new Error('No ethers v6 provider set');
        }
        const accounts = await this.provider.listAccounts();
        if (accounts.length === 0) {
            throw new Error('No accounts available');
        }
        this.signer = await this.provider.getSigner();
        const network = await this.provider.getNetwork();
        const address = await this.signer.getAddress();
        return {
            sessionId: `${this.id}:${address}`,
            accounts: [address],
            chainId: Number(network.chainId),
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
        return Number(network.chainId);
    }
    async switchChain(chainId) {
        if (!this.provider)
            throw new Error('No provider');
        const hexChainId = `0x${chainId.toString(16)}`;
        try {
            await this.provider.send('wallet_switchEthereumChain', [{ chainId: hexChainId }]);
        }
        catch (switchError) {
            const chain = this.findChain(chainId);
            if (chain) {
                await this.provider.send('wallet_addEthereumChain', [
                    {
                        chainId: hexChainId,
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
        return signer.signTransaction(toEthers6Tx(tx));
    }
    getProvider() {
        return this.provider;
    }
    // -- ethers v6 specific methods --------------------------------------------
    /**
     * Get the ethers v6 Signer.
     */
    async getSigner() {
        if (this.signer)
            return this.signer;
        if (!this.provider)
            throw new Error('No provider');
        this.signer = await this.provider.getSigner();
        return this.signer;
    }
    /**
     * Get the ethers v6 Provider.
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
     * Send a transaction (supports EIP-1559).
     */
    async sendTransaction(tx) {
        const signer = await this.getSigner();
        return signer.sendTransaction(toEthers6Tx(tx));
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
     * Call a contract method (read-only).
     */
    async call(to, data, from) {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider.call({ to, data, from });
    }
    /**
     * Get ERC-20 token balance.
     */
    async getTokenBalance(tokenAddress, userAddress) {
        const data = '0x70a08231' + userAddress.slice(2).padStart(64, '0').toLowerCase();
        return this.call(tokenAddress, data, userAddress);
    }
    /**
     * Estimate gas for a transaction.
     */
    async estimateGas(tx) {
        if (!this.provider)
            throw new Error('No provider');
        return (await this.provider.send('eth_estimateGas', [
            {
                from: tx.from,
                to: tx.to,
                data: tx.data,
                value: tx.value,
            },
        ]));
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
     * Set the provider.
     */
    setProvider(provider) {
        this.provider = provider;
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toEthers6Tx(tx) {
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
        result.chainId = BigInt(tx.chainId);
    // Default to EIP-1559 (type 2) if maxFeePerGas is present
    if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
        result.type = 2;
    }
    return result;
}
//# sourceMappingURL=ethers6.js.map