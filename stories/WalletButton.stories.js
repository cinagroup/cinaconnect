import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
/* ── Mock useWalletButtons hook via module override ───────────────── */
const WALLET_DATA = {
    metamask: {
        name: 'MetaMask',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
        brandColor: 'f6851b',
    },
    walletconnect: {
        name: 'WalletConnect',
        icon: 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
        brandColor: '3b99fc',
    },
    coinbase: {
        name: 'Coinbase Wallet',
        icon: 'https://www.coinbase.com/img/favicon/favicon-196.png',
        brandColor: '0052ff',
    },
    rainbow: {
        name: 'Rainbow',
        icon: 'https://rainbow.me/favicon.ico',
        brandColor: '091936',
    },
    phantom: {
        name: 'Phantom',
        icon: 'https://cryptologos.cc/logos/phantom-phantom-logo.png',
        brandColor: 'ab9ff2',
    },
};
// We render a direct inline mock since the hook requires a provider context.
// For Storybook, we render the visual component directly.
function MockWalletButton({ walletId, variant = 'default', size = 'md', isLoading = false, disabled = false, label, showConnectedBadge = true, isConnected = false, onClick, className = '', }) {
    const wallet = WALLET_DATA[walletId];
    if (!wallet)
        return null;
    const sizeMap = {
        sm: { padding: '6px 10px', icon: '20px', fontSize: '13px', gap: '6px', borderRadius: '8px' },
        md: { padding: '10px 16px', icon: '24px', fontSize: '15px', gap: '8px', borderRadius: '10px' },
        lg: { padding: '14px 24px', icon: '28px', fontSize: '16px', gap: '10px', borderRadius: '12px' },
    };
    const sizes = sizeMap[size];
    const isRound = variant === 'round';
    const isBrand = variant === 'brand';
    const isMinimal = variant === 'minimal';
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isRound ? '0' : sizes.gap,
        padding: isRound ? '8px' : sizes.padding,
        fontSize: sizes.fontSize,
        borderRadius: isRound ? '50%' : sizes.borderRadius,
        border: isMinimal ? 'none' : '1px solid #e2e8f0',
        backgroundColor: isBrand ? `#${wallet.brandColor}` : 'var(--cc-wb-bg, #ffffff)',
        color: isBrand ? '#ffffff' : 'var(--cc-wb-text, #1e293b)',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
        fontWeight: 500,
        width: isRound ? sizes.icon : 'auto',
        height: isRound ? sizes.icon : 'auto',
        position: 'relative',
    };
    return (_jsxs("button", { type: "button", className: `cc-wallet-button cc-wallet-button--${variant} cc-wallet-button--${size} ${className}`, style: baseStyle, onClick: onClick, disabled: disabled || isLoading, "aria-label": `Connect with ${label ?? wallet.name}`, children: [isLoading ? (_jsx("span", { style: {
                    width: sizes.icon,
                    height: sizes.icon,
                    border: `2px solid ${isBrand ? 'rgba(255,255,255,0.3)' : '#e2e8f0'}`,
                    borderTopColor: isBrand ? '#ffffff' : `#${wallet.brandColor}`,
                    borderRadius: '50%',
                    animation: 'cc-wb-spin 0.6s linear infinite',
                    display: 'block',
                } })) : (_jsx("img", { src: wallet.icon, alt: "", style: { width: sizes.icon, height: sizes.icon, borderRadius: isRound ? '50%' : '4px', flexShrink: 0 } })), !isRound && !isMinimal && _jsx("span", { children: label ?? wallet.name }), !isRound && isMinimal && (_jsx("span", { style: { textDecoration: 'underline', textUnderlineOffset: '3px' }, children: label ?? wallet.name })), showConnectedBadge && isConnected && !isLoading && (_jsx("span", { style: {
                    position: 'absolute',
                    top: isRound ? '-2px' : '-4px',
                    right: isRound ? '-2px' : '-4px',
                    width: isRound ? '10px' : '12px',
                    height: isRound ? '10px' : '12px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    border: `2px solid ${isBrand ? '#' + wallet.brandColor : '#ffffff'}`,
                } }))] }));
}
/* ── Meta ─────────────────────────────────────────────────────────── */
const meta = {
    title: 'Cinacoin/WalletButton',
    component: MockWalletButton,
    argTypes: {
        walletId: {
            control: 'select',
            options: ['metamask', 'walletconnect', 'coinbase', 'rainbow', 'phantom'],
        },
        variant: {
            control: 'select',
            options: ['default', 'brand', 'minimal', 'round'],
        },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        isConnected: { control: 'boolean' },
        showConnectedBadge: { control: 'boolean' },
        label: { control: 'text' },
    },
    args: {
        walletId: 'metamask',
        variant: 'default',
        size: 'md',
        isLoading: false,
        disabled: false,
        isConnected: false,
        showConnectedBadge: true,
    },
};
export default meta;
/* ── Individual wallet stories ────────────────────────────────────── */
export const MetaMask = { args: { walletId: 'metamask' } };
export const WalletConnect = { args: { walletId: 'walletconnect' } };
export const Coinbase = { args: { walletId: 'coinbase' } };
export const Rainbow = { args: { walletId: 'rainbow' } };
export const Phantom = { args: { walletId: 'phantom' } };
/* ── Variants ─────────────────────────────────────────────────────── */
export const DefaultVariant = {
    args: { walletId: 'metamask', variant: 'default' },
};
export const BrandVariant = {
    args: { walletId: 'metamask', variant: 'brand' },
};
export const MinimalVariant = {
    args: { walletId: 'metamask', variant: 'minimal' },
};
export const RoundVariant = {
    args: { walletId: 'metamask', variant: 'round', showConnectedBadge: false },
};
/* ── States ───────────────────────────────────────────────────────── */
export const WithConnectedBadge = {
    args: { walletId: 'metamask', isConnected: true },
};
export const Loading = {
    args: { walletId: 'metamask', isLoading: true },
};
export const Disabled = {
    args: { walletId: 'metamask', disabled: true },
};
/* ── Sizes ────────────────────────────────────────────────────────── */
export const Small = { args: { walletId: 'metamask', size: 'sm' } };
export const Medium = { args: { walletId: 'metamask', size: 'md' } };
export const Large = { args: { walletId: 'metamask', size: 'lg' } };
/* ── All wallets grid ─────────────────────────────────────────────── */
export const AllWallets = {
    args: {},
    render: () => (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '12px' }, children: Object.keys(WALLET_DATA).map((id) => (_jsx(MockWalletButton, { walletId: id }, id))) })),
};
export const AllWalletsBrand = {
    args: {},
    render: () => (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '12px' }, children: Object.keys(WALLET_DATA).map((id) => (_jsx(MockWalletButton, { walletId: id, variant: "brand" }, id))) })),
};
export const AllWalletsRound = {
    args: {},
    render: () => (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '12px' }, children: Object.keys(WALLET_DATA).map((id) => (_jsx(MockWalletButton, { walletId: id, variant: "round", showConnectedBadge: false }, id))) })),
};
//# sourceMappingURL=WalletButton.stories.js.map