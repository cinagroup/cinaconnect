import { jsx as _jsx } from "react/jsx-runtime";
/**
 * WalletConnectProvider — Real WalletConnect v2 session management for React Native.
 *
 * Wraps @walletconnect/react-native-dapp (or the cinacoin core wrapper) to provide:
 * - Real pairing URI creation and QR display
 * - Deep-link wallet connection flow (MetaMask, Rainbow, Trust, Coinbase)
 * - Session lifecycle management (connect / disconnect / events)
 * - Balance fetching via on-chain RPC
 * - Transaction signing via WC v2 personal_sign / eth_sendTransaction
 *
 * This provider bridges the low-level WC v2 SDK with Cinacoin React Native components.
 */
import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, } from 'react';
import { Linking, Platform } from 'react-native';
import { WcSessionManager, buildSendTransaction, buildPersonalSign, buildWalletDeepLink, buildWalletUniversalLink, WC_METHODS, } from '@cinacoin/walletconnect-v2';
// ─── Default Deep Links ─────────────────────────────────────────────────────
export const WALLET_DEEP_LINKS = {
    metamask: {
        walletId: 'metamask',
        scheme: 'metamask://',
        universalLink: 'https://metamask.app.link',
        appStoreUrl: 'https://apps.apple.com/app/metamask/id1438668043',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=io.metamask',
        packageName: 'io.metamask',
    },
    rainbow: {
        walletId: 'rainbow',
        scheme: 'rainbow://',
        universalLink: 'https://rnbwapp.com',
        appStoreUrl: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=me.rainbow',
        packageName: 'me.rainbow',
    },
    trust: {
        walletId: 'trust',
        scheme: 'trust://',
        universalLink: 'https://link.trustwallet.com',
        appStoreUrl: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
        packageName: 'com.wallet.crypto.trustapp',
    },
    coinbase: {
        walletId: 'coinbase',
        scheme: 'cbwallet://',
        universalLink: 'https://go.cb-w.com',
        appStoreUrl: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=org.toshi',
        packageName: 'org.toshi',
    },
    walletconnect: {
        walletId: 'walletconnect',
        scheme: 'wc://',
        universalLink: 'https://walletconnect.com',
    },
    phantom: {
        walletId: 'phantom',
        scheme: 'phantom://',
        universalLink: 'https://phantom.app',
        appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phantom.app',
        packageName: 'com.phantom.app',
    },
    zerion: {
        walletId: 'zerion',
        scheme: 'zerion://',
        universalLink: 'https://zerion.io',
        appStoreUrl: 'https://apps.apple.com/app/zerion-defi-wallet/id1456732032',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=io.zerion.android',
        packageName: 'io.zerion.android',
    },
};
// ─── Context ────────────────────────────────────────────────────────────────
const WalletConnectContext = createContext(null);
/** Hook to access the WalletConnect context. Throws if used outside provider. */
export function useWalletConnect() {
    const ctx = useContext(WalletConnectContext);
    if (!ctx) {
        throw new Error('useWalletConnect must be used within <WalletConnectProvider>');
    }
    return ctx;
}
/**
 * WalletConnectProvider — real WC v2 session manager for React Native.
 *
 * Usage:
 * ```tsx
 * <WalletConnectProvider config={{ projectId, metadata, chains: ['eip155:1'] }}>
 *   <App />
 * </WalletConnectProvider>
 * ```
 */
export function WalletConnectProvider({ config, children }) {
    const [state, setState] = useState({
        session: null,
        pairingUri: null,
        connecting: false,
        error: null,
        balance: null,
    });
    const sessionManagerRef = useRef(null);
    const currentConfigRef = useRef(config);
    // ── Initialize ────────────────────────────────────────────────────────────
    const initialize = useCallback(async (cfg) => {
        currentConfigRef.current = cfg;
        // Destroy previous session manager
        sessionManagerRef.current?.disconnect().catch(() => { });
        sessionManagerRef.current = null;
        const chains = cfg.chains ?? ['eip155:1'];
        sessionManagerRef.current = new WcSessionManager({
            relayUrl: cfg.relayUrl ?? `wss://relay.walletconnect.com?projectId=${cfg.projectId}`,
            metadata: cfg.metadata,
            requiredChains: chains,
            optionalChains: cfg.optionalChains,
            methods: cfg.methods ?? WC_METHODS,
        });
        // Subscribe to WC events
        sessionManagerRef.current.on('wcEvent', (event) => {
            const evt = event;
            switch (evt.type) {
                case 'connected': {
                    const session = evt.session;
                    setState(prev => ({ ...prev, session, connecting: false, error: null }));
                    break;
                }
                case 'disconnected':
                    setState(prev => ({
                        ...prev,
                        session: null,
                        pairingUri: null,
                        balance: null,
                        connecting: false,
                    }));
                    break;
                case 'error':
                    setState(prev => ({
                        ...prev,
                        connecting: false,
                        error: evt.error?.message ?? 'Unknown error',
                    }));
                    break;
            }
        });
    }, []);
    // Auto-initialize on mount
    useEffect(() => {
        initialize(config).catch(() => { });
        return () => {
            sessionManagerRef.current?.disconnect().catch(() => { });
        };
    }, [initialize]);
    // ── Pairing ───────────────────────────────────────────────────────────────
    const createPairingUri = useCallback(async () => {
        if (!sessionManagerRef.current) {
            throw new Error('WalletConnectProvider not initialized — call initialize() first');
        }
        const uri = await sessionManagerRef.current.initiatePairing();
        setState(prev => ({ ...prev, pairingUri: uri, error: null }));
        return uri;
    }, []);
    const connectWithUri = useCallback(async (uri) => {
        if (!sessionManagerRef.current) {
            throw new Error('WalletConnectProvider not initialized');
        }
        setState(prev => ({ ...prev, connecting: true, error: null }));
        try {
            const session = await sessionManagerRef.current.connectWithUri(uri);
            setState(prev => ({ ...prev, session, pairingUri: null, connecting: false, error: null }));
            return session;
        }
        catch (err) {
            setState(prev => ({
                ...prev,
                connecting: false,
                error: err.message ?? 'Connection failed',
            }));
            throw err;
        }
    }, []);
    // ── Deep Link ─────────────────────────────────────────────────────────────
    const openWalletDeepLink = useCallback(async (walletId) => {
        const uri = state.pairingUri;
        if (!uri) {
            throw new Error('No pairing URI available — call createPairingUri() first');
        }
        const deepLink = buildWalletDeepLink(walletId, uri);
        const universalLink = buildWalletUniversalLink(walletId, uri);
        // Try deep link first
        if (deepLink) {
            try {
                const canOpen = await Linking.canOpenURL(deepLink);
                if (canOpen) {
                    await Linking.openURL(deepLink);
                    return;
                }
            }
            catch {
                // Fall through
            }
        }
        // Try universal link
        if (universalLink) {
            try {
                await Linking.openURL(universalLink);
                return;
            }
            catch {
                // Fall through
            }
        }
        // Suggest app store
        const walletLink = WALLET_DEEP_LINKS[walletId];
        const storeUrl = Platform.OS === 'ios' ? walletLink?.appStoreUrl : walletLink?.playStoreUrl;
        if (storeUrl) {
            await Linking.openURL(storeUrl);
        }
    }, [state.pairingUri]);
    // ── Disconnect ────────────────────────────────────────────────────────────
    const disconnect = useCallback(async () => {
        await sessionManagerRef.current?.disconnect();
        setState(prev => ({
            ...prev,
            session: null,
            pairingUri: null,
            balance: null,
            connecting: false,
        }));
    }, []);
    // ── JSON-RPC ──────────────────────────────────────────────────────────────
    const request = useCallback(async (method, params) => {
        if (!sessionManagerRef.current?.isConnected()) {
            throw new Error('No active session — connect first');
        }
        return sessionManagerRef.current.request(method, params);
    }, []);
    // ── Balance Fetching ──────────────────────────────────────────────────────
    const fetchBalance = useCallback(async () => {
        if (!state.session || state.session.accounts.length === 0) {
            throw new Error('No connected account');
        }
        // Extract chain ID from CAIP-2 account
        const account = state.session.accounts[0];
        const parts = account.split(':');
        const chainId = parts.length >= 2 ? parseInt(parts[1], 10) : 1;
        const address = parts.length >= 3 ? parts[2] : parts[0];
        // Build eth_call for eth_getBalance
        const balanceHex = await request('eth_getBalance', [address, 'latest']);
        const balanceWei = BigInt(balanceHex);
        const balanceEth = Number(balanceWei) / 1e18;
        const result = {
            balance: balanceEth.toFixed(4),
            symbol: 'ETH',
            decimals: 18,
            raw: balanceHex,
        };
        setState(prev => ({ ...prev, balance: result }));
        return result;
    }, [state.session, request]);
    // ── Signing ───────────────────────────────────────────────────────────────
    const signMessage = useCallback(async (message) => {
        if (!state.session || state.session.accounts.length === 0) {
            throw new Error('No connected account');
        }
        const account = state.session.accounts[0];
        const address = account.includes(':') ? account.split(':').pop() : account;
        const params = buildPersonalSign(message, address);
        return request('personal_sign', params);
    }, [state.session, request]);
    const sendTransaction = useCallback(async (tx) => {
        if (!state.session || state.session.accounts.length === 0) {
            throw new Error('No connected account');
        }
        const account = state.session.accounts[0];
        const from = account.includes(':') ? account.split(':').pop() : account;
        const params = buildSendTransaction({
            from,
            to: tx.to,
            value: tx.value ?? '0x0',
            data: tx.data ?? '0x',
        });
        return request('eth_sendTransaction', params);
    }, [state.session, request]);
    // ── Chain Switch ──────────────────────────────────────────────────────────
    const switchChain = useCallback(async (chainId) => {
        const hexChainId = '0x' + chainId.toString(16);
        await request('wallet_switchEthereumChain', [{ chainId: hexChainId }]);
    }, [request]);
    // ── Context Value ─────────────────────────────────────────────────────────
    const value = useMemo(() => ({
        ...state,
        initialize,
        createPairingUri,
        connectWithUri,
        openWalletDeepLink,
        disconnect,
        request,
        fetchBalance,
        signMessage,
        sendTransaction,
        switchChain,
    }), [
        state,
        initialize,
        createPairingUri,
        connectWithUri,
        openWalletDeepLink,
        disconnect,
        request,
        fetchBalance,
        signMessage,
        sendTransaction,
        switchChain,
    ]);
    return (_jsx(WalletConnectContext.Provider, { value: value, children: children }));
}
export default WalletConnectProvider;
//# sourceMappingURL=WalletConnectProvider.js.map