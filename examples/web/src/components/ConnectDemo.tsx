import { useState, useEffect, useCallback } from 'react'
import { useCinaCoin, ConnectButton, ConnectModal } from '@cinacoin/react'
import { ethers } from 'ethers'

/**
 * ConnectDemo — Real wallet connection demo with:
 * - EIP-6963 auto-discovery of injected wallets
 * - Real wallet balance fetching via JSON-RPC
 * - Account address and ETH balance display
 * - Network detection and chain ID display
 */

// Real RPC endpoints for demo (replace with your own or use public RPCs)
const RPC_ENDPOINTS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
}

interface BalanceInfo {
  eth: string
  usd: string | null
  chainName: string
  chainId: number
}

export function ConnectDemo() {
  const [showModal, setShowModal] = useState(false)
  const { account, status, balance, connectors, disconnect, chainId } = useCinaCoin()
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [eip6963Wallets, setEip6963Wallets] = useState<
    Array<{ name: string; uuid: string; icon: string }>
  >([])

  // Fetch real on-chain balance
  const fetchBalance = useCallback(async () => {
    if (!account || !chainId) return
    setLoadingBalance(true)

    try {
      const rpcUrl = RPC_ENDPOINTS[chainId] || RPC_ENDPOINTS[1]
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const balanceWei = await provider.getBalance(account)
      const ethBalance = ethers.formatEther(balanceWei)

      // Try to get USD price (using public CoinGecko API)
      let usdPrice: string | null = null
      try {
        const coingeckoId = chainId === 1 ? 'ethereum' : chainId === 137 ? 'matic-network' : 'ethereum'
        const resp = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
        )
        const data = await resp.json()
        if (data[coingeckoId]?.usd) {
          const usdValue = parseFloat(ethBalance) * data[coingeckoId].usd
          usdPrice = `$${usdValue.toFixed(2)}`
        }
      } catch {
        // CoinGecko rate-limited or unavailable
      }

      const chainNames: Record<number, string> = {
        1: 'Ethereum',
        137: 'Polygon',
        42161: 'Arbitrum',
      }

      setBalanceInfo({
        eth: parseFloat(ethBalance).toFixed(6),
        usd: usdPrice,
        chainName: chainNames[chainId] || `Chain ${chainId}`,
        chainId,
      })
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoadingBalance(false)
    }
  }, [account, chainId])

  // Fetch balance when connected
  useEffect(() => {
    if (account) {
      fetchBalance()
    } else {
      setBalanceInfo(null)
    }
  }, [account, fetchBalance])

  // Discover injected wallets via EIP-6963
  useEffect(() => {
    if (typeof window === 'undefined') return

    const discovered: Array<{ name: string; uuid: string; icon: string }> = []

    function handleProviderAnnounced(event: Event) {
      const e = event as CustomEvent
      const { info } = e.detail
      discovered.push({
        name: info.name,
        uuid: info.uuid,
        icon: info.icon,
      })
      setEip6963Wallets([...discovered])
    }

    window.addEventListener('eip6963:announceProvider', handleProviderAnnounced)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleProviderAnnounced)
    }
  }, [])

  return (
    <div className="connect-demo">
      <div className="demo-card">
        <h3>ConnectButton 组件</h3>
        <ConnectButton
          variant="primary"
          size="lg"
          showBalance
          showAvatar
          showNetwork
        />
      </div>

      <div className="demo-card">
        <h3>连接状态</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">状态</span>
            <span className={`value status-${status}`}>{status}</span>
          </div>
          <div className="status-item">
            <span className="label">账户</span>
            <span className="value address">{account || '未连接'}</span>
          </div>
          <div className="status-item">
            <span className="label">余额 (实时)</span>
            {loadingBalance ? (
              <span className="value loading">获取中...</span>
            ) : balanceInfo ? (
              <span className="value">
                {balanceInfo.eth} {balanceInfo.chainId === 137 ? 'MATIC' : 'ETH'}
                {balanceInfo.usd && <span className="usd-value">({balanceInfo.usd})</span>}
              </span>
            ) : (
              <span className="value">—</span>
            )}
          </div>
          <div className="status-item">
            <span className="label">可用钱包数</span>
            <span className="value">{connectors?.length || 0}</span>
          </div>
          <div className="status-item">
            <span className="label">当前网络</span>
            <span className="value">{balanceInfo?.chainName || `Chain ${chainId || '—'}`}</span>
          </div>
          <div className="status-item">
            <span className="label">Chain ID</span>
            <span className="value">{chainId || '—'}</span>
          </div>
        </div>
      </div>

      {/* EIP-6963 Discovered Wallets */}
      {eip6963Wallets.length > 0 && (
        <div className="demo-card">
          <h3>EIP-6963 自动发现的钱包</h3>
          <div className="wallet-grid">
            {eip6963Wallets.map((wallet) => (
              <div key={wallet.uuid} className="wallet-item">
                <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />
                <span className="wallet-name">{wallet.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="demo-card">
        <h3>ConnectModal 弹窗</h3>
        <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
          打开连接弹窗
        </button>
        {account && (
          <button className="btn btn-danger" onClick={() => disconnect()}>
            断开连接
          </button>
        )}
      </div>

      <ConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        views={['wallets', 'scan']}
        defaultView="wallets"
        recommendedWallets={['metamask', 'rabby', 'walletconnect']}
      />
    </div>
  )
}
