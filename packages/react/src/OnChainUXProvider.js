import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
const CinacoinContext = createContext(null);
/** Hook to access the Cinacoin context. Throws if used outside provider. */
export function useCinacoinContext() {
    const ctx = useContext(CinacoinContext);
    if (!ctx) {
        throw new Error('useCinacoinContext must be used within <CinacoinProvider>');
    }
    return ctx;
}
/**
 * CinacoinProvider — React context provider for Cinacoin.
 *
 * Wraps the app and provides chain state, connection methods, and theming.
 *
 * ```tsx
 * <CinacoinProvider config={{ chains: [...], theme: { mode: 'dark' } }}>
 *   <App />
 * </CinacoinProvider>
 * ```
 */
export function CinacoinProvider({ config, children }) {
    const [status, setStatus] = useState('disconnected');
    const [account, setAccount] = useState({
        address: null,
        balance: '0.00',
        chainId: config.chains?.[0]?.id ?? 1,
        chainSymbol: config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
    });
    const [isSwitchingChain, setIsSwitchingChain] = useState(false);
    // Build default connectors list
    const defaultConnectors = useMemo(() => [
        { id: 'metamask', name: 'MetaMask', type: 'injected', installed: false },
        { id: 'walletconnect', name: 'WalletConnect', type: 'walletconnect' },
        { id: 'coinbase', name: 'Coinbase Wallet', type: 'coinbase' },
        { id: 'rabby', name: 'Rabby', type: 'injected', installed: false },
        { id: 'email', name: 'Email', type: 'email' },
    ], []);
    const connectors = useMemo(() => defaultConnectors, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
    const connect = useCallback(async (connectorId) => {
        setStatus('connecting');
        try {
            // TODO: implement actual connection logic
            // For now, simulate a connection
            await new Promise(resolve => setTimeout(resolve, 1000));
            setAccount({
                address: '0x1234567890abcdef1234567890abcdef12345678',
                balance: '1.234',
                chainId: config.chains?.[0]?.id ?? 1,
                chainSymbol: config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
            });
            setStatus('connected');
        }
        catch {
            setStatus('error');
        }
    }, [config.chains]);
    const disconnect = useCallback(async () => {
        setAccount({
            address: null,
            balance: '0.00',
            chainId: config.chains?.[0]?.id ?? 1,
            chainSymbol: config.chains?.[0]?.nativeCurrency.symbol ?? 'ETH',
        });
        setStatus('disconnected');
    }, [config.chains]);
    const switchChain = useCallback(async (chainId) => {
        setIsSwitchingChain(true);
        try {
            // TODO: implement actual chain switch
            await new Promise(resolve => setTimeout(resolve, 500));
            const chain = config.chains?.find(c => c.id === chainId);
            if (chain) {
                setAccount(prev => ({
                    ...prev,
                    chainId,
                    chainSymbol: chain.nativeCurrency.symbol,
                }));
            }
        }
        finally {
            setIsSwitchingChain(false);
        }
    }, [config.chains]);
    const value = useMemo(() => ({
        config,
        connectors,
        account,
        status,
        connect,
        disconnect,
        switchChain,
        isSwitchingChain,
    }), [config, connectors, account, status, connect, disconnect, switchChain, isSwitchingChain]);
    // Apply theme CSS variables
    const themeStyle = useMemo(() => {
        const themeVars = {};
        if (config.theme?.variables) {
            for (const [key, val] of Object.entries(config.theme.variables)) {
                themeVars[key] = val;
            }
        }
        return themeVars;
    }, [config.theme?.variables]);
    return (_jsx(CinacoinContext.Provider, { value: value, children: _jsx("div", { className: `ocx-root ocx-theme-${config.theme?.mode ?? 'dark'}`, style: themeStyle, children: children }) }));
}
//# sourceMappingURL=OnChainUXProvider.js.map