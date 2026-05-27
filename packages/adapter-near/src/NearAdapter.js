/**
 * NEAR Chain Adapter — provides NEAR-specific wallet connection and transaction operations.
 *
 * Supports NEAR Wallet, Here Wallet, and Meteor Wallet.
 * Implements the ChainAdapter interface from @cinacoin/core-sdk.
 */
import { NEAR_CHAINS, NEAR_WALLETS } from './types.js';
import { NearWalletConnector as NearWalletConn } from './connectors/near-wallet.js';
import { HereWalletConnector } from './connectors/here-wallet.js';
/**
 * Meteor Wallet connector for NEAR.
 * A lightweight, extension-based NEAR wallet.
 */
class MeteorWalletConnector {
    constructor() {
        this.id = 'meteor-wallet';
        this.name = 'Meteor Wallet';
        this.provider = null;
        this.accountId = null;
    }
    isAvailable() {
        if (typeof window === 'undefined')
            return false;
        return !!window.meteorWallet;
    }
    async connect() {
        const provider = this._getProvider();
        if (!provider) {
            throw new Error('Meteor Wallet is not available. Visit https://wallet.meteorwallet.app');
        }
        const account = await provider.connect();
        this.provider = provider;
        this.accountId = account.accountId;
        return account.accountId;
    }
    async disconnect() {
        if (this.provider) {
            try {
                await this.provider.disconnect();
            }
            catch {
                // Already disconnected
            }
            this.provider = null;
            this.accountId = null;
        }
    }
    getAccountId() {
        return this.accountId;
    }
    async signTransaction(tx) {
        if (!this.provider)
            throw new Error('Meteor Wallet not connected');
        const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];
        const result = await this._sendActions(actions);
        return result.transactionHash;
    }
    async sendTransaction(tx) {
        if (!this.provider)
            throw new Error('Meteor Wallet not connected');
        const actions = Array.isArray(tx.actions) ? tx.actions : [tx.actions];
        return this._sendActions(actions);
    }
    async signMessage(message, recipient) {
        if (!this.provider)
            throw new Error('Meteor Wallet not connected');
        const recipientDomain = recipient ?? (typeof window !== 'undefined' ? window.location.host : '');
        const result = await this.provider.signMessage({ message, recipient: recipientDomain });
        return result.signature;
    }
    getProvider() {
        return this.provider;
    }
    _getProvider() {
        if (this.provider)
            return this.provider;
        if (typeof window === 'undefined')
            return null;
        return window.meteorWallet ?? null;
    }
    _isTransfer(action) {
        return 'receiverId' in action && 'amount' in action;
    }
    async _sendActions(actions) {
        if (!this.provider)
            throw new Error('Meteor Wallet not connected');
        if (actions.length === 1 && this._isTransfer(actions[0])) {
            const transfer = actions[0];
            return this.provider.sendMoney({ receiverId: transfer.receiverId, amount: transfer.amount });
        }
        const nearActions = actions.map((a) => {
            if (this._isTransfer(a)) {
                return {
                    type: 'Transfer',
                    params: { deposit: a.amount },
                };
            }
            const fc = a;
            return {
                type: 'FunctionCall',
                params: {
                    contractId: fc.contractId,
                    methodName: fc.methodName,
                    args: fc.args ? JSON.parse(fc.args) : {},
                    gas: fc.gas ?? '30000000000000',
                    deposit: fc.deposit,
                },
            };
        });
        const receiverId = this._isTransfer(actions[0])
            ? actions[0].receiverId
            : actions[0].contractId;
        return this.provider.signAndSendTransaction({ receiverId, actions: nearActions });
    }
}
/* ------------------------------------------------------------------ */
/*  NearChainAdapter                                                   */
/* ------------------------------------------------------------------ */
/**
 * NEAR chain adapter implementing ChainAdapter from @cinacoin/core-sdk.
 *
 * Provides a unified interface for NEAR wallet operations:
 * - Wallet connection (NEAR Wallet, Here Wallet, Meteor Wallet)
 * - Transaction signing and sending
 * - NEAR token transfers
 * - NEAR account system support
 */
export class NearChainAdapter {
    constructor() {
        this.id = 'near';
        this.name = 'NEAR Adapter';
        this.chains = [...NEAR_CHAINS];
        this.activeConnector = null;
        this.connectorInstance = null;
        this.rpcUrl = NEAR_CHAINS[0].rpcUrl;
        // Wallet connector instances (lazy-created)
        this._nearWallet = null;
        this._hereWallet = null;
        this._meteorWallet = null;
    }
    /* ---- Configuration ---- */
    /** Register supported NEAR chains. */
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
        // NEAR client configuration is handled via RPC URL
    }
    /** Get the active wallet connector. */
    getActiveConnector() {
        return this.activeConnector;
    }
    /** Get the currently connected account id. */
    getAccountId() {
        return this.activeConnector?.getAccountId() ?? null;
    }
    /* ---- Connection ---- */
    /**
     * Connect to a NEAR wallet.
     * @param walletId - Wallet id ('near-wallet', 'here-wallet', or 'meteor-wallet').
     *                   Auto-detects if omitted.
     * @returns The connected NEAR account id (e.g. "alice.near").
     */
    async connect(walletId) {
        const connector = this._resolveConnector(walletId);
        if (!connector) {
            throw new Error('No NEAR wallet found. Install NEAR Wallet (https://wallet.near.org), ' +
                'Here Wallet (https://www.herewallet.app), or Meteor Wallet (https://wallet.meteorwallet.app)');
        }
        const accountId = await connector.connect();
        this.activeConnector = connector;
        return accountId;
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
        const accountId = this.activeConnector?.getAccountId();
        return accountId ? [accountId] : [];
    }
    /**
     * Get native balance for a NEAR account.
     * @param accountId - NEAR account id (e.g. "alice.near").
     * @returns Balance in NEAR (as a decimal string, e.g. "12.345").
     */
    async getBalance(accountId) {
        if (!this._isValidAccountId(accountId)) {
            throw new Error(`Invalid NEAR account id: ${accountId}`);
        }
        // Try connector's balance method first
        if (this.activeConnector) {
            const provider = this.activeConnector;
            const p = provider.getProvider?.();
            if (p?.getBalance) {
                const balance = await p.getBalance(accountId);
                return this._yoctoToNear(balance.total);
            }
        }
        // Fallback: JSON-RPC
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'query',
                params: {
                    request_type: 'view_account',
                    finality: 'final',
                    account_id: accountId,
                },
            }),
        });
        const data = (await response.json());
        if (data.error)
            throw new Error(data.error.message);
        if (!data.result)
            throw new Error('No balance result');
        return this._yoctoToNear(data.result.amount);
    }
    /**
     * Sign a NEAR transaction.
     * @param tx - Transaction as NearTransaction or raw format.
     * @returns Transaction hash (not broadcast).
     */
    async signTransaction(tx) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        const nearTx = this._toNearTransaction(tx);
        return this.activeConnector.signTransaction(nearTx);
    }
    /**
     * Send a NEAR transaction (sign + broadcast).
     * @param tx - Transaction as NearTransaction or raw format.
     * @returns Transaction hash.
     */
    async sendTransaction(tx) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        const nearTx = this._toNearTransaction(tx);
        const result = await this.activeConnector.sendTransaction(nearTx);
        return result.transactionHash;
    }
    /**
     * Send a NEAR token transfer.
     * @param receiverId - Recipient NEAR account id.
     * @param amount - Amount in yoctoNEAR (string to handle large numbers).
     * @returns Transaction hash.
     */
    async sendTransfer(receiverId, amount) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        const tx = {
            actions: { receiverId, amount },
        };
        const result = await this.activeConnector.sendTransaction(tx);
        return result.transactionHash;
    }
    /**
     * Sign a message with the connected wallet.
     * @param message - Message to sign.
     * @returns Signature as a string.
     */
    async signMessage(message) {
        if (!this.activeConnector) {
            throw new Error('No wallet connected. Call connect() first.');
        }
        return this.activeConnector.signMessage(message);
    }
    /**
     * NEAR does not have chain switching like EVM — it uses separate networks.
     * This method switches the RPC URL to match the target chain.
     * @param _chainId - Chain ID (mapped to chain).
     */
    async switchChain(_chainId) {
        // NEAR uses network switching rather than chain ID switching
        // The wallet handles network selection internally
    }
    /* ---- Utility ---- */
    /** Find a NEAR chain by its ID. */
    findChain(chainId) {
        return this.chains.find((c) => {
            const ref = c.id.split(':')[1];
            return parseInt(ref, 10) === chainId || c.id.includes(String(chainId));
        });
    }
    /** Get supported NEAR wallets with availability status. */
    getSupportedWallets() {
        return NEAR_WALLETS.map((w) => ({
            ...w,
            available: this._getConnector(w.id)?.isAvailable() ?? false,
        }));
    }
    /** Validate a NEAR account id. */
    static isValidAccountId(accountId) {
        // NEAR account ids: 2-64 chars, lowercase alphanumeric + hyphens, ends with .near or .testnet
        if (accountId.length < 2 || accountId.length > 64)
            return false;
        return /^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)*$/.test(accountId);
    }
    /* ---- Private helpers ---- */
    _resolveConnector(walletId) {
        if (walletId) {
            return this._getConnector(walletId);
        }
        // Auto-detect: NEAR Wallet → Here Wallet → Meteor Wallet
        const nearWallet = this._getConnector('near-wallet');
        if (nearWallet?.isAvailable())
            return nearWallet;
        const hereWallet = this._getConnector('here-wallet');
        if (hereWallet?.isAvailable())
            return hereWallet;
        const meteorWallet = this._getConnector('meteor-wallet');
        if (meteorWallet?.isAvailable())
            return meteorWallet;
        return null;
    }
    _getConnector(walletId) {
        switch (walletId) {
            case 'near-wallet':
                if (!this._nearWallet)
                    this._nearWallet = new NearWalletConn();
                return this._nearWallet.isAvailable() ? this._nearWallet : null;
            case 'here-wallet':
                if (!this._hereWallet)
                    this._hereWallet = new HereWalletConnector();
                return this._hereWallet.isAvailable() ? this._hereWallet : null;
            case 'meteor-wallet':
                if (!this._meteorWallet)
                    this._meteorWallet = new MeteorWalletConnector();
                return this._meteorWallet.isAvailable() ? this._meteorWallet : null;
            default:
                return null;
        }
    }
    _toNearTransaction(tx) {
        if (typeof tx === 'object' && tx !== null && 'actions' in tx) {
            return tx;
        }
        // Support simplified format: { receiverId, amount } for transfers
        if (typeof tx === 'object' && tx !== null && 'receiverId' in tx && 'amount' in tx) {
            const obj = tx;
            return { actions: { receiverId: obj.receiverId, amount: obj.amount } };
        }
        // Support simplified format: { contractId, methodName, args } for function calls
        if (typeof tx === 'object' && tx !== null && 'contractId' in tx && 'methodName' in tx) {
            const obj = tx;
            return {
                actions: {
                    contractId: obj.contractId,
                    methodName: obj.methodName,
                    args: obj.args ?? '{}',
                    deposit: obj.deposit ?? '0',
                    gas: obj.gas,
                },
            };
        }
        throw new Error('Invalid transaction format');
    }
    _isValidAccountId(accountId) {
        return NearChainAdapter.isValidAccountId(accountId);
    }
    /** Convert yoctoNEAR to NEAR (24 decimals). */
    _yoctoToNear(yocto) {
        // Handle big numbers via string manipulation
        const padded = yocto.padStart(25, '0');
        const integerPart = padded.slice(0, padded.length - 24);
        const fractionalPart = padded.slice(padded.length - 24);
        // Remove trailing zeros from fractional part
        const trimmedFraction = fractionalPart.replace(/0+$/, '');
        if (trimmedFraction.length === 0) {
            return integerPart || '0';
        }
        return `${integerPart}.${trimmedFraction}`;
    }
}
//# sourceMappingURL=NearAdapter.js.map