/**
 * Cinacoin Core SDK — Self-hosted wallet connection toolkit.
 *
 * A complete replacement for Reown/WalletConnect infrastructure,
 * providing self-hosted relay, RPC proxy, and client-side SDK.
 *
 * @packageDocumentation
 */
// Connector
export { Connector } from './connector.js';
// Session
export { SessionManager } from './session.js';
// State management
export { createCinacoinStore, initializeStore } from './store.js';
// Events
export { EventEmitter } from './events.js';
// EIP-6963
export { discoverWallets, watchWallets, findWalletByRdns } from './eip6963.js';
// Transports
export { RelayTransport } from './transports/relay.js';
export { InjectedProvider } from './transports/injected.js';
export { QRTransport } from './transports/qr.js';
// EVM Adapter
export { EvmAdapter } from './adapters/evm.js';
// viem Adapter (optional — requires viem peer dep)
export { ViemChainAdapter, createViemAdapter } from './adapters/viem.js';
// wagmi Adapter (optional — requires wagmi peer dep)
export { WagmiConnector, MultiChainConnector, createWagmiConnector, createMultiChainConnector, } from './adapters/wagmi.js';
// ethers v5 Adapter (optional — requires ethers@5 peer dep)
export { Ethers5Adapter } from './adapters/ethers5.js';
// ethers v6 Adapter (optional — requires ethers@6 peer dep)
export { Ethers6Adapter } from './adapters/ethers6.js';
// Solana Adapter (optional)
export { SolanaChainAdapter, SOLANA_CHAINS, SOLANA_WALLETS, isValidSolanaAddress, base58Decode, } from './adapters/solana.js';
// Bitcoin Adapter
export { BitcoinChainAdapter, BITCOIN_CHAINS, BITCOIN_WALLETS, validateBitcoinAddress, } from './adapters/bitcoin.js';
// TON Adapter
export { TONChainAdapter, TON_CHAINS, TON_WALLETS, isValidTONAddress, parseTONAddress, hexToBase64url, base64urlToHex, } from './adapters/ton.js';
// TRON Adapter
export { TRONChainAdapter, TRON_CHAINS, TRON_WALLETS, isValidTRONAddress, base58ToHex, hexToBase58, } from './adapters/tron.js';
// Polkadot Adapter (optional)
// export {
//   PolkadotChainAdapter,
//   POLKADOT_CHAINS,
//   POLKADOT_WALLETS,
//   decodeSS58,
//   isValidSS58Address,
// } from './adapters/polkadot.js';
// export type {
//   PolkadotTransaction,
//   PolkadotAssetTransfer,
//   SS58AddressInfo,
//   PolkadotWalletInfo as PolkadotWalletInfoType,
// } from './adapters/polkadot.js';
// Crypto
export { generateKeypair, sharedSecret, serializeKeypair, deserializeKeypair, bytesToHex, hexToBytes, } from './crypto/keypair.js';
export { encrypt, decrypt, deriveSymmetricKey, deriveTopic, generateNonce } from './crypto/encrypt.js';
// SIWE Authentication (optional — requires @cinacoin/siwe)
export { SIWEAuth } from './auth/siwe.js';
/**
 * Create a ChainAdapter from factory config.
 *
 * @param config - Adapter factory configuration.
 * @returns ChainAdapter instance.
 */
export async function createAdapter(config) {
    switch (config.type) {
        case 'viem': {
            const mod = await import('./adapters/viem.js');
            return mod.createViemAdapter(config.client, config.connector);
        }
        case 'wagmi': {
            const mod = await import('./adapters/wagmi.js');
            return mod.createMultiChainConnector(config.client);
        }
        case 'ethers5': {
            const mod = await import('./adapters/ethers5.js');
            return new mod.Ethers5Adapter(config.client);
        }
        case 'ethers6': {
            const mod = await import('./adapters/ethers6.js');
            return new mod.Ethers6Adapter(config.client);
        }
        case 'ton': {
            const mod = await import('./adapters/ton.js');
            const adapter = new mod.TONChainAdapter();
            if (config.chains)
                adapter.registerChains(config.chains);
            return adapter;
        }
        case 'tron': {
            const mod = await import('./adapters/tron.js');
            const adapter = new mod.TRONChainAdapter();
            if (config.chains)
                adapter.registerChains(config.chains);
            return adapter;
        }
        case 'polkadot': {
            const mod = await import('./adapters/polkadot.js');
            const adapter = new mod.PolkadotChainAdapter();
            if (config.chains)
                adapter.registerChains(config.chains);
            return adapter;
        }
        case 'solana': {
            const mod = await import('./adapters/solana.js');
            return new mod.SolanaChainAdapter();
        }
        default:
            throw new Error(`Unknown adapter type: ${config.type}`);
    }
}
// Deep Linking
export { generateDeepLink, registerWalletDeepLink, getAppStoreUrl, WALLET_DEEP_LINKS, generateUniversalLink, generateWalletConnectUniversalLink, smartRedirect, detectPlatform, } from './links/index.js';
/**
 * SDK version.
 */
export const VERSION = '0.1.0';
export * from './eip5792';
//# sourceMappingURL=index.js.map