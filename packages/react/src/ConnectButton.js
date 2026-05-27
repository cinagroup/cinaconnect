import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
import { useCinacoinContext } from './CinacoinProvider.js';
/**
 * ConnectButton — React wrapper for the OCX ConnectButton Web Component.
 *
 * Automatically reads connection state from CinacoinProvider context.
 *
 * ```tsx
 * <ConnectButton variant="primary" size="md" />
 * ```
 */
export function ConnectButton({ label = 'Connect Wallet', variant = 'primary', size = 'md', showBalance = false, showAvatar = false, showNetwork = false, className, style, onClick, onDisconnect, }) {
    const ref = useRef(null);
    const { account, status, connect, disconnect } = useCinacoinContext();
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const handleOCXClick = () => {
            if (status === 'disconnected' || status === 'error') {
                connect('metamask').catch(() => { });
            }
            onClick?.();
        };
        const handleOCXDisconnect = () => {
            disconnect().catch(() => { });
            onDisconnect?.();
        };
        el.addEventListener('ocx-click', handleOCXClick);
        el.addEventListener('ocx-disconnect', handleOCXDisconnect);
        return () => {
            el.removeEventListener('ocx-click', handleOCXClick);
            el.removeEventListener('ocx-disconnect', handleOCXDisconnect);
        };
    }, [status, connect, disconnect, onClick, onDisconnect]);
    const stateMap = {
        disconnected: 'disconnected',
        connecting: 'connecting',
        connected: 'connected',
        error: 'error',
    };
    return (_jsx("ocx-connect-button", { ref: ref, variant: variant, size: size, label: label, state: stateMap[status] ?? 'disconnected', address: account.address ?? '', balance: showBalance ? account.balance : '', "chain-symbol": showBalance ? account.chainSymbol : '', "show-balance": showBalance, "show-avatar": showAvatar, "show-network": showNetwork, className: className, style: style }));
}
//# sourceMappingURL=ConnectButton.js.map