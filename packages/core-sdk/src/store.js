/**
 * Zustand-based state management for the Cinacoin SDK.
 */
import { create } from 'zustand';
/** Create the SDK store. */
export const createCinacoinStore = () => create((set) => ({
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
    setConnection: ({ accounts, chainId, sessionId, connectorId }) => set({ status: 'connected', accounts, chainId, sessionId, connectorId, error: null }),
    setError: (error) => set({ status: 'error', error }),
    setChains: (chains) => set({ chains }),
    setActiveChain: (activeChain) => set({ activeChain }),
    addPairing: (pairing) => set((state) => ({
        pairings: [...state.pairings, pairing],
        activePairing: pairing,
    })),
    setActivePairing: (activePairing) => set({ activePairing }),
    setRelayUrl: (relayUrl) => set({ relayUrl }),
    setProjectId: (projectId) => set({ projectId }),
    disconnect: () => set({
        status: 'disconnected',
        accounts: [],
        chainId: null,
        sessionId: null,
        connectorId: null,
        error: null,
        activePairing: null,
    }),
}));
/** Initialize the SDK store with configuration. */
export function initializeStore(config) {
    const store = createCinacoinStore();
    store.getState().setRelayUrl(config.relayUrl);
    store.getState().setProjectId(config.projectId);
    store.getState().setChains(config.chains);
    return store;
}
//# sourceMappingURL=store.js.map