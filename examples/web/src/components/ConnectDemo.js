import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useCinacoin, ConnectButton, ConnectModal } from '@cinacoin/react';
import { ethers } from 'ethers';
/**
 * ConnectDemo — Real wallet connection demo with:
 * - EIP-6963 auto-discovery of injected wallets
 * - Real wallet balance fetching via JSON-RPC
 * - Account address and ETH balance display
 * - Network detection and chain ID display
 */
// Real RPC endpoints for demo (replace with your own or use public RPCs)
const RPC_ENDPOINTS = {
    1: 'https://eth.llamarpc.com',
    137: 'https://polygon-rpc.com',
    42161: 'https://arb1.arbitrum.io/rpc',
};
export function ConnectDemo() {
    const [showModal, setShowModal] = useState(false);
    const { account, status, balance, connectors, disconnect, chainId } = useCinacoin();
    const [balanceInfo, setBalanceInfo] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [eip6963Wallets, setEip6963Wallets] = useState([]);
    // Fetch real on-chain balance
    const fetchBalance = useCallback(async () => {
        if (!account || !chainId)
            return;
        setLoadingBalance(true);
        try {
            const rpcUrl = RPC_ENDPOINTS[chainId] || RPC_ENDPOINTS[1];
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const balanceWei = await provider.getBalance(account);
            const ethBalance = ethers.formatEther(balanceWei);
            // Try to get USD price (using public CoinGecko API)
            let usdPrice = null;
            try {
                const coingeckoId = chainId === 1 ? 'ethereum' : chainId === 137 ? 'matic-network' : 'ethereum';
                const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
                const data = await resp.json();
                if (data[coingeckoId]?.usd) {
                    const usdValue = parseFloat(ethBalance) * data[coingeckoId].usd;
                    usdPrice = `$${usdValue.toFixed(2)}`;
                }
            }
            catch {
                // CoinGecko rate-limited or unavailable
            }
            const chainNames = {
                1: 'Ethereum',
                137: 'Polygon',
                42161: 'Arbitrum',
            };
            setBalanceInfo({
                eth: parseFloat(ethBalance).toFixed(6),
                usd: usdPrice,
                chainName: chainNames[chainId] || `Chain ${chainId}`,
                chainId,
            });
        }
        catch (err) {
            console.error('Failed to fetch balance:', err);
        }
        finally {
            setLoadingBalance(false);
        }
    }, [account, chainId]);
    // Fetch balance when connected
    useEffect(() => {
        if (account) {
            fetchBalance();
        }
        else {
            setBalanceInfo(null);
        }
    }, [account, fetchBalance]);
    // Discover injected wallets via EIP-6963
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const discovered = [];
        function handleProviderAnnounced(event) {
            const e = event;
            const { info } = e.detail;
            discovered.push({
                name: info.name,
                uuid: info.uuid,
                icon: info.icon,
            });
            setEip6963Wallets([...discovered]);
        }
        window.addEventListener('eip6963:announceProvider', handleProviderAnnounced);
        window.dispatchEvent(new Event('eip6963:requestProvider'));
        return () => {
            window.removeEventListener('eip6963:announceProvider', handleProviderAnnounced);
        };
    }, []);
    return (_jsxs("div", { className: "connect-demo", children: [_jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "ConnectButton \u7EC4\u4EF6" }), _jsx(ConnectButton, { variant: "primary", size: "lg", showBalance: true, showAvatar: true, showNetwork: true })] }), _jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "\u8FDE\u63A5\u72B6\u6001" }), _jsxs("div", { className: "status-grid", children: [_jsxs("div", { className: "status-item", children: [_jsx("span", { className: "label", children: "\u72B6\u6001" }), _jsx("span", { className: `value status-${status}`, children: status })] }), _jsxs("div", { className: "status-item", children: [_jsx("span", { className: "label", children: "\u8D26\u6237" }), _jsx("span", { className: "value address", children: account || '未连接' })] }), _jsxs("div", { className: "status-item", children: [_jsx("span", { className: "label", children: "\u4F59\u989D (\u5B9E\u65F6)" }), loadingBalance ? (_jsx("span", { className: "value loading", children: "\u83B7\u53D6\u4E2D..." })) : balanceInfo ? (_jsxs("span", { className: "value", children: [balanceInfo.eth, " ", balanceInfo.chainId === 137 ? 'MATIC' : 'ETH', balanceInfo.usd && _jsxs("span", { className: "usd-value", children: ["(", balanceInfo.usd, ")"] })] })) : (_jsx("span", { className: "value", children: "\u2014" }))] }), _jsxs("div", { className: "status-item", children: [_jsx("span", { className: "label", children: "\u53EF\u7528\u94B1\u5305\u6570" }), _jsx("span", { className: "value", children: connectors?.length || 0 })] }), _jsxs("div", { className: "status-item", children: [_jsx("span", { className: "label", children: "\u5F53\u524D\u7F51\u7EDC" }), _jsx("span", { className: "value", children: balanceInfo?.chainName || `Chain ${chainId || '—'}` })] }), _jsxs("div", { className: "status-item", children: [_jsx("span", { className: "label", children: "Chain ID" }), _jsx("span", { className: "value", children: chainId || '—' })] })] })] }), eip6963Wallets.length > 0 && (_jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "EIP-6963 \u81EA\u52A8\u53D1\u73B0\u7684\u94B1\u5305" }), _jsx("div", { className: "wallet-grid", children: eip6963Wallets.map((wallet) => (_jsxs("div", { className: "wallet-item", children: [_jsx("img", { src: wallet.icon, alt: wallet.name, className: "wallet-icon" }), _jsx("span", { className: "wallet-name", children: wallet.name })] }, wallet.uuid))) })] })), _jsxs("div", { className: "demo-card", children: [_jsx("h3", { children: "ConnectModal \u5F39\u7A97" }), _jsx("button", { className: "btn btn-secondary", onClick: () => setShowModal(true), children: "\u6253\u5F00\u8FDE\u63A5\u5F39\u7A97" }), account && (_jsx("button", { className: "btn btn-danger", onClick: () => disconnect(), children: "\u65AD\u5F00\u8FDE\u63A5" }))] }), _jsx(ConnectModal, { isOpen: showModal, onClose: () => setShowModal(false), views: ['wallets', 'scan'], defaultView: "wallets", recommendedWallets: ['metamask', 'rabby', 'walletconnect'] })] }));
}
//# sourceMappingURL=ConnectDemo.js.map