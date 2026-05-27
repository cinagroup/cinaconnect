import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const NETWORK_META = {
    eth: { name: 'Ethereum', chainId: 1, color: '#627eea', symbol: 'ETH' },
    arb: { name: 'Arbitrum', chainId: 42161, color: '#28a0f0', symbol: 'ETH' },
    base: { name: 'Base', chainId: 8453, color: '#0052ff', symbol: 'ETH' },
    polygon: { name: 'Polygon', chainId: 137, color: '#8247e5', symbol: 'MATIC' },
    optimism: { name: 'Optimism', chainId: 10, color: '#ff0420', symbol: 'ETH' },
    bsc: { name: 'BNB Chain', chainId: 56, color: '#f0b90b', symbol: 'BNB' },
    solana: { name: 'Solana', chainId: 0, color: '#9945ff', symbol: 'SOL' },
};
function NetworkButton({ network, label, isActive = false, showChainId = false, size = 'md', className = '', onClick, }) {
    const meta = NETWORK_META[network] ?? { name: network, chainId: 0, color: '#6b7280', symbol: '?' };
    const displayName = label ?? meta.name;
    const sizeMap = {
        sm: { padding: '4px 10px', fontSize: '12px', dotSize: '8px' },
        md: { padding: '6px 14px', fontSize: '13px', dotSize: '10px' },
        lg: { padding: '8px 18px', fontSize: '14px', dotSize: '12px' },
    };
    const s = sizeMap[size];
    return (_jsxs("button", { type: "button", className: `cc-network-button ${className}`, onClick: onClick, style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: s.padding,
            fontSize: s.fontSize,
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
            borderRadius: '8px',
            border: isActive ? `2px solid ${meta.color}` : '1px solid #e2e8f0',
            background: isActive ? `${meta.color}15` : '#ffffff',
            color: isActive ? meta.color : '#374151',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        }, children: [_jsx("span", { style: {
                    width: s.dotSize,
                    height: s.dotSize,
                    borderRadius: '50%',
                    background: meta.color,
                    flexShrink: 0,
                } }), displayName, showChainId && _jsxs("span", { style: { opacity: 0.6, fontSize: parseInt(s.fontSize) - 2 }, children: ["#", meta.chainId] })] }));
}
const meta = {
    title: 'Cinacoin/NetworkButton',
    component: NetworkButton,
    argTypes: {
        network: {
            control: 'select',
            options: ['eth', 'arb', 'base', 'polygon', 'optimism', 'bsc', 'solana'],
        },
        label: { control: 'text' },
        isActive: { control: 'boolean' },
        showChainId: { control: 'boolean' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
    },
    args: {
        network: 'eth',
        isActive: false,
        showChainId: false,
        size: 'md',
    },
};
export default meta;
/** Default — Ethereum. */
export const Default = {
    args: {
        network: 'eth',
    },
};
/** Ethereum (active). */
export const Ethereum = {
    args: {
        network: 'eth',
        isActive: true,
        showChainId: true,
    },
};
/** Arbitrum. */
export const Arbitrum = {
    args: {
        network: 'arb',
        showChainId: true,
    },
};
/** Base. */
export const Base = {
    args: {
        network: 'base',
        showChainId: true,
    },
};
/** Polygon. */
export const Polygon = {
    args: {
        network: 'polygon',
        showChainId: true,
    },
};
/** Optimism. */
export const Optimism = {
    args: {
        network: 'optimism',
        showChainId: true,
    },
};
/** BNB Chain. */
export const BSC = {
    args: {
        network: 'bsc',
        showChainId: true,
    },
};
/** Solana. */
export const Solana = {
    args: {
        network: 'solana',
        showChainId: false,
    },
};
/** Custom label. */
export const CustomLabel = {
    args: {
        network: 'eth',
        label: 'Mainnet',
        isActive: true,
    },
};
/** All networks grid. */
export const AllNetworks = {
    args: {},
    render: () => (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, children: Object.keys(NETWORK_META).map((n) => (_jsx(NetworkButton, { network: n, showChainId: true }, n))) })),
};
/** All networks active — Ethereum. */
export const AllNetworksActive = {
    args: {},
    render: () => (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, children: Object.keys(NETWORK_META).map((n) => (_jsx(NetworkButton, { network: n, isActive: n === 'eth', showChainId: true }, n))) })),
};
//# sourceMappingURL=NetworkButton.stories.js.map