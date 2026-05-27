import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useCinacoin, ChainSwitcher } from '@cinacoin/react';
import { ethers } from 'ethers';
const CHAINS = [
    {
        chainId: 1,
        name: 'Ethereum',
        symbol: 'ETH',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://eth.llamarpc.com',
        icon: '🔷',
        coingeckoId: 'ethereum',
    },
    {
        chainId: 137,
        name: 'Polygon',
        symbol: 'MATIC',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrl: 'https://polygon-rpc.com',
        icon: '🟣',
        coingeckoId: 'matic-network',
    },
    {
        chainId: 42161,
        name: 'Arbitrum',
        symbol: 'ETH',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        icon: '🔵',
        coingeckoId: 'ethereum',
    },
];
export function MultiChainDemo() {
    const { account, chainId, switchChain } = useCinacoin();
    const [selectedChain, setSelectedChain] = useState(1);
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [prices, setPrices] = useState({});
    const fetchBalances = useCallback(async () => {
        if (!account)
            return;
        setLoading(true);
        // Fetch prices in parallel
        try {
            const ids = [...new Set(CHAINS.map((c) => c.coingeckoId))];
            const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
            const data = await resp.json();
            const priceMap = {};
            Object.entries(data).forEach(([key, val]) => {
                priceMap[key] = val?.usd ?? 0;
            });
            setPrices(priceMap);
        }
        catch {
            console.warn('Failed to fetch prices');
        }
        // Fetch balances across all chains in parallel
        const results = await Promise.allSettled(CHAINS.map(async (chain) => {
            try {
                const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
                const balanceWei = await provider.getBalance(account);
                const balance = parseFloat(ethers.formatEther(balanceWei));
                const usdValue = prices[chain.coingeckoId]
                    ? `$${(balance * prices[chain.coingeckoId]).toFixed(2)}`
                    : null;
                return {
                    chainId: chain.chainId,
                    name: chain.name,
                    symbol: chain.symbol,
                    balance: balance.toFixed(6),
                    usdValue,
                    icon: chain.icon,
                };
            }
            catch {
                return {
                    chainId: chain.chainId,
                    name: chain.name,
                    symbol: chain.symbol,
                    balance: '—',
                    usdValue: null,
                    icon: chain.icon,
                };
            }
        }));
        setBalances(results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value));
        setLoading(false);
    }, [account, prices]);
    useEffect(() => {
        if (account) {
            fetchBalances();
        }
        else {
            setBalances([]);
        }
    }, [account, fetchBalances]);
    const chainsForSwitcher = CHAINS.map((c) => ({
        id: c.chainId,
        name: c.name,
        nativeCurrency: c.nativeCurrency,
        rpcUrl: c.rpcUrl,
    }));
    const currentBalance = balances.find((b) => b.chainId === selectedChain);
    // Calculate total USD value
    const totalUsd = balances.reduce((sum, b) => {
        if (b.usdValue) {
            return sum + parseFloat(b.usdValue.replace('$', ''));
        }
        return sum;
    }, 0);
    return (_jsxs("div", { className: "multichain-demo", children: [_jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "ChainSwitcher" }), _jsx(ChainSwitcher, { chains: chainsForSwitcher, activeChainId: selectedChain, onChainChange: (id) => {
                            setSelectedChain(id);
                            switchChain(id);
                        } })] }), _jsxs("div", { className: "demo-card", children: [_jsxs("h3", { children: ["\u8DE8\u94FE\u8D44\u4EA7\u603B\u89C8 ", loading && _jsx("span", { className: "loading-indicator", children: "\u23F3" })] }), account ? (_jsxs(_Fragment, { children: [totalUsd > 0 && (_jsxs("div", { className: "total-balance", children: [_jsx("span", { className: "total-label", children: "\u603B\u8D44\u4EA7\u4F30\u503C" }), _jsxs("span", { className: "total-value", children: ["$", totalUsd.toFixed(2)] })] })), _jsx("div", { className: "chain-balances", children: balances.map((chain) => (_jsxs("div", { className: `chain-balance ${chain.chainId === selectedChain ? 'active' : ''}`, onClick: () => {
                                        setSelectedChain(chain.chainId);
                                        switchChain(chain.chainId);
                                    }, children: [_jsx("div", { className: "chain-icon", children: chain.icon }), _jsxs("div", { className: "chain-info", children: [_jsx("div", { className: "chain-name", children: chain.name }), _jsxs("div", { className: "chain-amount", children: [chain.balance, " ", chain.symbol] })] }), _jsx("div", { className: "chain-usd", children: chain.usdValue || '—' })] }, chain.chainId))) })] })) : (_jsx("p", { className: "no-account", children: "\u8BF7\u5148\u8FDE\u63A5\u94B1\u5305\u67E5\u770B\u8D44\u4EA7" }))] }), _jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "\u7F51\u7EDC\u4FE1\u606F" }), currentBalance ? (_jsxs("div", { className: "network-info", children: [_jsxs("div", { className: "info-row", children: [_jsx("span", { children: "\u5F53\u524D\u7F51\u7EDC" }), _jsxs("span", { children: [currentBalance.icon, " ", currentBalance.name] })] }), _jsxs("div", { className: "info-row", children: [_jsx("span", { children: "Chain ID" }), _jsx("span", { children: currentBalance.chainId })] }), _jsxs("div", { className: "info-row", children: [_jsx("span", { children: "\u539F\u751F\u5E01\u79CD" }), _jsx("span", { children: currentBalance.symbol })] }), _jsxs("div", { className: "info-row", children: [_jsx("span", { children: "\u4F59\u989D" }), _jsxs("span", { children: [currentBalance.balance, " ", currentBalance.symbol, currentBalance.usdValue && ` (${currentBalance.usdValue})`] })] })] })) : (_jsx("p", { className: "no-account", children: "\u6682\u65E0\u6570\u636E" }))] })] }));
}
//# sourceMappingURL=MultiChainDemo.js.map