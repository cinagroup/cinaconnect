'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from 'react';
import DemoLayout from '@/components/DemoLayout';
const TOKENS = [
    { symbol: 'ETH', name: 'Ethereum', icon: '⟠', balance: 12.4831, decimals: 18, price: 3245.67, chain: 'Ethereum' },
    { symbol: 'USDC', name: 'USD Coin', icon: '◎', balance: 8420.50, decimals: 6, price: 1.00, chain: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana', icon: '✦', balance: 154.22, decimals: 9, price: 178.43, chain: 'Solana' },
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿', balance: 0.8765, decimals: 8, price: 67234.12, chain: 'Bitcoin' },
];
const RECENT_SWAPS = [
    { id: '0x1a2b', from: 'ETH', to: 'USDC', fromAmount: '2.5000', toAmount: '8,114.18', rate: '1 ETH = 3,245.67 USDC', timestamp: '2 min ago', status: 'completed', route: 'ETH → Uniswap V3 → USDC' },
    { id: '0x3c4d', from: 'SOL', to: 'ETH', fromAmount: '50.0000', toAmount: '2.7563', rate: '1 SOL = 0.0551 ETH', timestamp: '15 min ago', status: 'completed', route: 'SOL → Jupiter → Wormhole → ETH' },
    { id: '0x5e6f', from: 'USDC', to: 'BTC', fromAmount: '10,000.00', toAmount: '0.1487', rate: '1 BTC = 67,234.12 USDC', timestamp: '1 hr ago', status: 'completed', route: 'USDC → ThorChain → BTC' },
    { id: '0x7g8h', from: 'BTC', to: 'SOL', fromAmount: '0.0500', toAmount: '18.8371', rate: '1 BTC = 376.74 SOL', timestamp: '3 hr ago', status: 'pending', route: 'BTC → ThorChain → SOL' },
    { id: '0x9i0j', from: 'ETH', to: 'SOL', fromAmount: '1.0000', toAmount: '18.1893', rate: '1 ETH = 18.19 SOL', timestamp: '5 hr ago', status: 'failed', route: 'ETH → Wormhole → SOL' },
];
// ─── Token Selector Dropdown ──────────────────────────────────────────────
function TokenSelector({ tokens, selected, onSelect, label, }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", onClick: () => setOpen(!open), className: "flex items-center gap-2 bg-gray-700/80 hover:bg-gray-600/80 rounded-xl px-3 py-2 transition-colors border border-gray-600/50", children: [_jsx("span", { className: "text-xl leading-none", children: selected.icon }), _jsx("span", { className: "font-bold text-white text-sm", children: selected.symbol }), _jsx("svg", { className: `w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }), open && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-10", onClick: () => setOpen(false) }), _jsxs("div", { className: "absolute z-20 top-full mt-2 left-0 w-64 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl shadow-black/40 overflow-hidden", children: [_jsx("div", { className: "p-2 border-b border-gray-700", children: _jsx("p", { className: "text-xs text-gray-400 px-2 py-1 font-semibold uppercase tracking-wider", children: "Select Token" }) }), tokens.map((t) => (_jsxs("button", { onClick: () => { onSelect(t); setOpen(false); }, className: `w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700/60 transition-colors ${t.symbol === selected.symbol ? 'bg-gray-700/40' : ''}`, children: [_jsx("span", { className: "text-2xl leading-none", children: t.icon }), _jsxs("div", { className: "text-left flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold text-white text-sm", children: t.symbol }), _jsx("div", { className: "text-xs text-gray-400 truncate", children: t.name })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-sm text-white", children: t.balance.toLocaleString() }), _jsx("div", { className: "text-xs text-gray-500", children: t.chain })] })] }, t.symbol)))] })] }))] }));
}
// ─── Swap Detail Row ──────────────────────────────────────────────────────
function DetailRow({ label, value, highlight, }) {
    const color = highlight === 'green'
        ? 'text-emerald-400'
        : highlight === 'red'
            ? 'text-red-400'
            : highlight === 'yellow'
                ? 'text-amber-400'
                : 'text-gray-300';
    return (_jsxs("div", { className: "flex justify-between items-center py-1.5", children: [_jsx("span", { className: "text-sm text-gray-400", children: label }), _jsx("span", { className: `text-sm font-medium ${color}`, children: value })] }));
}
// ─── Main Page ────────────────────────────────────────────────────────────
export default function SwapPage() {
    const [fromToken, setFromToken] = useState(TOKENS[0]); // ETH
    const [toToken, setToToken] = useState(TOKENS[1]); // USDC
    const [fromAmount, setFromAmount] = useState('');
    const [slippage, setSlippage] = useState(0.5);
    const [walletConnected, setWalletConnected] = useState(false);
    const [swapState, setSwapState] = useState('idle');
    // Computed values
    const toAmount = useMemo(() => {
        const amt = parseFloat(fromAmount);
        if (isNaN(amt) || amt <= 0)
            return '';
        const rate = fromToken.price / toToken.price;
        const result = amt * rate;
        return result.toLocaleString(undefined, { maximumFractionDigits: 6 });
    }, [fromAmount, fromToken, toToken]);
    const rate = useMemo(() => {
        const r = fromToken.price / toToken.price;
        return `1 ${fromToken.symbol} = ${r.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toToken.symbol}`;
    }, [fromToken, toToken]);
    const priceImpact = useMemo(() => {
        const amt = parseFloat(fromAmount);
        if (isNaN(amt) || amt <= 0)
            return '0.00';
        // Simulate: larger amounts = higher impact
        const usdValue = amt * fromToken.price;
        const impact = Math.min(usdValue / 500000, 2.5); // caps at 2.5%
        return impact.toFixed(2);
    }, [fromAmount, fromToken]);
    const feeUsd = useMemo(() => {
        return (parseFloat(fromAmount || '0') * fromToken.price * 0.003).toFixed(2);
    }, [fromAmount, fromToken]);
    const minReceived = useMemo(() => {
        const amt = parseFloat(toAmount.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0)
            return '';
        return (amt * (1 - slippage / 100)).toLocaleString(undefined, { maximumFractionDigits: 6 });
    }, [toAmount, slippage]);
    const usdValue = useMemo(() => {
        const amt = parseFloat(fromAmount);
        if (isNaN(amt) || amt <= 0)
            return '$0.00';
        return `$${(amt * fromToken.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [fromAmount, fromToken]);
    const canSwap = walletConnected && parseFloat(fromAmount) > 0 && fromToken.symbol !== toToken.symbol;
    const insufficientBalance = useMemo(() => {
        const amt = parseFloat(fromAmount);
        return !isNaN(amt) && amt > fromToken.balance;
    }, [fromAmount, fromToken]);
    const handleSwapTokens = useCallback(() => {
        setFromToken(toToken);
        setToToken(fromToken);
        setFromAmount(toAmount.replace(/,/g, ''));
    }, [fromToken, toToken, toAmount]);
    const handleSwap = useCallback(() => {
        if (!canSwap)
            return;
        setSwapState('swapping');
        setTimeout(() => setSwapState('success'), 2000);
        setTimeout(() => setSwapState('idle'), 4500);
    }, [canSwap]);
    const handleMax = useCallback(() => {
        setFromAmount(fromToken.balance.toString());
    }, [fromToken]);
    // Button text & state
    const buttonText = useMemo(() => {
        if (!walletConnected)
            return 'Connect Wallet';
        if (swapState === 'success')
            return '✓ Swap Successful!';
        if (swapState === 'swapping')
            return 'Swapping...';
        if (insufficientBalance)
            return 'Insufficient Balance';
        if (!fromAmount || parseFloat(fromAmount) === 0)
            return 'Enter an amount';
        if (fromToken.symbol === toToken.symbol)
            return 'Select different tokens';
        return 'Swap';
    }, [walletConnected, swapState, insufficientBalance, fromAmount, fromToken, toToken]);
    const buttonDisabled = !canSwap || swapState !== 'idle';
    return (_jsx(DemoLayout, { children: _jsxs("div", { className: "max-w-xl mx-auto px-4 py-8 space-y-8", children: [_jsxs("div", { className: "text-center space-y-2", children: [_jsx("h1", { className: "text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent", children: "Token Swap" }), _jsx("p", { className: "text-gray-400 text-sm", children: "Swap tokens across chains with the best rates" })] }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { onClick: () => setWalletConnected(!walletConnected), className: `px-4 py-2 rounded-xl text-sm font-semibold transition-all ${walletConnected
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'}`, children: walletConnected ? '● 0x1a2...f8e3' : 'Connect Wallet' }) }), _jsxs("div", { className: "bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/30 overflow-hidden", children: [_jsxs("div", { className: "p-5 pb-3", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("span", { className: "text-sm font-medium text-gray-400", children: "From" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs text-gray-500", children: ["Balance: ", _jsx("span", { className: "text-gray-300", children: fromToken.balance.toLocaleString() })] }), _jsx("button", { onClick: handleMax, className: "text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors px-2 py-0.5 rounded bg-blue-400/10 hover:bg-blue-400/20", children: "MAX" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TokenSelector, { tokens: TOKENS, selected: fromToken, onSelect: setFromToken, label: "From" }), _jsx("input", { type: "text", inputMode: "decimal", value: fromAmount, onChange: (e) => {
                                                const v = e.target.value;
                                                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                                    setFromAmount(v);
                                                    if (swapState === 'success')
                                                        setSwapState('idle');
                                                }
                                            }, placeholder: "0.0", className: "flex-1 bg-transparent text-right text-3xl font-bold text-white outline-none placeholder:text-gray-600" })] }), _jsx("div", { className: "text-right mt-1", children: _jsx("span", { className: "text-xs text-gray-500", children: usdValue }) })] }), _jsx("div", { className: "flex justify-center -my-1 relative z-10", children: _jsx("button", { onClick: handleSwapTokens, className: "w-10 h-10 bg-gray-800 border-4 border-gray-900/50 rounded-xl flex items-center justify-center hover:bg-gray-700 hover:scale-110 active:scale-95 transition-all shadow-lg", title: "Swap tokens", children: _jsx("svg", { className: "w-5 h-5 text-gray-300", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" }) }) }) }), _jsxs("div", { className: "p-5 pt-3", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("span", { className: "text-sm font-medium text-gray-400", children: "To" }), _jsxs("span", { className: "text-xs text-gray-500", children: ["Balance: ", _jsx("span", { className: "text-gray-300", children: toToken.balance.toLocaleString() })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TokenSelector, { tokens: TOKENS, selected: toToken, onSelect: setToToken, label: "To" }), _jsx("div", { className: "flex-1 text-right text-3xl font-bold text-white truncate", children: toAmount || _jsx("span", { className: "text-gray-600", children: "0.0" }) })] }), _jsx("div", { className: "text-right mt-1", children: _jsx("span", { className: "text-xs text-gray-500", children: toAmount ? `$${(parseFloat(toAmount.replace(/,/g, '')) * toToken.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00' }) })] }), _jsx("div", { className: "px-5 pb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Slippage" }), _jsx("div", { className: "flex gap-1", children: [0.1, 0.5, 1.0].map((s) => (_jsxs("button", { onClick: () => setSlippage(s), className: `px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${slippage === s
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border border-transparent'}`, children: [s, "%"] }, s))) })] }) }), fromAmount && parseFloat(fromAmount) > 0 && (_jsxs("div", { className: "mx-5 p-4 bg-gray-900/50 rounded-xl space-y-0.5 border border-gray-700/30", children: [_jsx(DetailRow, { label: "Rate", value: rate }), _jsx(DetailRow, { label: "Fee (0.3%)", value: `~$${feeUsd}` }), _jsx(DetailRow, { label: "Slippage Tolerance", value: `${slippage}%` }), _jsx(DetailRow, { label: "Price Impact", value: `${priceImpact}%`, highlight: parseFloat(priceImpact) > 2 ? 'red' : parseFloat(priceImpact) > 1 ? 'yellow' : 'green' }), _jsx(DetailRow, { label: "Minimum Received", value: `${minReceived} ${toToken.symbol}` }), _jsx("div", { className: "border-t border-gray-700/50 my-1" }), _jsx(DetailRow, { label: "Route", value: `${fromToken.symbol} → ${fromToken.chain === toToken.chain ? 'Direct' : 'Cross-chain'} → ${toToken.symbol}` })] })), _jsx("div", { className: "p-5 pt-3", children: _jsxs("button", { onClick: walletConnected ? handleSwap : () => setWalletConnected(true), disabled: buttonDisabled, className: `w-full py-4 rounded-xl font-bold text-lg transition-all ${swapState === 'success'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : swapState === 'swapping'
                                        ? 'bg-blue-500/80 text-white cursor-wait'
                                        : canSwap
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 active:scale-[0.98]'
                                            : 'bg-gray-700/60 text-gray-500 cursor-not-allowed'}`, children: [swapState === 'swapping' && (_jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsxs("svg", { className: "animate-spin h-5 w-5", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), buttonText] })), swapState !== 'swapping' && buttonText] }) })] }), _jsxs("div", { className: "bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden", children: [_jsx("div", { className: "px-5 py-4 border-b border-gray-700/50", children: _jsx("h2", { className: "text-lg font-bold text-white", children: "Recent Swaps" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-gray-500 text-xs uppercase tracking-wider", children: [_jsx("th", { className: "text-left px-5 py-3 font-semibold", children: "Tx" }), _jsx("th", { className: "text-left px-5 py-3 font-semibold", children: "From \u2192 To" }), _jsx("th", { className: "text-right px-5 py-3 font-semibold", children: "Amount" }), _jsx("th", { className: "text-right px-5 py-3 font-semibold hidden sm:table-cell", children: "Route" }), _jsx("th", { className: "text-center px-5 py-3 font-semibold", children: "Status" }), _jsx("th", { className: "text-right px-5 py-3 font-semibold", children: "Time" })] }) }), _jsx("tbody", { children: RECENT_SWAPS.map((swap) => (_jsxs("tr", { className: "border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors", children: [_jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: "text-blue-400 font-mono text-xs", children: swap.id }) }), _jsxs("td", { className: "px-5 py-3", children: [_jsx("span", { className: "text-white font-medium", children: swap.from }), _jsx("span", { className: "text-gray-500 mx-1", children: "\u2192" }), _jsx("span", { className: "text-white font-medium", children: swap.to })] }), _jsxs("td", { className: "px-5 py-3 text-right", children: [_jsxs("div", { className: "text-white", children: [swap.fromAmount, " ", swap.from] }), _jsxs("div", { className: "text-gray-500 text-xs", children: ["\u2192 ", swap.toAmount, " ", swap.to] })] }), _jsx("td", { className: "px-5 py-3 text-right text-gray-400 text-xs hidden sm:table-cell", children: swap.route }), _jsx("td", { className: "px-5 py-3 text-center", children: _jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${swap.status === 'completed'
                                                            ? 'bg-emerald-500/15 text-emerald-400'
                                                            : swap.status === 'pending'
                                                                ? 'bg-amber-500/15 text-amber-400'
                                                                : 'bg-red-500/15 text-red-400'}`, children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${swap.status === 'completed'
                                                                    ? 'bg-emerald-400'
                                                                    : swap.status === 'pending'
                                                                        ? 'bg-amber-400 animate-pulse'
                                                                        : 'bg-red-400'}` }), swap.status] }) }), _jsx("td", { className: "px-5 py-3 text-right text-gray-500 text-xs", children: swap.timestamp })] }, swap.id))) })] }) })] }), _jsxs("div", { className: "text-center space-y-1", children: [_jsxs("div", { className: "flex items-center justify-center gap-2 text-gray-500 text-xs", children: [_jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" }), _jsxs("span", { children: ["Powered by ", _jsx("span", { className: "text-gray-300 font-semibold", children: "Cinacoin Swap SDK" })] })] }), _jsx("p", { className: "text-gray-600 text-xs", children: "Cross-chain liquidity aggregation \u2022 Best execution guaranteed" })] })] }) }));
}
//# sourceMappingURL=page.js.map