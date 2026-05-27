import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, } from 'react-native';
import { useCinacoin } from '@cinacoin/react-native';
const TOKENS = [
    { symbol: 'WETH', icon: '🔷' },
    { symbol: 'USDC', icon: '💵' },
    { symbol: 'USDT', icon: '💲' },
    { symbol: 'DAI', icon: '🟡' },
];
export function SwapScreen() {
    const { account } = useCinacoin();
    const [fromToken, setFromToken] = useState(0);
    const [toToken, setToToken] = useState(1);
    const [amount, setAmount] = useState('');
    const [slippage, setSlippage] = useState(50);
    const [quote, setQuote] = useState(null);
    const handleGetQuote = () => {
        if (!amount)
            return;
        const numAmount = parseFloat(amount) || 0;
        setQuote({
            toAmount: (numAmount * 3000).toFixed(2),
            priceImpact: '0.12%',
            gasEstimate: '~0.003 ETH',
            provider: 'Uniswap V3',
        });
    };
    const handleSwap = () => {
        Alert.alert('Swap', `提交 ${amount} ${TOKENS[fromToken].symbol} → ${TOKENS[toToken].symbol}`);
    };
    const swapTokens = () => {
        const temp = fromToken;
        setFromToken(toToken);
        setToToken(temp);
        setAmount('');
        setQuote(null);
    };
    return (_jsx(ScrollView, { style: styles.container, children: !account ? (_jsx(Text, { style: styles.noAccount, children: "\u8BF7\u5148\u8FDE\u63A5\u94B1\u5305" })) : (_jsxs(_Fragment, { children: [_jsxs(View, { style: styles.inputGroup, children: [_jsx(Text, { style: styles.label, children: "From" }), _jsxs(View, { style: styles.inputRow, children: [_jsx(TextInput, { style: styles.amountInput, placeholder: "0.0", keyboardType: "decimal-pad", value: amount, onChangeText: setAmount, placeholderTextColor: "#64748B" }), _jsx(TouchableOpacity, { style: styles.tokenBtn, onPress: () => setFromToken((fromToken + 1) % TOKENS.length), children: _jsxs(Text, { style: styles.tokenText, children: [TOKENS[fromToken].icon, " ", TOKENS[fromToken].symbol] }) })] })] }), _jsx(TouchableOpacity, { style: styles.swapArrow, onPress: swapTokens, children: _jsx(Text, { style: styles.swapArrowText, children: "\u2B07\uFE0F" }) }), _jsxs(View, { style: styles.inputGroup, children: [_jsx(Text, { style: styles.label, children: "To (estimated)" }), _jsxs(View, { style: styles.inputRow, children: [_jsx(TextInput, { style: [styles.amountInput, styles.readonlyInput], value: quote?.toAmount || '', editable: false, placeholder: "0.0", placeholderTextColor: "#64748B" }), _jsx(TouchableOpacity, { style: styles.tokenBtn, onPress: () => setToToken((toToken + 1) % TOKENS.length), children: _jsxs(Text, { style: styles.tokenText, children: [TOKENS[toToken].icon, " ", TOKENS[toToken].symbol] }) })] })] }), _jsxs(View, { style: styles.slippageGroup, children: [_jsx(Text, { style: styles.label, children: "Slippage Tolerance" }), _jsx(View, { style: styles.slippageBtns, children: [10, 50, 100].map((bps) => (_jsx(TouchableOpacity, { style: [
                                    styles.slippageBtn,
                                    slippage === bps && styles.slippageBtnActive,
                                ], onPress: () => setSlippage(bps), children: _jsxs(Text, { style: [
                                        styles.slippageBtnText,
                                        slippage === bps && styles.slippageBtnTextActive,
                                    ], children: [(bps / 100).toFixed(1), "%"] }) }, bps))) })] }), quote && (_jsxs(View, { style: styles.quoteCard, children: [_jsxs(View, { style: styles.quoteRow, children: [_jsx(Text, { style: styles.quoteLabel, children: "Provider" }), _jsx(Text, { style: styles.quoteValue, children: quote.provider })] }), _jsxs(View, { style: styles.quoteRow, children: [_jsx(Text, { style: styles.quoteLabel, children: "Price Impact" }), _jsx(Text, { style: styles.quoteValue, children: quote.priceImpact })] }), _jsxs(View, { style: styles.quoteRow, children: [_jsx(Text, { style: styles.quoteLabel, children: "Gas" }), _jsx(Text, { style: styles.quoteValue, children: quote.gasEstimate })] }), _jsxs(View, { style: styles.quoteRow, children: [_jsx(Text, { style: styles.quoteLabel, children: "Minimum Received" }), _jsxs(Text, { style: styles.quoteValue, children: [(parseFloat(quote.toAmount) *
                                            (1 - slippage / 10000)).toFixed(2), ' ', TOKENS[toToken].symbol] })] })] })), _jsx(TouchableOpacity, { style: styles.actionBtn, onPress: quote ? handleSwap : handleGetQuote, children: _jsx(Text, { style: styles.actionBtnText, children: quote
                            ? `Swap ${amount} ${TOKENS[fromToken].symbol}`
                            : 'Get Quote' }) })] })) }));
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
    noAccount: { color: '#64748B', textAlign: 'center', marginTop: 32, fontSize: 16 },
    inputGroup: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    label: { color: '#94A3B8', fontSize: 12, marginBottom: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    amountInput: {
        flex: 1,
        backgroundColor: 'transparent',
        color: '#F8FAFC',
        fontSize: 24,
        fontWeight: '600',
        padding: 0,
    },
    readonlyInput: { opacity: 0.7 },
    tokenBtn: {
        backgroundColor: '#334155',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    tokenText: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
    swapArrow: { alignItems: 'center', paddingVertical: 8 },
    swapArrowText: { fontSize: 24 },
    slippageGroup: { marginBottom: 16 },
    slippageBtns: { flexDirection: 'row', gap: 8 },
    slippageBtn: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
    },
    slippageBtnActive: { backgroundColor: '#3B82F6' },
    slippageBtnText: { color: '#94A3B8', fontSize: 14 },
    slippageBtnTextActive: { color: '#FFFFFF' },
    quoteCard: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    quoteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    quoteLabel: { color: '#94A3B8', fontSize: 14 },
    quoteValue: { color: '#F8FAFC', fontSize: 14 },
    actionBtn: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
//# sourceMappingURL=SwapScreen.js.map