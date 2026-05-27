import { useState, useEffect, useCallback } from 'react'
import { useCinaCoin, ChainSwitcher } from '@cinacoin/react'
import { ethers } from 'ethers'

/**
 * MultiChainDemo — Real multi-chain asset overview.
 *
 * Features:
 * - Real balance fetching across multiple chains via JSON-RPC
 * - Real chain switching through wallet provider
 * - Cross-chain total balance estimation
 */

interface ChainConfig {
  chainId: number
  name: string
  symbol: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrl: string
  icon: string
  coingeckoId: string
}

const CHAINS: ChainConfig[] = [
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
]

interface ChainBalance {
  chainId: number
  name: string
  symbol: string
  balance: string
  usdValue: string | null
  icon: string
}

export function MultiChainDemo() {
  const { account, chainId, switchChain } = useCinaCoin()
  const [selectedChain, setSelectedChain] = useState(1)
  const [balances, setBalances] = useState<ChainBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<Record<string, number>>({})

  const fetchBalances = useCallback(async () => {
    if (!account) return
    setLoading(true)

    // Fetch prices in parallel
    try {
      const ids = [...new Set(CHAINS.map((c) => c.coingeckoId))]
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
      )
      const data = await resp.json()
      const priceMap: Record<string, number> = {}
      Object.entries(data).forEach(([key, val]: [string, any]) => {
        priceMap[key] = val?.usd ?? 0
      })
      setPrices(priceMap)
    } catch {
      console.warn('Failed to fetch prices')
    }

    // Fetch balances across all chains in parallel
    const results = await Promise.allSettled(
      CHAINS.map(async (chain) => {
        try {
          const provider = new ethers.JsonRpcProvider(chain.rpcUrl)
          const balanceWei = await provider.getBalance(account)
          const balance = parseFloat(ethers.formatEther(balanceWei))
          const usdValue = prices[chain.coingeckoId]
            ? `$${(balance * prices[chain.coingeckoId]).toFixed(2)}`
            : null

          return {
            chainId: chain.chainId,
            name: chain.name,
            symbol: chain.symbol,
            balance: balance.toFixed(6),
            usdValue,
            icon: chain.icon,
          }
        } catch {
          return {
            chainId: chain.chainId,
            name: chain.name,
            symbol: chain.symbol,
            balance: '—',
            usdValue: null,
            icon: chain.icon,
          }
        }
      })
    )

    setBalances(
      results
        .filter((r): r is PromiseFulfilledResult<ChainBalance> => r.status === 'fulfilled')
        .map((r) => r.value)
    )
    setLoading(false)
  }, [account, prices])

  useEffect(() => {
    if (account) {
      fetchBalances()
    } else {
      setBalances([])
    }
  }, [account, fetchBalances])

  const chainsForSwitcher = CHAINS.map((c) => ({
    id: c.chainId,
    name: c.name,
    nativeCurrency: c.nativeCurrency,
    rpcUrl: c.rpcUrl,
  }))

  const currentBalance = balances.find((b) => b.chainId === selectedChain)

  // Calculate total USD value
  const totalUsd = balances.reduce((sum, b) => {
    if (b.usdValue) {
      return sum + parseFloat(b.usdValue.replace('$', ''))
    }
    return sum
  }, 0)

  return (
    <div className="multichain-demo">
      <div className="demo-card">
        <h3>ChainSwitcher</h3>
        <ChainSwitcher
          chains={chainsForSwitcher}
          activeChainId={selectedChain}
          onChainChange={(id) => {
            setSelectedChain(id)
            switchChain(id)
          }}
        />
      </div>

      <div className="demo-card">
        <h3>跨链资产总览 {loading && <span className="loading-indicator">⏳</span>}</h3>
        {account ? (
          <>
            {totalUsd > 0 && (
              <div className="total-balance">
                <span className="total-label">总资产估值</span>
                <span className="total-value">${totalUsd.toFixed(2)}</span>
              </div>
            )}
            <div className="chain-balances">
              {balances.map((chain) => (
                <div
                  key={chain.chainId}
                  className={`chain-balance ${chain.chainId === selectedChain ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedChain(chain.chainId)
                    switchChain(chain.chainId)
                  }}
                >
                  <div className="chain-icon">{chain.icon}</div>
                  <div className="chain-info">
                    <div className="chain-name">{chain.name}</div>
                    <div className="chain-amount">
                      {chain.balance} {chain.symbol}
                    </div>
                  </div>
                  <div className="chain-usd">{chain.usdValue || '—'}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="no-account">请先连接钱包查看资产</p>
        )}
      </div>

      <div className="demo-card">
        <h3>网络信息</h3>
        {currentBalance ? (
          <div className="network-info">
            <div className="info-row">
              <span>当前网络</span>
              <span>
                {currentBalance.icon} {currentBalance.name}
              </span>
            </div>
            <div className="info-row">
              <span>Chain ID</span>
              <span>{currentBalance.chainId}</span>
            </div>
            <div className="info-row">
              <span>原生币种</span>
              <span>{currentBalance.symbol}</span>
            </div>
            <div className="info-row">
              <span>余额</span>
              <span>
                {currentBalance.balance} {currentBalance.symbol}
                {currentBalance.usdValue && ` (${currentBalance.usdValue})`}
              </span>
            </div>
          </div>
        ) : (
          <p className="no-account">暂无数据</p>
        )}
      </div>
    </div>
  )
}
