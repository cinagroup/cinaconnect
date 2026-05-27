import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, } from 'react-native';
import { useCinacoin } from '@cinacoin/react-native';
const CHAIN_BALANCES = [
    { chainId: 1, name: 'Ethereum', symbol: 'ETH', balance: '1.2345', usdValue: '$3,703.50', icon: '🔷' },
    { chainId: 137, name: 'Polygon', symbol: 'MATIC', balance: '500.00', usdValue: '$450.00', icon: '🟣' },
    { chainId: 42161, name: 'Arbitrum', symbol: 'ETH', balance: '0.5000', usdValue: '$1,500.00', icon: '🔵' },
];
export function MultiChainScreen() {
    const { account, chainId, switchChain } = useCinacoin();
    const [selectedChain, setSelectedChain] = useState(1);
    if (!account) {
        return (_jsx(View, { style: styles.container, children: _jsx(Text, { style: styles.noAccount, children: "\u8BF7\u5148\u8FDE\u63A5\u94B1\u5305\u67E5\u770B\u8D44\u4EA7" }) }));
    }
    const current = CHAIN_BALANCES.find((c) => c.chainId === selectedChain);
    return (_jsxs(ScrollView, { style: styles.container, children: [_jsxs(View, { style: styles.totalCard, children: [_jsx(Text, { style: styles.totalLabel, children: "\u603B\u8D44\u4EA7\u4F30\u503C" }), _jsx(Text, { style: styles.totalValue, children: "$5,653.50" })] }), _jsx(Text, { style: styles.sectionTitle, children: "\u5404\u94FE\u8D44\u4EA7" }), CHAIN_BALANCES.map((chain) => (_jsxs(TouchableOpacity, { style: [
                    styles.chainRow,
                    chain.chainId === selectedChain && styles.chainRowActive,
                ], onPress: () => {
                    setSelectedChain(chain.chainId);
                    switchChain(chain.chainId);
                }, children: [_jsx(Text, { style: styles.chainIcon, children: chain.icon }), _jsxs(View, { style: styles.chainInfo, children: [_jsx(Text, { style: styles.chainName, children: chain.name }), _jsxs(Text, { style: styles.chainAmount, children: [chain.balance, " ", chain.symbol] })] }), _jsx(Text, { style: styles.chainUsd, children: chain.usdValue })] }, chain.chainId))), current && (_jsxs(View, { style: styles.detailCard, children: [_jsx(Text, { style: styles.detailTitle, children: "\u7F51\u7EDC\u8BE6\u60C5" }), _jsxs(View, { style: styles.detailRow, children: [_jsx(Text, { style: styles.detailLabel, children: "\u7F51\u7EDC" }), _jsxs(Text, { style: styles.detailValue, children: [current.icon, " ", current.name] })] }), _jsxs(View, { style: styles.detailRow, children: [_jsx(Text, { style: styles.detailLabel, children: "Chain ID" }), _jsx(Text, { style: styles.detailValue, children: current.chainId })] }), _jsxs(View, { style: styles.detailRow, children: [_jsx(Text, { style: styles.detailLabel, children: "\u4F59\u989D" }), _jsxs(Text, { style: styles.detailValue, children: [current.balance, " ", current.symbol] })] })] }))] }));
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
    noAccount: { color: '#64748B', textAlign: 'center', marginTop: 32, fontSize: 16 },
    totalCard: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: { color: '#94A3B8', fontSize: 14, marginBottom: 4 },
    totalValue: { color: '#F8FAFC', fontSize: 32, fontWeight: '700' },
    sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginBottom: 12 },
    chainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    chainRowActive: { borderColor: '#3B82F6', borderWidth: 1 },
    chainIcon: { fontSize: 24, marginRight: 12 },
    chainInfo: { flex: 1 },
    chainName: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
    chainAmount: { color: '#94A3B8', fontSize: 14 },
    chainUsd: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
    detailCard: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    detailTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginBottom: 12 },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    detailLabel: { color: '#94A3B8', fontSize: 14 },
    detailValue: { color: '#F8FAFC', fontSize: 14 },
});
//# sourceMappingURL=MultiChainScreen.js.map