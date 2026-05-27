import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
import { useCinacoinContext } from './CinacoinProvider.js';
/**
 * ConnectModal — React wrapper for the OCX ConnectModal Web Component.
 *
 * ```tsx
 * <ConnectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 */
export function ConnectModal({ isOpen, onClose, defaultView = 'wallets', recommendedWalletIds, className, style, }) {
    const ref = useRef(null);
    const { connect } = useCinacoinContext();
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        // Set recommended wallet IDs as property (not attribute)
        if (recommendedWalletIds) {
            el.recommendedWalletIds = recommendedWalletIds;
        }
        const handleClose = () => onClose();
        const handleWalletSelect = (e) => {
            const detail = e.detail;
            if (detail?.id) {
                connect(detail.id).catch(() => { });
            }
            onClose();
        };
        el.addEventListener('ocx-close', handleClose);
        el.addEventListener('ocx-wallet-select', handleWalletSelect);
        return () => {
            el.removeEventListener('ocx-close', handleClose);
            el.removeEventListener('ocx-wallet-select', handleWalletSelect);
        };
    }, [connect, onClose]);
    return (_jsx("ocx-connect-modal", { ref: ref, "is-open": isOpen, "default-view": defaultView, "recommended-wallet-ids": recommendedWalletIds?.join(','), className: className, style: style }));
}
//# sourceMappingURL=ConnectModal.js.map