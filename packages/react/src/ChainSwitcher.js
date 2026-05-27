import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
import { useCinacoinContext } from './CinacoinProvider.js';
/**
 * ChainSwitcher — React wrapper for the OCX ChainSwitcher Web Component.
 *
 * Automatically reads available chains and active chain from context.
 *
 * ```tsx
 * <ChainSwitcher onChainChange={(id) => console.log('switched to', id)} />
 * ```
 */
export function ChainSwitcher({ className, style, onChainChange, }) {
    const ref = useRef(null);
    const { config, account, switchChain } = useCinacoinContext();
    const chains = config.chains ?? [];
    const activeChainId = account.chainId ?? chains[0]?.id ?? 1;
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        // Set chains as property
        el.chains = chains;
        el.activeChainId = activeChainId;
        const handleChainChange = (e) => {
            const detail = e.detail;
            if (detail?.chainId) {
                switchChain(detail.chainId).catch(() => { });
                onChainChange?.(detail.chainId);
            }
        };
        el.addEventListener('ocx-chain-change', handleChainChange);
        return () => {
            el.removeEventListener('ocx-chain-change', handleChainChange);
        };
    }, [chains, activeChainId, switchChain, onChainChange]);
    return (_jsx("ocx-chain-switcher", { ref: ref, "active-chain-id": activeChainId, className: className, style: style }));
}
//# sourceMappingURL=ChainSwitcher.js.map