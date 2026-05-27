import { useState, useEffect, useCallback } from 'react'

const RPC_PROXY_BASE = 'https://cinacoin-rpc-proxy.cinagroup.workers.dev/rpc'

interface ChainInfo {
  blockNumber: string | null
  balanceWei: string | null
  balanceEth: string | null
  chainName: string
  chainId: number
  loading: boolean
  error: string | null
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  10: 'Optimism',
  56: 'BNB Chain',
  11155111: 'Sepolia Testnet',
  137: 'Polygon',
  42161: 'Arbitrum One',
  8453: 'Base',
  43114: 'Avalanche C-Chain',
  100: 'Gnosis',
  250: 'Fantom',
  42170: 'Arbitrum Nova',
  81457: 'Blast',
  324: 'zkSync Era',
  59144: 'Linea',
  534352: 'Scroll',
}

function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain #${chainId}`
}

async function rpcFetch(url: string, method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  })

  if (!res.ok) {
    throw new Error(`RPC error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error))
  }

  return json.result
}

/**
 * Fetches real on-chain data from the RPC Proxy Worker.
 * - eth_blockNumber for the connected chain
 * - eth_getBalance for the connected address
 * - Chain name lookup by chainId
 */
export function useChainInfo(chainId: number | null, address: string | null): ChainInfo {
  const [blockNumber, setBlockNumber] = useState<string | null>(null)
  const [balanceWei, setBalanceWei] = useState<string | null>(null)
  const [balanceEth, setBalanceEth] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChainInfo = useCallback(async () => {
    if (!chainId) {
      setBlockNumber(null)
      setBalanceWei(null)
      setBalanceEth(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const url = `${RPC_PROXY_BASE}/${chainId}`

    try {
      // Fetch block number
      const blockResult = await rpcFetch(url, 'eth_blockNumber') as string
      const blockNum = parseInt(blockResult, 16)
      setBlockNumber(blockNum.toLocaleString())

      // Fetch balance if address is available
      if (address) {
        const balanceResult = await rpcFetch(url, 'eth_getBalance', [address, 'latest']) as string
        const balanceWeiVal = BigInt(balanceResult)
        // Convert wei to ETH (1e18)
        const ethValue = Number(balanceWeiVal) / 1e18
        setBalanceWei(balanceResult)
        setBalanceEth(ethValue.toFixed(6))
      } else {
        setBalanceWei(null)
        setBalanceEth(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch chain info')
      console.error('[useChainInfo] RPC error:', err)
    } finally {
      setLoading(false)
    }
  }, [chainId, address])

  useEffect(() => {
    fetchChainInfo()
  }, [fetchChainInfo])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!chainId) return
    const interval = setInterval(fetchChainInfo, 30_000)
    return () => clearInterval(interval)
  }, [chainId, fetchChainInfo])

  const chainName = chainId ? getChainName(chainId) : 'Disconnected'

  return { blockNumber, balanceWei, balanceEth, chainName, chainId: chainId || 0, loading, error }
}
