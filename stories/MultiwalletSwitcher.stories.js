import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { MultiwalletSwitcher } from '../packages/multiwallet/src/components/MultiwalletSwitcher';
import { MultiwalletStore } from '../packages/multiwallet/src/store';
/* ── Mock provider wrapper ─────────────────────────────────────────── */
function MockMultiwalletProvider({ initialConnections, children, }) {
    const [store] = useState(() => {
        const s = new MultiwalletStore();
        for (const [ns, conns] of Object.entries(initialConnections)) {
            for (const c of conns) {
                s.addConnection(c.walletId, c.walletName, ns, c.address, null, null);
                if (c.isActive) {
                    s.setActiveConnection(c.walletId, ns);
                }
            }
        }
        return s;
    });
    // Expose store globally so useMultiwallet picks it up
    React.useEffect(() => {
        window.__mockMultiwalletStore = store;
    }, [store]);
    return _jsx(_Fragment, { children: children });
}
/* ── Storybook meta ───────────────────────────────────────────────── */
const meta = {
    title: 'Cinacoin/MultiwalletSwitcher',
    component: MultiwalletSwitcher,
    argTypes: {
        className: { control: 'text' },
        namespaces: {
            control: 'check',
            options: ['eip155', 'solana', 'bip122'],
        },
    },
};
export default meta;
/* ── With connections ─────────────────────────────────────────────── */
const sampleConnections = {
    eip155: [
        {
            walletId: 'metamask',
            walletName: 'MetaMask',
            address: '0x1234567890abcdef1234567890abcdef12345678',
            isActive: true,
            icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
        },
        {
            walletId: 'walletconnect',
            walletName: 'WalletConnect',
            address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            isActive: false,
        },
    ],
    solana: [
        {
            walletId: 'phantom',
            walletName: 'Phantom',
            address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            isActive: true,
            icon: 'https://cryptologos.cc/logos/phantom-phantom-logo.png',
        },
    ],
    bip122: [
        {
            walletId: 'xverse',
            walletName: 'Xverse',
            address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            isActive: false,
        },
    ],
};
export const WithConnections = {
    args: {},
    decorators: [
        (StoryComp) => (_jsx("div", { style: { maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, children: _jsx(MockMultiwalletProvider, { initialConnections: sampleConnections, children: _jsx(StoryComp, {}) }) })),
    ],
    play: async () => {
        // Expand first namespace
    },
};
/* ── Without connections ──────────────────────────────────────────── */
export const WithoutConnections = {
    args: {},
    decorators: [
        (StoryComp) => (_jsx("div", { style: { maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, children: _jsx(MockMultiwalletProvider, { initialConnections: { eip155: [], solana: [], bip122: [] }, children: _jsx(StoryComp, {}) }) })),
    ],
};
/* ── EVM only ─────────────────────────────────────────────────────── */
export const EVMOnly = {
    args: {
        namespaces: ['eip155'],
    },
    decorators: [
        (StoryComp) => (_jsx("div", { style: { maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, children: _jsx(MockMultiwalletProvider, { initialConnections: sampleConnections, children: _jsx(StoryComp, {}) }) })),
    ],
};
/* ── Switching wallets ────────────────────────────────────────────── */
export const Switching = {
    args: {},
    decorators: [
        (StoryComp) => (_jsx("div", { style: { maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, children: _jsx(MockMultiwalletProvider, { initialConnections: sampleConnections, children: _jsx(StoryComp, {}) }) })),
    ],
    play: async ({ canvasElement }) => {
        // Click "Switch" on the non-active wallet
        const switchBtns = canvasElement.querySelectorAll('button');
        for (const btn of Array.from(switchBtns)) {
            if (btn.textContent?.includes('Switch')) {
                btn.click();
                break;
            }
        }
    },
};
/* ── Custom render ────────────────────────────────────────────────── */
export const CustomRender = {
    args: {
        renderWallet: (wallet) => (_jsxs("div", { style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '4px 0',
            }, children: [wallet.icon && (_jsx("img", { src: wallet.icon, alt: "", style: { width: 20, height: 20, borderRadius: 4 } })), _jsx("span", { style: { fontSize: 14, fontWeight: wallet.isActive ? 600 : 400 }, children: wallet.walletName }), wallet.isActive && (_jsx("span", { style: {
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: '#16a34a',
                        fontWeight: 500,
                    }, children: "\u25CF Active" }))] })),
    },
    decorators: [
        (StoryComp) => (_jsx("div", { style: { maxWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, children: _jsx(MockMultiwalletProvider, { initialConnections: sampleConnections, children: _jsx(StoryComp, {}) }) })),
    ],
};
//# sourceMappingURL=MultiwalletSwitcher.stories.js.map