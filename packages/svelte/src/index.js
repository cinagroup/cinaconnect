/**
 * @cinacoin/svelte — Svelte/SvelteKit adapter for Cinacoin.
 *
 * Provides Svelte stores, composables, and components that wrap
 * @cinacoin/core-sdk for seamless wallet integration in Svelte apps.
 *
 * @packageDocumentation
 */
// Core stores and factory
export { createCinacoin } from './lib/createCinacoin.js';
// Svelte stores
export { isConnected, address, balance, chainId, status, error, isConnecting, hasError, chains, initCinacoin, getConnector, open, close, switchChain, resetCinacoin, } from './lib/stores.js';
// Svelte hook-style accessors
export { getCinacoin, getCinacoinAccount, getCinacoinNetwork } from './lib/useCinacoin.js';
// Actions
export { cinaConnectConnect, cinaConnectNetwork } from './lib/actions.js';
// Svelte components
export { default as CinacoinButton } from './components/CinacoinButton.svelte';
export { default as CinacoinAccountButton } from './components/CinacoinAccountButton.svelte';
export { default as CinacoinNetworkButton } from './components/CinacoinNetworkButton.svelte';
//# sourceMappingURL=index.js.map