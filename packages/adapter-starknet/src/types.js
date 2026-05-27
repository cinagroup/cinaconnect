/**
 * Starknet-specific types for the @cinacoin/adapter-starknet package.
 */
/* ------------------------------------------------------------------ */
/*  Starknet chain presets                                             */
/* ------------------------------------------------------------------ */
/** Well-known Starknet chain presets. */
export const STARKNET_CHAINS = [
    {
        id: 'starknet:mainnet',
        name: 'Starknet Mainnet',
        rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        explorerUrl: 'https://starkscan.co',
        iconUrl: 'https://starknet.io/favicon.ico',
    },
    {
        id: 'starknet:sepolia',
        name: 'Starknet Sepolia',
        rpcUrl: 'https://starknet-sepolia.public.blastapi.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        explorerUrl: 'https://sepolia.starkscan.co',
        iconUrl: 'https://starknet.io/favicon.ico',
    },
];
/** Supported Starknet wallets. */
export const STARKNET_WALLETS = [
    {
        id: 'argent-x',
        name: 'Argent X',
        rdns: 'im.argent.contract',
        icon: 'https://www.argent.xyz/favicon.ico',
        downloadUrl: 'https://www.argent.xyz/argent-x/',
    },
    {
        id: 'braavos',
        name: 'Braavos',
        rdns: 'app.braavos.wallet',
        icon: 'https://braavos.app/favicon.ico',
        downloadUrl: 'https://braavos.app/',
    },
];
//# sourceMappingURL=types.js.map