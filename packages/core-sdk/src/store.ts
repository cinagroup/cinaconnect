/**
 * Zustand-based state management for the Cinacoin SDK.
 */

import { create } from 'zustand';
import type { Chain, ConnectParams, ConnectionResult, PairingData } from './types.js';

/** SDK connection state. */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** SDK state managed by Zustand. */
export interface CinacoinState {
  // Connection state
  status: ConnectionStatus;
  accounts: string[];
  chainId: number | null;
  sessionId: string | null;
  connectorId: string | null;
  error: Error | null;

  // Chain configuration
  chains: Chain[];
  activeChain: Chain | null;

  // Pairing
  pairings: PairingData[];
  activePairing: PairingData | null;

  // Relay configuration
  relayUrl: string | null;
  projectId: string | null;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setConnection: (result: ConnectionResult) => void;
  setError: (error: Error | null) => void;
  setChains: (chains: Chain[]) => void;
  setActiveChain: (chain: Chain | null) => void;
  addPairing: (pairing: PairingData) => void;
  setActivePairing: (pairing: PairingData | null) => void;
  setRelayUrl: (url: string) => void;
  setProjectId: (id: string) => void;
  disconnect: () => void;
}

/** Create the SDK store. */
export const createCinacoinStore = () =>
  create<CinacoinState>((set) => ({
    // Initial state
    status: 'disconnected',
    accounts: [],
    chainId: null,
    sessionId: null,
    connectorId: null,
    error: null,

    chains: [],
    activeChain: null,

    pairings: [],
    activePairing: null,

    relayUrl: null,
    projectId: null,

    // Actions
    setStatus: (status) => set({ status, error: null }),
    setConnection: ({ accounts, chainId, sessionId, connectorId }) =>
      set({ status: 'connected', accounts, chainId, sessionId, connectorId, error: null }),
    setError: (error) => set({ status: 'error', error }),
    setChains: (chains) => set({ chains }),
    setActiveChain: (activeChain) => set({ activeChain }),
    addPairing: (pairing) =>
      set((state) => ({
        pairings: [...state.pairings, pairing],
        activePairing: pairing,
      })),
    setActivePairing: (activePairing) => set({ activePairing }),
    setRelayUrl: (relayUrl) => set({ relayUrl }),
    setProjectId: (projectId) => set({ projectId }),
    disconnect: () =>
      set({
        status: 'disconnected',
        accounts: [],
        chainId: null,
        sessionId: null,
        connectorId: null,
        error: null,
        activePairing: null,
      }),
  }));

/**
 * SDK configuration for store initialization.
 */
export interface StoreConfig {
  relayUrl: string;
  projectId: string;
  chains: Chain[];
}

/** Initialize the SDK store with configuration. */
export function initializeStore(config: StoreConfig) {
  const store = createCinacoinStore();
  store.getState().setRelayUrl(config.relayUrl);
  store.getState().setProjectId(config.projectId);
  store.getState().setChains(config.chains);
  return store;
}
