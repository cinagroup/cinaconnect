'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import DemoLayout from '@/components/DemoLayout';
const CHAINS = [
    {
        id: 'ethereum',
        name: 'Ethereum',
        icon: 'Ξ',
        color: 'from-blue-500 to-indigo-600',
        gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        adapter: 'EvmAdapter',
        wallets: ['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Rabby', 'Ledger'],
        nativeToken: 'ETH',
        status: 'operational',
        latency: 12,
        tvl: '$32.1B',
        txCount: '1.2M',
    },
    {
        id: 'polygon',
        name: 'Polygon',
        icon: '⬡',
        color: 'from-purple-500 to-violet-500',
        gradient: 'bg-gradient-to-br from-purple-500 to-violet-500',
        adapter: 'EvmAdapter',
        wallets: ['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Rabby'],
        nativeToken: 'MATIC',
        status: 'operational',
        latency: 2,
        tvl: '$1.2B',
        txCount: '3.8M',
    },
    {
        id: 'arbitrum',
        name: 'Arbitrum',
        icon: '⊡',
        color: 'from-sky-400 to-blue-500',
        gradient: 'bg-gradient-to-br from-sky-400 to-blue-500',
        adapter: 'EvmAdapter',
        wallets: ['MetaMask', 'WalletConnect', 'Rabby'],
        nativeToken: 'ETH',
        status: 'operational',
        latency: 1,
        tvl: '$3.8B',
        txCount: '2.1M',
    },
    {
        id: 'base',
        name: 'Base',
        icon: '⊙',
        color: 'from-blue-400 to-cyan-400',
        gradient: 'bg-gradient-to-br from-blue-400 to-cyan-400',
        adapter: 'EvmAdapter',
        wallets: ['MetaMask', 'Coinbase Wallet', 'WalletConnect', 'Rabby'],
        nativeToken: 'ETH',
        status: 'operational',
        latency: 2,
        tvl: '$2.5B',
        txCount: '5.4M',
    },
    {
        id: 'optimism',
        name: 'Optimism',
        icon: '🔴',
        color: 'from-red-500 to-pink-500',
        gradient: 'bg-gradient-to-br from-red-500 to-pink-500',
        adapter: 'EvmAdapter',
        wallets: ['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Rabby'],
        nativeToken: 'ETH',
        status: 'operational',
        latency: 2,
        tvl: '$1.5B',
        txCount: '1.8M',
    },
    {
        id: 'bsc',
        name: 'BNB Chain',
        icon: '◆',
        color: 'from-yellow-400 to-amber-500',
        gradient: 'bg-gradient-to-br from-yellow-400 to-amber-500',
        adapter: 'EvmAdapter',
        wallets: ['MetaMask', 'WalletConnect', 'Trust Wallet', 'SafePal'],
        nativeToken: 'BNB',
        status: 'operational',
        latency: 3,
        tvl: '$5.6B',
        txCount: '4.2M',
    },
    {
        id: 'solana',
        name: 'Solana',
        icon: '◎',
        color: 'from-green-400 to-emerald-500',
        gradient: 'bg-gradient-to-br from-green-400 to-emerald-500',
        adapter: 'SolanaChainAdapter',
        wallets: ['Phantom', 'Solflare', 'Backpack', 'Torus'],
        nativeToken: 'SOL',
        status: 'operational',
        latency: 1,
        tvl: '$8.9B',
        txCount: '28.3M',
    },
    {
        id: 'bitcoin',
        name: 'Bitcoin',
        icon: '₿',
        color: 'from-orange-400 to-amber-600',
        gradient: 'bg-gradient-to-br from-orange-400 to-amber-600',
        adapter: 'BitcoinChainAdapter',
        wallets: ['Xverse', 'Leather', 'Unisat', 'OKX Wallet'],
        nativeToken: 'BTC',
        status: 'operational',
        latency: 10,
        tvl: '$142B',
        txCount: '380K',
    },
    {
        id: 'ton',
        name: 'TON',
        icon: '◇',
        color: 'from-sky-500 to-blue-600',
        gradient: 'bg-gradient-to-br from-sky-500 to-blue-600',
        adapter: 'TonChainAdapter',
        wallets: ['Tonkeeper', 'Tonhub', 'OpenMask', 'MyTonWallet'],
        nativeToken: 'TON',
        status: 'operational',
        latency: 2,
        tvl: '$480M',
        txCount: '12.1M',
    },
    {
        id: 'tron',
        name: 'TRON',
        icon: '⟐',
        color: 'from-red-500 to-red-700',
        gradient: 'bg-gradient-to-br from-red-500 to-red-700',
        adapter: 'TronChainAdapter',
        wallets: ['TronLink', 'SafePal', 'TokenPocket', 'imToken'],
        nativeToken: 'TRX',
        status: 'operational',
        latency: 3,
        tvl: '$7.2B',
        txCount: '6.5M',
    },
    {
        id: 'cosmos',
        name: 'Cosmos',
        icon: '⬢',
        color: 'from-indigo-400 to-violet-500',
        gradient: 'bg-gradient-to-br from-indigo-400 to-violet-500',
        adapter: 'CosmosChainAdapter',
        wallets: ['Keplr', 'Cosmostation', 'Leap', 'Trust Wallet'],
        nativeToken: 'ATOM',
        status: 'degraded',
        latency: 7,
        tvl: '$620M',
        txCount: '1.1M',
    },
    {
        id: 'sui',
        name: 'Sui',
        icon: '◈',
        color: 'from-cyan-400 to-blue-500',
        gradient: 'bg-gradient-to-br from-cyan-400 to-blue-500',
        adapter: 'SuiChainAdapter',
        wallets: ['Sui Wallet', 'Ethos', 'Surf', 'Suiet'],
        nativeToken: 'SUI',
        status: 'operational',
        latency: 1,
        tvl: '$1.8B',
        txCount: '15.7M',
    },
    {
        id: 'starknet',
        name: 'Starknet',
        icon: '⬣',
        color: 'from-zinc-400 to-zinc-600',
        gradient: 'bg-gradient-to-br from-zinc-400 to-zinc-600',
        adapter: 'StarknetChainAdapter',
        wallets: ['Argent X', 'Braavos', 'OKX Wallet', 'MetaMask (Snaps)'],
        nativeToken: 'STRK',
        status: 'operational',
        latency: 4,
        tvl: '$180M',
        txCount: '890K',
    },
    {
        id: 'near',
        name: 'NEAR',
        icon: 'Ⓝ',
        color: 'from-green-500 to-teal-500',
        gradient: 'bg-gradient-to-br from-green-500 to-teal-500',
        adapter: 'NearChainAdapter',
        wallets: ['MyNear Wallet', 'Meteor', 'Welldone', 'Sender'],
        nativeToken: 'NEAR',
        status: 'operational',
        latency: 2,
        tvl: '$95M',
        txCount: '2.4M',
    },
    {
        id: 'hedera',
        name: 'Hedera',
        icon: '⊞',
        color: 'from-slate-400 to-slate-600',
        gradient: 'bg-gradient-to-br from-slate-400 to-slate-600',
        adapter: 'HederaChainAdapter',
        wallets: ['Blade', 'HashPack', 'Kabana', 'Drip'],
        nativeToken: 'HBAR',
        status: 'operational',
        latency: 2,
        tvl: '$42M',
        txCount: '8.7M',
    },
    {
        id: 'xrpl',
        name: 'XRPL',
        icon: '✕',
        color: 'from-gray-400 to-slate-500',
        gradient: 'bg-gradient-to-br from-gray-400 to-slate-500',
        adapter: 'XrplChainAdapter',
        wallets: ['Xaman', 'XRPL Wallet', 'Tangem', 'SafePal'],
        nativeToken: 'XRP',
        status: 'operational',
        latency: 4,
        tvl: '$1.2B',
        txCount: '1.6M',
    },
];
// ─── Network Status Indicator ─────────────────────────────────────────────────
function StatusIndicator({ status }) {
    const color = status === 'operational'
        ? 'bg-emerald-400 shadow-emerald-400/60'
        : status === 'degraded'
            ? 'bg-amber-400 shadow-amber-400/60'
            : 'bg-red-500 shadow-red-500/60';
    return (_jsxs("span", { className: "relative flex h-3 w-3", children: [_jsx("span", { className: `animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}` }), _jsx("span", { className: `relative inline-flex rounded-full h-3 w-3 shadow-md ${color}` })] }));
}
function ChainCard({ chain, connected, balance, onConnect }) {
    return (_jsxs("div", { className: "group bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 overflow-hidden hover:border-gray-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5", children: [_jsx("div", { className: `h-1 bg-gradient-to-r ${chain.color} opacity-70 group-hover:opacity-100 transition-opacity` }), _jsxs("div", { className: "p-5 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-10 h-10 ${chain.gradient} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md`, children: chain.icon }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-white", children: chain.name }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(StatusIndicator, { status: chain.status }), _jsx("span", { className: "text-xs text-gray-400", children: chain.status === 'operational' ? 'Operational' : chain.status === 'degraded' ? 'Degraded' : 'Outage' }), _jsx("span", { className: "text-xs text-gray-600", children: "\u00B7" }), _jsxs("span", { className: "text-xs text-gray-500", children: [chain.latency, "ms"] })] })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-xs text-gray-500", children: chain.nativeToken }), _jsxs("div", { className: "text-xs text-gray-600", children: ["TVL ", chain.tvl] })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2", children: "Wallets" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: chain.wallets.map((w) => (_jsx("span", { className: "px-2.5 py-1 bg-gray-700/50 rounded-md text-xs text-gray-300 border border-gray-600/40", children: w }, w))) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 pt-2 border-t border-gray-700/40", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[11px] text-gray-500", children: "Balance" }), _jsx("div", { className: "text-sm font-mono text-white", children: balance ?? '—' })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[11px] text-gray-500", children: "24h Txs" }), _jsx("div", { className: "text-sm font-mono text-gray-300", children: chain.txCount })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[11px] text-gray-500", children: "Status" }), _jsx("div", { className: "text-sm text-white", children: connected ? (_jsx("span", { className: "text-emerald-400", children: "Connected" })) : (_jsx("span", { className: "text-gray-500", children: "Disconnected" })) })] })] }), _jsx("button", { onClick: onConnect, className: `w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${connected
                            ? 'bg-gray-700/60 text-emerald-400 border border-emerald-500/30 hover:bg-gray-700/80'
                            : `bg-gradient-to-r ${chain.color} text-white hover:opacity-90 hover:shadow-lg`}`, children: connected ? '✓  Connected' : `Connect ${chain.name}` })] })] }));
}
// ─── Cross-Chain Flow Diagram ─────────────────────────────────────────────────
function CrossChainFlow() {
    const [activeStep, setActiveStep] = useState(0);
    const steps = [
        { label: 'Initiate', detail: 'User selects chain A', icon: '🔗' },
        { label: 'Lock', detail: 'Assets locked on source', icon: '🔒' },
        { label: 'Relay', detail: 'Cinacoin Relay', icon: '⚡' },
        { label: 'Mint/Release', detail: 'Assets on chain B', icon: '🔓' },
        { label: 'Complete', detail: 'Cross-chain transfer', icon: '✅' },
    ];
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((s) => (s + 1) % steps.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [steps.length]);
    return (_jsxs("div", { className: "bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 p-8 overflow-hidden", children: [_jsx("h2", { className: "text-xl font-semibold text-white mb-2", children: "Cross-Chain Flow" }), _jsx("p", { className: "text-sm text-gray-400 mb-8", children: "Atomic cross-chain transfers powered by Cinacoin Relay protocol" }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute top-10 left-10 right-10 h-0.5 bg-gray-700", children: _jsx("div", { className: "absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out", style: { width: `${((activeStep + 1) / steps.length) * 100}%` } }) }), _jsx("div", { className: "relative flex justify-between", children: steps.map((step, i) => (_jsxs("div", { className: "flex flex-col items-center gap-3 z-10 w-32", children: [_jsx("div", { className: `w-20 h-20 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 ${i <= activeStep
                                        ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-2 border-blue-400/50 shadow-lg shadow-blue-500/10 scale-105'
                                        : 'bg-gray-800 border border-gray-700/60 opacity-50'}`, children: step.icon }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: `text-sm font-semibold ${i <= activeStep ? 'text-white' : 'text-gray-500'}`, children: step.label }), _jsx("div", { className: "text-xs text-gray-500 mt-0.5", children: step.detail })] })] }, step.label))) })] }), _jsxs("div", { className: "mt-10 flex items-center justify-center gap-4", children: [_jsxs("div", { className: "bg-gray-700/60 rounded-xl px-5 py-3 border border-gray-600/40", children: [_jsx("div", { className: "text-xs text-gray-500", children: "From" }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx("div", { className: "w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold", children: "\u039E" }), _jsx("span", { className: "text-sm font-semibold text-white", children: "Ethereum" })] })] }), _jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("svg", { className: "w-6 h-6 text-blue-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13 7l5 5m0 0l-5 5m5-5H6" }) }), _jsx("span", { className: "text-[10px] text-gray-500 uppercase tracking-wider", children: "Bridge" })] }), _jsxs("div", { className: "bg-gray-700/60 rounded-xl px-5 py-3 border border-gray-600/40", children: [_jsx("div", { className: "text-xs text-gray-500", children: "To" }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx("div", { className: "w-6 h-6 rounded-md bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold", children: "\u25CE" }), _jsx("span", { className: "text-sm font-semibold text-white", children: "Solana" })] })] })] })] }));
}
// ─── Unified API Code Example ─────────────────────────────────────────────────
function UnifiedApiExample() {
    const [copied, setCopied] = useState(false);
    const code = `// Cinacoin — Unified Multi-Chain API
// One interface. Every chain. Zero complexity.

import { Cinacoin } from '@cinacoin/sdk';

const client = new Cinacoin();

// 🔗 Connect to ANY chain with the same API
const eth = await client.connect('ethereum', 'MetaMask');
const sol = await client.connect('solana', 'Phantom');
const btc = await client.connect('bitcoin', 'Xverse');
const ton = await client.connect('ton', 'Tonkeeper');

// 💰 Read balances across chains
const balances = await Promise.all([
  client.getBalance('ethereum', eth.address),
  client.getBalance('solana', sol.address),
  client.getBalance('bitcoin', btc.address),
  client.getBalance('ton', ton.address),
]);

// ⚡ Cross-chain transfer
const tx = await client.transfer({
  from: { chain: 'ethereum', address: eth.address },
  to:   { chain: 'solana',   address: sol.address },
  amount: '0.5 ETH',
  slippage: 0.5,
});

// 📡 Listen to events on all chains
client.on('transaction', (event) => {
  console.log(\`[\${event.chain}] \${event.type}: \${event.hash}\`);
});`;
    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [code]);
    return (_jsxs("div", { className: "bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-700/40", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex gap-1.5", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-red-500/70" }), _jsx("div", { className: "w-3 h-3 rounded-full bg-yellow-500/70" }), _jsx("div", { className: "w-3 h-3 rounded-full bg-green-500/70" })] }), _jsx("span", { className: "text-sm text-gray-400 font-mono", children: "unified-api.ts" })] }), _jsx("button", { onClick: handleCopy, className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-700/60 text-gray-400 border border-gray-600/40 hover:text-white hover:border-gray-500'}`, children: copied ? '✓ Copied' : '📋 Copy' })] }), _jsx("pre", { className: "p-6 text-sm leading-relaxed overflow-x-auto", children: _jsx("code", { className: "text-gray-300 font-mono whitespace-pre", children: code.split('\n').map((line, i) => {
                        let color = 'text-gray-300';
                        if (line.trim().startsWith('//'))
                            color = 'text-gray-500 italic';
                        else if (line.includes('import') || line.includes('from'))
                            color = 'text-purple-400';
                        else if (line.includes('const') || line.includes('let'))
                            color = 'text-sky-400';
                        else if (line.includes('await'))
                            color = 'text-amber-400';
                        else if (line.includes('console'))
                            color = 'text-green-400';
                        else if (line.includes('new '))
                            color = 'text-emerald-400';
                        return (_jsxs("div", { className: `${color} ${i === 0 ? 'mt-0' : ''}`, children: [_jsx("span", { className: "select-none text-gray-600 w-8 inline-block text-right mr-4", children: i + 1 }), line] }, i));
                    }) }) })] }));
}
// ─── Network Status Overview ─────────────────────────────────────────────────
function NetworkStatusOverview() {
    const operational = CHAINS.filter((c) => c.status === 'operational').length;
    const degraded = CHAINS.filter((c) => c.status === 'degraded').length;
    return (_jsxs("div", { className: "bg-gray-800/40 backdrop-blur rounded-2xl border border-gray-700/60 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-xl font-semibold text-white", children: "Network Status" }), _jsxs("div", { className: "flex items-center gap-4 text-xs", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-400" }), _jsxs("span", { className: "text-gray-400", children: [operational, " Operational"] })] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-amber-400" }), _jsxs("span", { className: "text-gray-400", children: [degraded, " Degraded"] })] })] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3", children: CHAINS.map((chain) => (_jsxs("div", { className: "flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-700/30 border border-gray-600/30 hover:border-gray-500/50 transition-colors", children: [_jsx("div", { className: `w-8 h-8 ${chain.gradient} rounded-lg flex items-center justify-center text-white font-bold text-sm`, children: chain.icon }), _jsx(StatusIndicator, { status: chain.status }), _jsx("span", { className: "text-xs text-gray-400 truncate w-full text-center", children: chain.name }), _jsxs("span", { className: "text-[10px] text-gray-500", children: [chain.latency, "ms"] })] }, chain.id))) })] }));
}
// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
    const stats = [
        { label: 'Chains Supported', value: '16', icon: '🌐' },
        { label: 'Wallet Integrations', value: '52', icon: '🔑' },
        { label: 'Cross-Chain Txns', value: '1.2M+', icon: '⚡' },
        { label: 'Total TVL', value: '$210B+', icon: '💎' },
    ];
    return (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: stats.map((s) => (_jsxs("div", { className: "bg-gray-800/40 backdrop-blur rounded-xl border border-gray-700/60 p-5 text-center hover:border-gray-500/50 transition-colors", children: [_jsx("div", { className: "text-2xl mb-1", children: s.icon }), _jsx("div", { className: "text-2xl font-bold text-white", children: s.value }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: s.label })] }, s.label))) }));
}
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MultiChainPage() {
    const [connectedChains, setConnectedChains] = useState({});
    const [balances, setBalances] = useState({});
    // Generate mock balances on connect
    const handleConnect = useCallback((chainId) => {
        setConnectedChains((prev) => ({
            ...prev,
            [chainId]: !prev[chainId],
        }));
        if (!connectedChains[chainId]) {
            const chain = CHAINS.find((c) => c.id === chainId);
            if (chain) {
                const mockBalance = (Math.random() * 100).toFixed(4);
                setBalances((prev) => ({
                    ...prev,
                    [chainId]: `${mockBalance} ${chain.nativeToken}`,
                }));
            }
        }
        else {
            setBalances((prev) => {
                const next = { ...prev };
                delete next[chainId];
                return next;
            });
        }
    }, [connectedChains]);
    const connectedCount = Object.values(connectedChains).filter(Boolean).length;
    return (_jsx(DemoLayout, { children: _jsxs("div", { className: "max-w-6xl mx-auto space-y-8", children: [_jsxs("div", { className: "text-center space-y-4 py-6", children: [_jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-blue-400 animate-pulse" }), connectedCount > 0
                                    ? `${connectedCount} chain${connectedCount > 1 ? 's' : ''} connected`
                                    : '16 chains · 52 wallets · 1 API'] }), _jsx("h1", { className: "text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent", children: "Multi-Chain Connectivity" }), _jsx("p", { className: "text-gray-400 max-w-2xl mx-auto text-lg", children: "Cinacoin unifies wallet connections across 16 blockchains \u2014 from EVM to Solana, Bitcoin to TON \u2014 through a single, elegant API." })] }), _jsx(StatsBar, {}), _jsx(NetworkStatusOverview, {}), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-white mb-4", children: "Chain Demos" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", children: CHAINS.map((chain) => (_jsx(ChainCard, { chain: chain, connected: !!connectedChains[chain.id], balance: balances[chain.id] ?? null, onConnect: () => handleConnect(chain.id) }, chain.id))) })] }), _jsx(CrossChainFlow, {}), _jsx(UnifiedApiExample, {}), _jsx("div", { className: "text-center py-4", children: _jsxs("p", { className: "text-sm text-gray-600", children: ["Powered by", ' ', _jsx("span", { className: "text-gray-400 font-semibold", children: "Cinacoin SDK" }), ' ', "\u2014 one interface, every chain."] }) })] }) }));
}
//# sourceMappingURL=page.js.map