import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useCinaCoin } from '@cinacoin/react-native'

const CHAIN_BALANCES = [
  { chainId: 1, name: 'Ethereum', symbol: 'ETH', balance: '1.2345', usdValue: '$3,703.50', icon: '🔷' },
  { chainId: 137, name: 'Polygon', symbol: 'MATIC', balance: '500.00', usdValue: '$450.00', icon: '🟣' },
  { chainId: 42161, name: 'Arbitrum', symbol: 'ETH', balance: '0.5000', usdValue: '$1,500.00', icon: '🔵' },
]

export function MultiChainScreen() {
  const { account, chainId, switchChain } = useCinaCoin()
  const [selectedChain, setSelectedChain] = useState(1)

  if (!account) {
    return (
      <View style={styles.container}>
        <Text style={styles.noAccount}>请先连接钱包查看资产</Text>
      </View>
    )
  }

  const current = CHAIN_BALANCES.find((c) => c.chainId === selectedChain)

  return (
    <ScrollView style={styles.container}>
      {/* Total Balance */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>总资产估值</Text>
        <Text style={styles.totalValue}>$5,653.50</Text>
      </View>

      {/* Chain List */}
      <Text style={styles.sectionTitle}>各链资产</Text>
      {CHAIN_BALANCES.map((chain) => (
        <TouchableOpacity
          key={chain.chainId}
          style={[
            styles.chainRow,
            chain.chainId === selectedChain && styles.chainRowActive,
          ]}
          onPress={() => {
            setSelectedChain(chain.chainId)
            switchChain(chain.chainId)
          }}
        >
          <Text style={styles.chainIcon}>{chain.icon}</Text>
          <View style={styles.chainInfo}>
            <Text style={styles.chainName}>{chain.name}</Text>
            <Text style={styles.chainAmount}>
              {chain.balance} {chain.symbol}
            </Text>
          </View>
          <Text style={styles.chainUsd}>{chain.usdValue}</Text>
        </TouchableOpacity>
      ))}

      {/* Network Details */}
      {current && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>网络详情</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>网络</Text>
            <Text style={styles.detailValue}>
              {current.icon} {current.name}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Chain ID</Text>
            <Text style={styles.detailValue}>{current.chainId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>余额</Text>
            <Text style={styles.detailValue}>
              {current.balance} {current.symbol}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  )
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
})
