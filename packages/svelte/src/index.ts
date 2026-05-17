/**
 * @cinaconnect/svelte — Svelte/SvelteKit adapter for CinaConnect.
 *
 * Provides Svelte stores, composables, and components that wrap
 * @cinaconnect/core-sdk for seamless wallet integration in Svelte apps.
 *
 * @packageDocumentation
 */

// Core stores and factory
export { createCinaConnect } from './lib/createCinaConnect.js';
export type { CinaConnectContext, CreateCinaConnectOptions } from './lib/createCinaConnect.js';

// Svelte stores
export {
  isConnected,
  address,
  balance,
  chainId,
  status,
  error,
  isConnecting,
  hasError,
  chains,
  initCinaConnect,
  getConnector,
  open,
  close,
  switchChain,
  resetCinaConnect,
} from './lib/stores.js';

// Svelte hook-style accessors
export { getCinaConnect, getCinaConnectAccount, getCinaConnectNetwork } from './lib/useCinaConnect.js';

// Actions
export { cinaConnectConnect, cinaConnectNetwork } from './lib/actions.js';
export type { CinaConnectConnectParams, CinaConnectNetworkParams } from './lib/actions.js';

// Svelte components
export { default as CinaConnectButton } from './components/CinaConnectButton.svelte';
export { default as CinaConnectAccountButton } from './components/CinaConnectAccountButton.svelte';
export { default as CinaConnectNetworkButton } from './components/CinaConnectNetworkButton.svelte';

// Re-export core-sdk types used across the adapter
export type {
  Chain,
  ConnectParams,
  ConnectionResult,
  ConnectionStatus,
  AppMetadata,
} from '@cinaconnect/core-sdk';
