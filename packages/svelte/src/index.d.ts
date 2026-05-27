/**
 * @cinacoin/svelte — Svelte/SvelteKit adapter for Cinacoin.
 *
 * Provides Svelte stores, composables, and components that wrap
 * @cinacoin/core-sdk for seamless wallet integration in Svelte apps.
 *
 * @packageDocumentation
 */
export { createCinacoin } from './lib/createCinacoin.js';
export type { CinacoinContext, CreateCinacoinOptions } from './lib/createCinacoin.js';
export { isConnected, address, balance, chainId, status, error, isConnecting, hasError, chains, initCinacoin, getConnector, open, close, switchChain, resetCinacoin, } from './lib/stores.js';
export { getCinacoin, getCinacoinAccount, getCinacoinNetwork } from './lib/useCinacoin.js';
export { cinaConnectConnect, cinaConnectNetwork } from './lib/actions.js';
export type { CinacoinConnectParams, CinacoinNetworkParams } from './lib/actions.js';
export { default as CinacoinButton } from './components/CinacoinButton.svelte';
export { default as CinacoinAccountButton } from './components/CinacoinAccountButton.svelte';
export { default as CinacoinNetworkButton } from './components/CinacoinNetworkButton.svelte';
export type { Chain, ConnectParams, ConnectionResult, ConnectionStatus, AppMetadata, } from '@cinacoin/core-sdk';
//# sourceMappingURL=index.d.ts.map