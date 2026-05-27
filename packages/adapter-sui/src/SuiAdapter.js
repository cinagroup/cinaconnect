/**
 * Sui Chain Adapter — provides Sui-specific blockchain operations.
 *
 * Implements the {@link ChainAdapter} interface from @cinacoin/core-sdk
 * and adds Sui-native methods for object queries, SUI balance lookups,
 * and transaction execution on the Sui network.
 *
 * Supports Sui Wallet, Ethos, Suiet, and Martian wallet connectors.
 *
 * @example
 * ```ts
 * import { SuiChainAdapter, SUI_CHAINS } from '@cinacoin/adapter-sui';
 *
 * const adapter = new SuiChainAdapter();
 * adapter.registerChains(SUI_CHAINS);
 *
 * await adapter.connect();
 * const balance = await adapter.getBalance(adapter.getAddress()!);
 * console.log(`Balance: ${balance} SUI`);
 * ```
 *
 * @packageDocumentation
 */
import { isValidSuiAddress, } from './types.js';
import { SuiWalletConnector } from './connectors/sui-wallet.js';
import { EthosConnector } from './connectors/ethos.js';
import { SuietConnector } from './connectors/suiet.js';
import { MartianConnector } from './connectors/martian.js';
/* ------------------------------------------------------------------ */
/*  Sui chain presets                                                  */
/* ------------------------------------------------------------------ */
/** Well-known Sui chain presets. */
export const SUI_CHAINS = [
    {
        id: 'sui:mainnet',
        name: 'Sui Mainnet',
        rpcUrl: 'https://fullnode.mainnet.sui.io:443',
        explorerUrl: 'https://suiscan.xyz/mainnet',
    },
    {
        id: 'sui:testnet',
        name: 'Sui Testnet',
        rpcUrl: 'https://fullnode.testnet.sui.io:443',
        faucetUrl: 'https://faucet.testnet.sui.io/v1/gas',
        explorerUrl: 'https://suiscan.xyz/testnet',
    },
    {
        id: 'sui:devnet',
        name: 'Sui Devnet',
        rpcUrl: 'https://fullnode.devnet.sui.io:443',
        faucetUrl: 'https://faucet.devnet.sui.io/v1/gas',
        explorerUrl: 'https://suiscan.xyz/devnet',
    },
    {
        id: 'sui:localnet',
        name: 'Sui Localnet',
        rpcUrl: 'http://127.0.0.1:9000',
        explorerUrl: '',
    },
];
export const SUI_WALLETS = [
    {
        id: 'sui-wallet',
        name: 'Sui Wallet',
        icon: 'https://sui.io/favicon.svg',
        rdns: 'sui-wallet',
        downloadUrl: 'https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmalkbfppkfmjfjj',
    },
    {
        id: 'ethos',
        name: 'Ethos Wallet',
        icon: 'https://ethoswallet.xyz/favicon.svg',
        rdns: 'xyz.ethos.wallet',
        downloadUrl: 'https://ethoswallet.xyz',
    },
    {
        id: 'suiet',
        name: 'Suiet Wallet',
        icon: 'https://suiet.app/favicon.svg',
        rdns: 'app.suiet',
        downloadUrl: 'https://suiet.app',
    },
    {
        id: 'martian',
        name: 'Martian Wallet',
        icon: 'https://martianwallet.xyz/favicon.svg',
        rdns: 'xyz.martianwallet',
        downloadUrl: 'https://martianwallet.xyz',
    },
];
/**
 * Convert MIST to SUI (1 SUI = 10^9 MIST).
 */
export function mistToSui(mist) {
    const mistNum = BigInt(mist);
    const whole = mistNum / 1000000000n;
    const frac = mistNum % 1000000000n;
    if (frac === 0n)
        return whole.toString();
    const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
    return `${whole}.${fracStr}`;
}
/**
 * Convert SUI to MIST.
 */
export function suiToMist(sui) {
    if (typeof sui === 'bigint')
        return sui * 1000000000n;
    const str = String(sui);
    const [whole, frac] = str.split('.');
    const wholePart = BigInt(whole || '0') * 1000000000n;
    if (!frac)
        return wholePart;
    const fracPadded = frac.padEnd(9, '0').slice(0, 9);
    return wholePart + BigInt(fracPadded);
}
/* ------------------------------------------------------------------ */
/*  SuiChainAdapter                                                     */
/* ------------------------------------------------------------------ */
/**
 * Sui chain adapter implementing chain-specific operations.
 *
 * Wraps a connector/provider with Sui-specific JSON-RPC calls for
 * balance queries, object lookups, transaction signing and execution.
 *
 * Implements {@link ChainAdapter} for compatibility with the core SDK.
 */
export class SuiChainAdapter {
    constructor() {
        this.id = 'sui';
        this.name = 'Sui Chain Adapter';
        this.provider = null;
        this.chains = new Map();
        this.currentNetwork = 'mainnet';
        this.rpcUrl = SUI_CHAINS[0].rpcUrl;
        /** Registered connectors for discovery. */
        this.connectors = [];
        // Register default connectors
        this.registerConnector(new SuiWalletConnector());
        this.registerConnector(new SuietConnector());
        this.registerConnector(new EthosConnector());
        this.registerConnector(new MartianConnector());
        // Register default chains
        for (const chain of SUI_CHAINS) {
            this.chains.set(chain.id, chain);
        }
    }
    /* ---- Connector Management ---- */
    /**
     * Register a Sui wallet connector for discovery.
     */
    registerConnector(connector) {
        if (!this.connectors.some((c) => c.id === connector.id)) {
            this.connectors.push(connector);
        }
    }
    /**
     * Get all registered connectors.
     */
    getConnectors() {
        return [...this.connectors];
    }
    /**
     * Get connectors that are currently available (wallet installed).
     */
    getAvailableConnectors() {
        return this.connectors.filter((c) => c.isAvailable());
    }
    /* ---- ChainAdapter Implementation ---- */
    /**
     * Set the underlying connector (compatibility shim).
     * @deprecated Use the adapter's own connect() method instead.
     */
    setConnector(connector) {
        // No-op for now — connector integration with core SDK Connector
        // is handled through the adapter's own wallet connector system.
    }
    /**
     * Register supported Sui chains.
     *
     * @param chains - Array of chain definitions. Each chain must have
     *   an `id` (e.g. "sui:mainnet") and an `rpcUrl`.
     */
    registerChains(chains) {
        for (const chain of chains) {
            const preset = {
                id: chain.id,
                name: chain.name,
                rpcUrl: chain.rpcUrl ?? this.rpcUrl,
                explorerUrl: chain.explorerUrl ?? '',
            };
            this.chains.set(preset.id, preset);
        }
    }
    /**
     * Find a Sui chain by its ID.
     */
    findChain(chainId) {
        // Sui uses string-based chain IDs, so numeric lookup returns mainnet
        // by convention or undefined.
        for (const chain of this.chains.values()) {
            if (chain.id === `sui:mainnet`) {
                return {
                    id: chain.id,
                    name: chain.name,
                    rpcUrl: chain.rpcUrl,
                    nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
                    explorerUrl: chain.explorerUrl,
                };
            }
        }
        return undefined;
    }
    /**
     * Get connected account addresses.
     *
     * @returns Array with the connected Sui address, or empty array.
     */
    async getAccounts() {
        const address = this.provider?.account;
        return address ? [address] : [];
    }
    /**
     * Get SUI balance for an address.
     *
     * @param address - Sui address (hex with 0x prefix).
     * @returns Balance in SUI as a decimal string (e.g. "1.234").
     */
    async getBalance(address, coinType) {
        if (!isValidSuiAddress(address)) {
            throw new Error(`Invalid Sui address: ${address}`);
        }
        const coin = coinType ?? '0x2::sui::SUI';
        try {
            const result = await this._rpcCall('suix_getBalance', [
                address,
                coin,
            ]);
            return mistToSui(result.totalBalance);
        }
        catch {
            return '0';
        }
    }
    /**
     * Send a transaction (alias for executeTransaction for ChainAdapter compat).
     *
     * @param tx - Serialized transaction bytes as a base64 string.
     * @returns Transaction digest.
     */
    async sendTransaction(tx) {
        const txBytes = typeof tx === 'string' ? tx : tx.txBytes;
        return this.executeTransaction(txBytes);
    }
    /**
     * Sign a message.
     *
     * @param message - Message string to sign.
     * @returns Signature as a base64 string.
     */
    async signMessage(message) {
        if (!this.provider)
            throw new Error('No provider connected');
        if (!this.provider.signMessage) {
            throw new Error('Connected wallet does not support message signing');
        }
        const result = await this.provider.signMessage(message);
        return result.signature;
    }
    async switchChain(identifier) {
        let network;
        if (typeof identifier === 'number') {
            // Numeric mapping: 0 → mainnet, 1 → testnet, 2 → devnet, 3 → localnet
            const mapping = ['mainnet', 'testnet', 'devnet', 'localnet'];
            network = mapping[identifier] ?? 'mainnet';
        }
        else if (identifier.startsWith('sui:')) {
            const net = identifier.split(':')[1];
            network = net;
        }
        else {
            network = identifier;
        }
        const chain = this.chains.get(`sui:${network}`);
        if (!chain) {
            throw new Error(`Unknown Sui network: ${network}`);
        }
        this.currentNetwork = network;
        this.rpcUrl = chain.rpcUrl;
    }
    /* ---- Sui-Specific Methods ---- */
    /**
     * Get the currently connected address.
     *
     * @returns The Sui address string, or null if not connected.
     */
    getAddress() {
        return this.provider?.account ?? null;
    }
    /**
     * Connect to a Sui wallet.
     *
     * If `walletId` is provided, attempts to connect using that specific
     * connector. Otherwise, tries available connectors in order:
     * Sui Wallet → Suiet → Ethos.
     *
     * @param walletId - Optional wallet connector id
     *   ("sui-wallet", "ethos", "suiet").
     * @returns Connected address.
     */
    async connect(walletId) {
        let connector;
        if (walletId) {
            connector = this.connectors.find((c) => c.id === walletId);
            if (!connector)
                throw new Error(`Unknown Sui wallet connector: ${walletId}`);
        }
        // Try specific connector or auto-detect
        if (connector) {
            if (!connector.isAvailable()) {
                throw new Error(`${connector.name} is not installed.`);
            }
            const result = await connector.connect();
            this.provider = connector.getProvider();
            this._bindProviderEvents();
            return result.accounts[0];
        }
        // Auto-detect: Sui Wallet → Suiet → Ethos → Martian
        const available = this.getAvailableConnectors();
        if (available.length === 0) {
            throw new Error('No Sui wallet found. Install Sui Wallet, Suiet, Ethos Wallet, or Martian Wallet.');
        }
        const result = await available[0].connect();
        this.provider = available[0].getProvider();
        this._bindProviderEvents();
        return result.accounts[0];
    }
    /**
     * Disconnect from the current wallet.
     */
    async disconnect() {
        if (this.provider) {
            await this.provider.disconnect();
            this.provider = null;
        }
    }
    /**
     * Whether a wallet is currently connected.
     */
    isConnected() {
        return this.provider?.connected ?? false;
    }
    /**
     * Get the current Sui network.
     */
    getNetwork() {
        return this.currentNetwork;
    }
    /**
     * Get the current RPC URL.
     */
    getRpcUrl() {
        return this.rpcUrl;
    }
    /* ---- Transaction Operations ---- */
    /**
     * Sign a Sui transaction.
     *
     * @param tx - Serialized transaction bytes as a base64 string.
     * @returns Signed transaction bytes and signature.
     */
    async signTransaction(tx) {
        if (!this.provider)
            throw new Error('No provider connected. Call connect() first.');
        return this.provider.signTransaction(tx);
    }
    /**
     * Execute a Sui transaction on the network.
     *
     * This signs the transaction via the connected wallet and submits it
     * to the Sui network, waiting for local execution confirmation.
     *
     * @param tx - Serialized transaction bytes as a base64 string.
     * @returns Transaction digest (hash).
     */
    async executeTransaction(tx, options) {
        if (!this.provider)
            throw new Error('No provider connected. Call connect() first.');
        const result = await this.provider.signAndExecuteTransaction(tx, {
            requestType: options?.requestType ?? 'WaitForLocalExec',
        });
        return result.digest;
    }
    /**
     * Build and execute a SUI coin transfer.
     *
     * Convenience method that constructs a TransferSUI transaction
     * and executes it through the connected wallet.
     *
     * @param params - Transfer parameters.
     * @returns Transaction digest.
     */
    async transferSui(params) {
        if (!isValidSuiAddress(params.recipient)) {
            throw new Error(`Invalid recipient address: ${params.recipient}`);
        }
        if (!this.provider)
            throw new Error('No provider connected. Call connect() first.');
        // Build a simple PaySui transaction call
        const txCall = {
            target: '0x2::pay::split_and_transfer',
            typeArguments: ['0x2::sui::SUI'],
            arguments: [
                params.recipient,
                params.amount ? String(params.amount) : null, // null = full balance
            ],
        };
        // The transaction bytes would be built by the wallet or a Move call builder.
        // For now, we delegate to the wallet's signAndExecuteTransaction.
        // In a full implementation, you'd use @mysten/sui.js TransactionBlock here.
        const txBytes = JSON.stringify(txCall);
        const result = await this.provider.signAndExecuteTransaction(txBytes);
        return result.digest;
    }
    /**
     * Build a Move function call transaction.
     *
     * @param call - Move function call descriptor.
     * @returns Transaction bytes as base64 string.
     */
    buildMoveCall(call) {
        return btoa(JSON.stringify(call));
    }
    /* ---- Query Operations ---- */
    /**
     * Query a Sui object by its ID.
     *
     * @param objectId - Sui object ID (hex with 0x prefix).
     * @returns Object response with data or error.
     */
    async getObject(objectId) {
        return this._rpcCall('sui_getObject', [
            objectId,
            {
                showType: true,
                showOwner: true,
                showContent: true,
            },
        ]);
    }
    /**
     * Get all SUI coin objects owned by an address.
     *
     * @param address - Sui address.
     * @param cursor - Optional pagination cursor.
     * @returns Coin objects owned by the address.
     */
    async getCoins(address, coinType, cursor) {
        if (!isValidSuiAddress(address)) {
            throw new Error(`Invalid Sui address: ${address}`);
        }
        const type = coinType ?? '0x2::sui::SUI';
        return this._rpcCall('suix_getCoins', [address, type, cursor, null]);
    }
    /**
     * Get the total SUI balance (shortcut for getBalance).
     *
     * @param address - Sui address.
     * @returns Balance in SUI as a decimal string.
     */
    async getSuiBalance(address) {
        return this.getBalance(address);
    }
    /**
     * Get all coin types owned by an address.
     *
     * @param address - Sui address.
     */
    async getAllBalances(address) {
        if (!isValidSuiAddress(address)) {
            throw new Error(`Invalid Sui address: ${address}`);
        }
        return this._rpcCall('suix_getAllBalances', [address]);
    }
    /**
     * Get transaction effects by digest.
     *
     * @param digest - Transaction digest.
     */
    async getTransactionEffects(digest) {
        return this._rpcCall('sui_getTransactionBlock', [
            digest,
            { showEffects: true },
        ]);
    }
    /**
     * Get the current network epoch info.
     */
    async getEpochInfo() {
        return this._rpcCall('suix_getEpochs', [null, '1']);
    }
    /**
     * Get reference gas price for the current epoch.
     *
     * @returns Reference gas price in MIST.
     */
    async getReferenceGasPrice() {
        const result = await this._rpcCall('suix_getReferenceGasPrice', []);
        return result.referenceGasPrice;
    }
    /* ---- Private Helpers ---- */
    /**
     * Make a JSON-RPC call to the Sui full node.
     */
    async _rpcCall(method, params) {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params,
            }),
        });
        if (!response.ok) {
            throw new Error(`Sui RPC error: HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Sui RPC error: ${data.error.message ?? JSON.stringify(data.error)}`);
        }
        return data.result;
    }
    /**
     * Bind provider event listeners to clear state on disconnect.
     */
    _bindProviderEvents() {
        if (!this.provider)
            return;
        this.provider.on('disconnect', () => {
            this.provider = null;
        });
    }
}
//# sourceMappingURL=SuiAdapter.js.map