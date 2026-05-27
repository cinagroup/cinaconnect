import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CinacoinProvider } from '@cinacoin/react';
import { ConnectDemo } from './components/ConnectDemo';
import { SwapDemo } from './components/SwapDemo';
import { MultiChainDemo } from './components/MultiChainDemo';
import { AuthDemo } from './components/AuthDemo';
import './index.css';
const config = {
    projectId: import.meta.env.VITE_PROJECT_ID || 'demo-project-id',
    relayUrl: import.meta.env.VITE_RELAY_URL || 'wss://relay.cinacoin.com/v1',
    chains: [
        {
            id: 1,
            name: 'Ethereum',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrl: 'https://rpc.cinacoin.com/eth',
        },
        {
            id: 137,
            name: 'Polygon',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrl: 'https://rpc.cinacoin.com/polygon',
        },
        {
            id: 42161,
            name: 'Arbitrum',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrl: 'https://rpc.cinacoin.com/arbitrum',
        },
    ],
    metadata: {
        name: 'Cinacoin Demo',
        description: 'Cinacoin Web Example — 完整功能演示',
        url: window.location.origin,
        icons: [],
    },
    theme: {
        mode: 'dark',
        accentColor: '#3B82F6',
    },
    debug: true,
};
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(CinacoinProvider, { config: config, children: _jsxs("div", { className: "app", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "\uD83D\uDD22 Cinacoin Web Demo" }), _jsx("p", { children: "\u81EA\u6709\u54C1\u724C\u94FE\u4E0A UX \u5DE5\u5177\u5305 \u2014 \u5B8C\u6574\u529F\u80FD\u6F14\u793A" })] }), _jsxs("main", { className: "app-main", children: [_jsxs("section", { className: "demo-section", children: [_jsx("h2", { children: "1. \u94B1\u5305\u8FDE\u63A5" }), _jsx(ConnectDemo, {})] }), _jsxs("section", { className: "demo-section", children: [_jsx("h2", { children: "2. Swap \u4EA4\u6613" }), _jsx(SwapDemo, {})] }), _jsxs("section", { className: "demo-section", children: [_jsx("h2", { children: "3. \u591A\u94FE\u5207\u6362" }), _jsx(MultiChainDemo, {})] }), _jsxs("section", { className: "demo-section", children: [_jsx("h2", { children: "4. SIWE \u8BA4\u8BC1" }), _jsx(AuthDemo, {})] })] }), _jsx("footer", { className: "app-footer", children: _jsx("p", { children: "Cinacoin v0.1.0 \u2014 MIT License" }) })] }) }) }));
//# sourceMappingURL=main.js.map