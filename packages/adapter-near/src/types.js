/**
 * NEAR-specific types for the @cinacoin/adapter-near package.
 */
/* ------------------------------------------------------------------ */
/*  NEAR chain presets                                                 */
/* ------------------------------------------------------------------ */
/** Well-known NEAR chain presets. */
export const NEAR_CHAINS = [
    {
        id: 'near:mainnet',
        name: 'NEAR Mainnet',
        rpcUrl: 'https://rpc.mainnet.near.org',
        nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
        explorerUrl: 'https://explorer.near.org',
        iconUrl: 'https://near.org/favicon.ico',
    },
    {
        id: 'near:testnet',
        name: 'NEAR Testnet',
        rpcUrl: 'https://rpc.testnet.near.org',
        nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
        explorerUrl: 'https://explorer.testnet.near.org',
        iconUrl: 'https://near.org/favicon.ico',
    },
];
/** Supported NEAR wallets. */
export const NEAR_WALLETS = [
    {
        id: 'near-wallet',
        name: 'NEAR Wallet',
        type: 'browser',
        icon: 'https://wallet.near.org/favicon.ico',
        downloadUrl: 'https://wallet.near.org',
    },
    {
        id: 'here-wallet',
        name: 'Here Wallet',
        type: 'mobile',
        icon: 'https://www.herewallet.app/favicon.ico',
        downloadUrl: 'https://www.herewallet.app',
    },
    {
        id: 'meteor-wallet',
        name: 'Meteor Wallet',
        type: 'extension',
        icon: 'https://wallet.meteorwallet.app/favicon.ico',
        downloadUrl: 'https://wallet.meteorwallet.app',
    },
];
//# sourceMappingURL=types.js.map