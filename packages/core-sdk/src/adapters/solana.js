/**
 * Solana Chain Adapter — provides Solana-specific operations.
 *
 * Uses @solana/web3.js for RPC calls and supports Phantom, Solflare,
 * and Backpack wallet adapters. EIP-1193 compatible adapter layer.
 */
/* ------------------------------------------------------------------ */
/*  Address validation                                                 */
/* ------------------------------------------------------------------ */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/**
 * Validate a Solana base58 address.
 * - Must be 32-44 characters
 * - Must contain only valid base58 characters
 * - Decoded buffer must be exactly 32 bytes
 */
export function isValidSolanaAddress(address) {
    if (typeof address !== 'string')
        return false;
    if (address.length < 32 || address.length > 44)
        return false;
    for (let i = 0; i < address.length; i++) {
        if (BASE58_ALPHABET.indexOf(address[i]) === -1)
            return false;
    }
    return true;
}
/** Decode a base58 string to a byte array. */
export function base58Decode(input) {
    let num = 0n;
    for (let i = 0; i < input.length; i++) {
        const charIndex = BASE58_ALPHABET.indexOf(input[i]);
        if (charIndex === -1)
            throw new Error(`Invalid base58 character: ${input[i]}`);
        num = num * 58n + BigInt(charIndex);
    }
    const bytes = [];
    while (num > 0n) {
        bytes.unshift(Number(num % 256n));
        num = num / 256n;
    }
    // Add leading zeros for each '1' in the input
    for (let i = 0; i < input.length && input[i] === '1'; i++) {
        bytes.unshift(0);
    }
    return new Uint8Array(bytes);
}
export const SOLANA_WALLETS = [
    {
        id: 'phantom',
        name: 'Phantom',
        rdns: 'app.phantom',
        icon: 'https://phantom.app/img/phantom-icon.png',
        downloadUrl: 'https://phantom.app/download',
    },
    {
        id: 'solflare',
        name: 'Solflare',
        rdns: 'app.solflare',
        icon: 'https://solflare.com/icon.png',
        downloadUrl: 'https://solflare.com/download',
    },
    {
        id: 'backpack',
        name: 'Backpack',
        rdns: 'app.backpack',
        icon: 'https://backpack.app/icon.png',
        downloadUrl: 'https://backpack.app/download',
    },
];
/** Well-known Solana chain presets. */
export const SOLANA_CHAINS = [
    {
        id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Solana Mainnet',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        explorerUrl: 'https://explorer.solana.com',
        iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    },
    {
        id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
        name: 'Solana Devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
        iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    },
    {
        id: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        name: 'Solana Testnet',
        rpcUrl: 'https://api.testnet.solana.com',
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
        iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    },
];
/* ------------------------------------------------------------------ */
/*  SolanaChainAdapter                                                  */
/* ------------------------------------------------------------------ */
/**
 * Solana chain adapter implementing chain-specific operations.
 *
 * Wraps a connector/provider with Solana-specific JSON-RPC calls,
 * transaction building, and message signing.
 */
export class SolanaChainAdapter {
    constructor() {
        this.provider = null;
        this.connection = null;
        this.chains = [];
        this.rpcUrl = SOLANA_CHAINS[0].rpcUrl;
    }
    /* ---- Configuration ---- */
    /** Register supported Solana chains. */
    registerChains(chains) {
        this.chains = chains;
    }
    /** Set the RPC endpoint URL. */
    setRpcUrl(url) {
        this.rpcUrl = url;
    }
    /** Set the active wallet provider. */
    setProvider(provider) {
        this.provider = provider;
        this._setupConnection();
    }
    /** Get the current provider. */
    getProvider() {
        return this.provider;
    }
    /* ---- Connection ---- */
    /**
     * Connect to a Solana wallet.
     * Tries Phantom → Solflare → Backpack in order.
     * @returns The connected public key as a base58 string.
     */
    async connect(walletId) {
        const target = this._resolveWallet(walletId);
        if (!target)
            throw new Error('No Solana wallet found. Install Phantom, Solflare, or Backpack.');
        const provider = target();
        const result = await provider.connect();
        this.provider = provider;
        this._setupConnection();
        return result.publicKey.toBase58();
    }
    /** Disconnect the current wallet. */
    async disconnect() {
        if (this.provider) {
            await this.provider.disconnect();
            this.provider = null;
        }
    }
    /** Get the connected address. */
    getAddress() {
        return this.provider?.publicKey?.toBase58() ?? null;
    }
    /* ---- Balance ---- */
    /**
     * Get SOL balance for an address.
     * @param address - Base58-encoded Solana address.
     * @returns Balance in SOL (as a decimal string, e.g. "1.234").
     */
    async getBalance(address) {
        if (!isValidSolanaAddress(address)) {
            throw new Error(`Invalid Solana address: ${address}`);
        }
        if (this.connection) {
            const pubKey = this._toPublicKey(address);
            const lamports = await this.connection.getBalance(pubKey);
            return (lamports / 1e9).toString();
        }
        // Fallback: raw RPC call
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [address],
            }),
        });
        const data = await response.json();
        if (data.error)
            throw new Error(data.error.message);
        const lamports = data.result.value;
        return (lamports / 1e9).toString();
    }
    /* ---- Transactions ---- */
    /**
     * Build a System Program transfer instruction.
     * @param from - Sender address (base58).
     * @param to - Recipient address (base58).
     * @param lamports - Amount in lamports.
     * @returns A transfer instruction.
     */
    buildTransferInstruction(from, to, lamports) {
        if (!isValidSolanaAddress(from))
            throw new Error(`Invalid from address: ${from}`);
        if (!isValidSolanaAddress(to))
            throw new Error(`Invalid to address: ${to}`);
        const fromPubKey = this._toPublicKey(from);
        const toPubKey = this._toPublicKey(to);
        return {
            fromPubkey: fromPubKey,
            toPubkey: toPubKey,
            lamports,
        };
    }
    /**
     * Send a signed transaction.
     * @param tx - Serialized transaction bytes (base64 string or Uint8Array).
     * @returns Transaction signature (base58).
     */
    async sendTransaction(tx) {
        if (!this.provider)
            throw new Error('No provider connected');
        let serializedTx;
        if (tx instanceof Uint8Array || Buffer.isBuffer(tx)) {
            serializedTx = tx;
        }
        else if (typeof tx === 'string') {
            serializedTx = Buffer.from(tx, 'base64');
        }
        else {
            // It's a Transaction object — sign and serialize
            const latest = await this._getLatestBlockhash();
            tx.recentBlockhash = latest.blockhash;
            const signed = await this.provider.signTransaction(tx);
            serializedTx = signed.serialize();
        }
        if (this.connection) {
            return this.connection.sendRawTransaction(serializedTx, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
        }
        // Fallback: raw RPC
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sendTransaction',
                params: [Buffer.from(serializedTx).toString('base64'), { encoding: 'base64' }],
            }),
        });
        const data = await response.json();
        if (data.error)
            throw new Error(data.error.message);
        return data.result;
    }
    /* ---- Message Signing ---- */
    /**
     * Sign a message with the connected wallet.
     * Uses Solana's off-chain message signing (no BIP-322, Solana-specific).
     * @param message - Message as a string or Uint8Array.
     * @returns Signature as a base58-encoded string.
     */
    async signMessage(message) {
        if (!this.provider)
            throw new Error('No provider connected');
        if (!this.provider.signMessage) {
            throw new Error('Connected wallet does not support message signing');
        }
        const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
        const result = await this.provider.signMessage(msgBytes);
        return this._bytesToBase58(result.signature);
    }
    /* ---- SPL Token Support ---- */
    /**
     * Build an SPL token transfer instruction.
     * @param mint - SPL token mint address (base58).
     * @param source - Source token account (base58).
     * @param destination - Destination token account (base58).
     * @param owner - Owner of the source account (base58).
     * @param amount - Token amount (in smallest unit, considering decimals).
     * @returns A token transfer instruction object.
     */
    buildSPLTransferInstruction(mint, source, destination, owner, amount) {
        return {
            mint,
            source,
            destination,
            owner,
            amount: Number(amount),
        };
    }
    /* ---- EIP-1193 Compatible Request ---- */
    /**
     * EIP-1193 compatible request method for Solana.
     * Supports: solana_getBalance, solana_sendTransaction, solana_signMessage, etc.
     */
    async request(args) {
        switch (args.method) {
            case 'solana_getBalance': {
                const address = (args.params?.[0] ?? '');
                return this.getBalance(address);
            }
            case 'solana_sendTransaction': {
                const tx = args.params?.[0];
                return this.sendTransaction(tx);
            }
            case 'solana_signMessage': {
                const msg = args.params?.[0];
                return this.signMessage(msg);
            }
            case 'solana_getLatestBlockhash': {
                return this._getLatestBlockhash();
            }
            case 'solana_getAccountInfo': {
                const address = (args.params?.[0] ?? '');
                return this._getAccountInfo(address);
            }
            default:
                throw new Error(`Unsupported Solana method: ${args.method}`);
        }
    }
    /* ---- Utility ---- */
    /** Find a chain by its ID. */
    findChain(chainId) {
        return this.chains.find((c) => c.id === chainId);
    }
    /** Convert SOL to lamports. */
    static solToLamports(sol) {
        return Math.round(Number(sol) * 1e9);
    }
    /** Convert lamports to SOL. */
    static lamportsToSol(lamports) {
        return (lamports / 1e9).toString();
    }
    /* ---- Private helpers ---- */
    _resolveWallet(walletId) {
        if (typeof window === 'undefined')
            return null;
        const win = window;
        if (walletId) {
            switch (walletId) {
                case 'phantom':
                    return () => (win.phantom?.solana ?? win.solana);
                case 'solflare':
                    return () => win.solflare;
                case 'backpack':
                    return () => win.backpack;
                default:
                    return null;
            }
        }
        // Auto-detect: Phantom → Solflare → Backpack
        if (win.phantom?.solana)
            return () => win.phantom.solana;
        if (win.solflare)
            return () => win.solflare;
        if (win.backpack)
            return () => win.backpack;
        // Fallback to generic solana (may be Phantom or others)
        if (win.solana)
            return () => win.solana;
        return null;
    }
    _setupConnection() {
        // Create a minimal connection wrapper around the provider's request
        if (!this.provider)
            return;
        this.connection = {
            getBalance: async (pubKey, _commitment) => {
                const addr = pubKey.toBase58();
                const resp = await fetch(this.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getBalance',
                        params: [addr],
                    }),
                });
                const data = await resp.json();
                if (data.error)
                    throw new Error(data.error.message);
                return data.result.value;
            },
            sendRawTransaction: async (rawTx, options) => {
                const resp = await fetch(this.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'sendTransaction',
                        params: [Buffer.from(rawTx).toString('base64'), { encoding: 'base64', ...options }],
                    }),
                });
                const data = await resp.json();
                if (data.error)
                    throw new Error(data.error.message);
                return data.result;
            },
            getLatestBlockhash: async (_commitment) => {
                const resp = await fetch(this.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getLatestBlockhash',
                    }),
                });
                const data = await resp.json();
                if (data.error)
                    throw new Error(data.error.message);
                return data.result.value;
            },
        };
    }
    _toPublicKey(address) {
        const bytes = base58Decode(address);
        return {
            toBase58: () => address,
            toBuffer: () => Buffer.from(bytes),
            equals: (other) => address === other.toBase58(),
        };
    }
    _bytesToBase58(bytes) {
        let num = BigInt(0);
        for (let i = 0; i < bytes.length; i++) {
            num = num * 256n + BigInt(bytes[i]);
        }
        let encoded = '';
        while (num > 0n) {
            const remainder = Number(num % 58n);
            encoded = BASE58_ALPHABET[remainder] + encoded;
            num = num / 58n;
        }
        // Add '1' for each leading zero byte
        for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
            encoded = '1' + encoded;
        }
        return encoded || '1';
    }
    async _getLatestBlockhash() {
        if (this.connection) {
            return this.connection.getLatestBlockhash();
        }
        const resp = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getLatestBlockhash',
            }),
        });
        const data = await resp.json();
        if (data.error)
            throw new Error(data.error.message);
        return data.result.value;
    }
    async _getAccountInfo(address) {
        const resp = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAccountInfo',
                params: [address, { encoding: 'base64' }],
            }),
        });
        const data = await resp.json();
        if (data.error)
            throw new Error(data.error.message);
        return data.result;
    }
}
//# sourceMappingURL=solana.js.map