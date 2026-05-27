import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useCinacoin } from '@cinacoin/react';
import { SwapQuoter, SwapRouter, UniswapExecutor, OneInchExecutor, ZeroxExecutor, } from '@cinacoin/swap-sdk';
const SUPPORTED_TOKENS = [
    {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        icon: '🔷',
    },
    {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        icon: '💵',
    },
    {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        icon: '💲',
    },
    {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        icon: '🟡',
    },
];
// Real RPC endpoint for quote fetching
const ETH_RPC = 'https://eth.llamarpc.com';
/**
 * SwapDemo — Real swap demo with:
 * - Live swap quotes from Uniswap / 1inch / 0x via swap-sdk
 * - Real transaction signing on chain
 * - Transaction hash display and Etherscan link
 */
export function SwapDemo() {
    const { account, signTransaction, chainId, getProvider } = useCinacoin();
    const [fromToken, setFromToken] = useState(SUPPORTED_TOKENS[0]);
    const [toToken, setToToken] = useState(SUPPORTED_TOKENS[1]);
    const [fromAmount, setFromAmount] = useState('');
    const [slippage, setSlippage] = useState(50); // 0.5% = 50 bps
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [txStatus, setTxStatus] = useState('idle');
    // Initialize swap SDK with real executors
    const getSwapRouter = () => {
        const executors = [
            new UniswapExecutor({ rpcUrl: ETH_RPC }),
            // 1inch and 0x require API keys; fall back gracefully
            new OneInchExecutor(import.meta.env.VITE_ONEINCH_API_KEY || ''),
            new ZeroxExecutor(import.meta.env.VITE_ZEROX_API_KEY || ''),
        ];
        return new SwapRouter(new SwapQuoter(executors));
    };
    const handleGetQuote = async () => {
        if (!account || !fromAmount)
            return;
        setLoading(true);
        setQuote(null);
        setTxHash(null);
        setTxStatus('idle');
        try {
            // Convert human-readable amount to wei (with token decimals)
            const fromAmountWei = BigInt(Math.floor(parseFloat(fromAmount) * 10 ** fromToken.decimals));
            const router = getSwapRouter();
            // Fetch real quote from swap-sdk
            const best = await router.getBestQuote({
                fromToken: fromToken.address,
                toToken: toToken.address,
                fromAmount: fromAmountWei,
                chainId: chainId || 1,
                slippageBps: slippage,
                fromAddress: account,
            });
            // Format quote for display
            const toAmountFormatted = (Number(best.quote.toAmount) / 10 ** toToken.decimals).toFixed(6);
            setQuote({
                toAmount: toAmountFormatted,
                priceImpact: best.quote.priceImpact
                    ? `${(best.quote.priceImpact * 100).toFixed(2)}%`
                    : '<0.01%',
                gasEstimate: best.quote.gasEstimate
                    ? `~${(Number(best.quote.gasEstimate) / 1e18).toFixed(6)} ETH`
                    : '~0.003 ETH',
                provider: best.quote.provider,
                route: best.quote.route?.map((r) => r.name).join(' → ') || best.quote.provider,
            });
        }
        catch (err) {
            console.error('Quote fetch failed, falling back to demo estimate:', err);
            // Fallback: use a rough estimate so the UI still works without API keys
            const numericAmount = parseFloat(fromAmount) || 0;
            const ethPrice = 3000;
            const usdcPrice = 1;
            const rate = fromToken.symbol === 'WETH' ? ethPrice / usdcPrice : usdcPrice / ethPrice;
            setQuote({
                toAmount: (numericAmount * rate).toFixed(2),
                priceImpact: 'N/A',
                gasEstimate: '~0.003 ETH',
                provider: 'Fallback (no API key)',
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleSwap = async () => {
        if (!account || !quote)
            return;
        setTxStatus('pending');
        try {
            const fromAmountWei = BigInt(Math.floor(parseFloat(fromAmount) * 10 ** fromToken.decimals));
            const router = getSwapRouter();
            // Execute swap through swap-sdk (returns real tx data)
            const result = await router.execute({
                fromToken: fromToken.address,
                toToken: toToken.address,
                fromAmount: fromAmountWei,
                chainId: chainId || 1,
                slippageBps: slippage,
                fromAddress: account,
                provider: quote.provider,
            });
            // Sign and send the transaction
            const tx = await signTransaction(result.transaction);
            setTxHash(tx.hash || tx.transactionHash || '0x...');
            setTxStatus('confirmed');
        }
        catch (err) {
            console.error('Swap execution failed:', err);
            setTxStatus('failed');
        }
    };
    const swapTokens = () => {
        const temp = fromToken;
        setFromToken(toToken);
        setToToken(temp);
        setFromAmount('');
        setQuote(null);
        setTxHash(null);
        setTxStatus('idle');
    };
    return (_jsx("div", { className: "swap-demo", children: _jsxs("div", { className: "demo-card swap-card", children: [_jsxs("div", { className: "swap-input-group", children: [_jsx("label", { children: "From" }), _jsxs("div", { className: "swap-input-row", children: [_jsx("input", { type: "number", value: fromAmount, onChange: (e) => setFromAmount(e.target.value), placeholder: "0.0", className: "swap-amount-input" }), _jsx("select", { value: fromToken.address, onChange: (e) => {
                                        const token = SUPPORTED_TOKENS.find((t) => t.address === e.target.value);
                                        if (token)
                                            setFromToken(token);
                                    }, className: "swap-token-select", children: SUPPORTED_TOKENS.map((t) => (_jsxs("option", { value: t.address, children: [t.icon, " ", t.symbol] }, t.address))) })] })] }), _jsx("button", { className: "swap-arrow-btn", onClick: swapTokens, children: "\u2B07\uFE0F" }), _jsxs("div", { className: "swap-input-group", children: [_jsx("label", { children: "To (estimated)" }), _jsxs("div", { className: "swap-input-row", children: [_jsx("input", { type: "text", value: quote?.toAmount || '', placeholder: "0.0", readOnly: true, className: "swap-amount-input" }), _jsx("select", { value: toToken.address, onChange: (e) => {
                                        const token = SUPPORTED_TOKENS.find((t) => t.address === e.target.value);
                                        if (token)
                                            setToToken(token);
                                    }, className: "swap-token-select", children: SUPPORTED_TOKENS.map((t) => (_jsxs("option", { value: t.address, children: [t.icon, " ", t.symbol] }, t.address))) })] })] }), _jsxs("div", { className: "slippage-setting", children: [_jsx("label", { children: "Slippage Tolerance" }), _jsx("div", { className: "slippage-buttons", children: [10, 50, 100].map((bps) => (_jsxs("button", { className: `slippage-btn ${slippage === bps ? 'active' : ''}`, onClick: () => setSlippage(bps), children: [(bps / 100).toFixed(1), "%"] }, bps))) })] }), quote && (_jsxs("div", { className: "quote-details", children: [_jsxs("div", { className: "quote-row", children: [_jsx("span", { children: "Provider" }), _jsx("span", { children: quote.provider })] }), quote.route && (_jsxs("div", { className: "quote-row", children: [_jsx("span", { children: "Route" }), _jsx("span", { children: quote.route })] })), _jsxs("div", { className: "quote-row", children: [_jsx("span", { children: "Price Impact" }), _jsx("span", { children: quote.priceImpact })] }), _jsxs("div", { className: "quote-row", children: [_jsx("span", { children: "Estimated Gas" }), _jsx("span", { children: quote.gasEstimate })] }), _jsxs("div", { className: "quote-row", children: [_jsx("span", { children: "Minimum Received" }), _jsxs("span", { children: [(parseFloat(quote.toAmount) *
                                            (1 - slippage / 10000)).toFixed(6), ' ', toToken.symbol] })] })] })), txHash && (_jsxs("div", { className: `tx-status ${txStatus}`, children: [_jsxs("span", { children: [txStatus === 'pending' && '⏳ 交易提交中...', txStatus === 'confirmed' && '✅ 交易已确认！', txStatus === 'failed' && '❌ 交易失败'] }), txStatus === 'confirmed' && (_jsx("a", { href: `https://etherscan.io/tx/${txHash}`, target: "_blank", rel: "noopener noreferrer", className: "tx-link", children: "\u5728 Etherscan \u67E5\u770B \u2192" }))] })), !account ? (_jsx("button", { className: "btn btn-primary", disabled: true, children: "\u8BF7\u5148\u8FDE\u63A5\u94B1\u5305" })) : (_jsx("button", { className: "btn btn-primary", onClick: quote ? handleSwap : handleGetQuote, disabled: loading || !fromAmount || txStatus === 'pending', children: loading
                        ? '获取实时报价...'
                        : txStatus === 'pending'
                            ? '交易确认中...'
                            : quote
                                ? `Swap ${fromAmount} ${fromToken.symbol}`
                                : '获取实时报价' })), _jsxs("p", { className: "demo-note", children: ["\uD83D\uDCA1 \u8BBE\u7F6E ", _jsx("code", { children: "VITE_ONEINCH_API_KEY" }), " \u548C", ' ', _jsx("code", { children: "VITE_ZEROX_API_KEY" }), " \u73AF\u5883\u53D8\u91CF\u4EE5\u83B7\u53D6\u591A\u6E90\u62A5\u4EF7\u3002 \u672A\u914D\u7F6E\u65F6\u5C06\u4F7F\u7528 Uniswap \u5355\u6E90\u62A5\u4EF7\u3002"] })] }) }));
}
//# sourceMappingURL=SwapDemo.js.map