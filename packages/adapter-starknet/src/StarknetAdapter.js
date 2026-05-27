/**
 * Starknet Chain Adapter — provides Starknet-specific wallet connection and transaction operations.
 *
 * Supports Argent X and Braavos wallets with native Starknet account abstraction.
 * Implements the ChainAdapter interface from @cinacoin/core-sdk.
 */
import { STARKNET_CHAINS, STARKNET_WALLETS } from './types.js';
import { ArgentXConnector } from './connectors/argent-x.js';
import { BraavosConnector } from './connectors/braavos.js';
/* ------------------------------------------------------------------ */
/*  StarknetChainAdapter                                                */
/* ------------------------------------------------------------------ */
/**
 * Starknet chain adapter implementing ChainAdapter from @cinacoin/core-sdk.
 *
 * Provides a unified interface for Starknet wallet operations:
 * - Wallet connection (Argent X, Braavos)
 * - Transaction signing and execution
 * - Balance queries
 * - Native account abstraction support
 */
export class StarknetChainAdapter {
    constructor() {
        this.id = 'starknet';
        this.name = 'Starknet Adapter';
        this.chains = [...STARKNET_CHAINS];
        this.activeConnector = null;
        this.connectorInstance = null;
        this.rpcUrl = STARKNET_CHAINS[0].rpcUrl;
        // Wallet connector instances (lazy-created)
        this._argentX = null;
        this._braavos = null;
    }
    /* ---- Configuration ---- */
    /** Register supported Starknet chains. */
    registerChains(chains) {
        this.chains = chains;
    }
    /** Set the connector from the core SDK. */
    setConnector(connector) {
        this.connectorInstance = connector;
    }
    /** Set a custom RPC URL. */
    setRpcUrl(url) {
        this.rpcUrl = url;
    }
    /** Set a client for advanced use cases. */
    setClient(_client) {
        // Starknet client configuration is handled via RPC URL
    }
    /** Get the active wallet connector. */
    getActiveConnector() {
        return this.activeConnector;
    }
    /** Get the currently connected account address. */
    getAddress() {
        return this.activeConnector?.getAccount() ?? null;
    }
    /* ---- Connection ---- */
    /**
     * Connect to a Starknet wallet.
     * @param walletId - Wallet id ('argent-x' or 'braavos'). Auto-detects if omitted.
     * @returns The connected Starknet account address.
     */
    async connect(walletId) {
        const connector = this._resolveConnector(walletId);
        if (!connector) {
            throw new Error('No Starknet wallet found. Install Argent X (https://www.argent.xyz/argent-x/) or Braavos (https://braavos.app/)');
        }
        const address = await connector.connect();
        this.activeConnector = connector;
        return address;
    }
    /** Disconnect from the current wallet. */
    async disconnect() {
        if (this.activeConnector) {
            await this.activeConnector.disconnect();
            this.activeConnector = null;
        }
    }
    /* ---- ChainAdapter Interface ---- */
    /** Get connected account addresses. */
    async getAccounts() {
        const account = this.activeConnector?.getAccount();
        return account ? [account] : [];
    }
    /**
     * Get native balance for a Starknet address.
     * @param address - Starknet address (hex with 0x prefix).
     * @returns Balance in ETH (as a decimal string, e.g. "1.234").
     */
    async getBalance(address) {
        if (!this._isValidAddress(address)) {
            throw new Error(`Invalid Starknet address: ${address}`);
        }
        // Use JSON-RPC to get ETH balance
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'starknet_getBalance',
                params: [address],
            }),
        });
        const data = (await response.json());
        if (data.error)
            throw new Error(data.error.message);
        const value = typeof data.result === 'string' ? data.result : (data.result?.value ?? '0');
        // Convert from wei (18 decimals) to ETH
        const wei = BigInt(value);
        const eth = Number(wei) / 1e18;
        return eth.toString();
    }
    /**
     * Sign a Starknet transaction.
     * @param tx - Transaction as calls array or single call.
     * @returns Signed transaction data (not broadcast).
     */
    async signTransaction(tx) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        const calls = this._toCalls(tx);
        const result = await this.activeConnector.signTransaction(calls);
        return JSON.stringify(result);
    }
    /**
     * Send a transaction (sign + execute).
     * Delegates to the connected wallet's account abstraction layer.
     * @param tx - Transaction as calls array or single call.
     * @returns Transaction hash.
     */
    async sendTransaction(tx) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        const calls = this._toCalls(tx);
        const details = typeof tx === 'object' && tx !== null && 'details' in tx
            ? tx.details
            : undefined;
        const result = await this.activeConnector.executeTransaction(calls, details);
        return result.transactionHash;
    }
    /**
     * Sign a message with the connected wallet.
     * @param message - Message to sign (string or Starknet TypedData).
     * @returns Signature as JSON string.
     */
    async signMessage(message) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        return this.activeConnector.signMessage(message);
    }
    /**
     * Starknet does not have traditional chain switching — it has networks.
     * This method switches the RPC URL to match the target chain.
     * @param _chainId - Chain ID (mapped to chain).
     */
    async switchChain(_chainId) {
        // Starknet uses network switching rather than chain ID switching
        // The wallet handles network selection internally
    }
    /**
     * Execute a Starknet transaction (alias for sendTransaction).
     * @param calls - Transaction calls.
     * @param details - Optional transaction details.
     * @returns Transaction hash.
     */
    async executeTransaction(calls, details) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        const normalizedCalls = Array.isArray(calls) ? calls : [calls];
        const result = await this.activeConnector.executeTransaction(normalizedCalls, details);
        return result.transactionHash;
    }
    /* ---- Utility ---- */
    /** Find a Starknet chain by its ID. */
    findChain(chainId) {
        return this.chains.find((c) => c.id === `starknet:${chainId}`);
    }
    /** Get supported Starknet wallets. */
    getSupportedWallets() {
        return STARKNET_WALLETS.map((w) => ({
            ...w,
            available: this._getConnector(w.id)?.isInstalled() ?? false,
        }));
    }
    /** Validate a Starknet address. */
    static isValidAddress(address) {
        if (!address.startsWith('0x'))
            return false;
        const hex = address.slice(2);
        if (hex.length === 0 || hex.length > 66)
            return false;
        return /^[0-9a-fA-F]+$/.test(hex);
    }
    /* ---- Private helpers ---- */
    _resolveConnector(walletId) {
        if (walletId) {
            return this._getConnector(walletId);
        }
        // Auto-detect: Argent X → Braavos
        const argentX = this._getConnector('argent-x');
        if (argentX?.isInstalled())
            return argentX;
        const braavos = this._getConnector('braavos');
        if (braavos?.isInstalled())
            return braavos;
        return null;
    }
    _getConnector(walletId) {
        switch (walletId) {
            case 'argent-x':
                if (!this._argentX)
                    this._argentX = new ArgentXConnector();
                return this._argentX.isInstalled() ? this._argentX : null;
            case 'braavos':
                if (!this._braavos)
                    this._braavos = new BraavosConnector();
                return this._braavos.isInstalled() ? this._braavos : null;
            default:
                return null;
        }
    }
    _toCalls(tx) {
        if (Array.isArray(tx))
            return tx;
        if (typeof tx === 'object' && tx !== null && 'calls' in tx) {
            const calls = tx.calls;
            return Array.isArray(calls) ? calls : [calls];
        }
        return [tx];
    }
    _isValidAddress(address) {
        return StarknetChainAdapter.isValidAddress(address);
    }
}
//# sourceMappingURL=StarknetAdapter.js.map