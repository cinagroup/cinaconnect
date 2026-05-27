import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
function AccountButton({ address, balance, chainSymbol, size = 'md', showBalance = false, showAvatar = false, isLoading = false, className = '', onClick, }) {
    const sizeMap = {
        sm: { padding: '4px 8px', fontSize: '13px', avatarSize: '20px' },
        md: { padding: '6px 12px', fontSize: '14px', avatarSize: '24px' },
        lg: { padding: '8px 16px', fontSize: '15px', avatarSize: '28px' },
    };
    const s = sizeMap[size];
    return (_jsxs("button", { type: "button", className: `cc-account-button ${className}`, onClick: onClick, style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: s.padding,
            fontSize: s.fontSize,
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#0f172a',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
        }, children: [showAvatar && (_jsx("div", { style: {
                    width: s.avatarSize,
                    height: s.avatarSize,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: parseInt(s.avatarSize) * 0.5,
                    fontWeight: 600,
                }, children: address ? address.slice(2, 4) : '?' })), isLoading ? (_jsx("span", { style: { opacity: 0.5 }, children: "Loading\u2026" })) : (_jsxs("span", { children: [address ?? 'No Account', showBalance && balance && (_jsxs("span", { style: { color: '#64748b', marginLeft: '6px' }, children: [balance, " ", chainSymbol] }))] }))] }));
}
const meta = {
    title: 'Cinacoin/AccountButton',
    component: AccountButton,
    argTypes: {
        address: { control: 'text' },
        balance: { control: 'text' },
        chainSymbol: { control: 'text' },
        size: { control: 'select', options: ['sm', 'md', 'lg'] },
        showBalance: { control: 'boolean' },
        showAvatar: { control: 'boolean' },
        isLoading: { control: 'boolean' },
    },
    args: {
        size: 'md',
        showBalance: false,
        showAvatar: false,
        isLoading: false,
    },
};
export default meta;
/** Default — no account connected. */
export const Default = {
    args: {},
};
/** With address only. */
export const WithAddress = {
    args: {
        address: '0x1234…5678',
        showAvatar: true,
    },
};
/** With balance. */
export const WithBalance = {
    args: {
        address: '0x1234…5678',
        balance: '2.456',
        chainSymbol: 'ETH',
        showBalance: true,
        showAvatar: true,
    },
    play: async ({ canvasElement }) => {
        const btn = canvasElement.querySelector('button');
        if (btn)
            btn.click();
    },
};
/** Without balance (address only). */
export const WithoutBalance = {
    args: {
        address: '0xAbCd…Ef01',
        showBalance: false,
        showAvatar: true,
    },
};
/** Loading state. */
export const Loading = {
    args: {
        isLoading: true,
        showAvatar: true,
    },
};
/** Small size. */
export const Small = {
    args: {
        address: '0x1234…5678',
        size: 'sm',
        showAvatar: true,
    },
};
/** Large size. */
export const Large = {
    args: {
        address: '0x1234…5678',
        size: 'lg',
        showBalance: true,
        balance: '10.5',
        chainSymbol: 'ETH',
        showAvatar: true,
    },
};
//# sourceMappingURL=AccountButton.stories.js.map