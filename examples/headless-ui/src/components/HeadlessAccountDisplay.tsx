import { useState, useEffect, useCallback } from 'react'
import type { HeadlessClient } from '@cinacoin/config'

interface AccountDisplayProps {
  client: HeadlessClient
  connected: boolean
}

/**
 * HeadlessAccountDisplay — a custom account info display.
 *
 * Shows connected address, balance, and network info using only
 * the headless client API. Fully styleable — no built-in UI.
 *
 * @example
 * ```tsx
 * const client = createHeadlessClient({ projectId })
 *
 * <HeadlessAccountDisplay client={client} connected={!!account} />
 * ```
 */
export function HeadlessAccountDisplay({
  client,
  connected,
}: AccountDisplayProps) {
  const [address, setAddress] = useState<string>('')
  const [balance, setBalance] = useState<string>('0')
  const [chainId, setChainId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAccountData = useCallback(async () => {
    if (!connected) return
    setLoading(true)

    try {
      // Get address from client request
      const accounts = await client.request<string[]>({
        method: 'eth_accounts',
      })
      if (accounts?.[0]) {
        setAddress(accounts[0])
      }

      // Get balance
      if (accounts?.[0]) {
        const balanceHex = await client.request<string>({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        })
        if (balanceHex) {
          const balanceWei = BigInt(balanceHex)
          setBalance((Number(balanceWei) / 1e18).toFixed(4))
        }
      }

      // Get chain ID
      const chainIdHex = await client.request<string>({
        method: 'eth_chainId',
      })
      if (chainIdHex) {
        setChainId(parseInt(chainIdHex, 16))
      }
    } catch {
      // Silently handle — account may not be connected yet
    } finally {
      setLoading(false)
    }
  }, [client, connected])

  useEffect(() => {
    fetchAccountData()
  }, [fetchAccountData])

  if (!connected) {
    return (
      <div
        style={{
          padding: 16,
          background: '#f1f5f9',
          borderRadius: 12,
          textAlign: 'center',
          color: '#64748b',
          fontSize: 14,
        }}
      >
        Not connected
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 16,
          background: '#f1f5f9',
          borderRadius: 12,
          textAlign: 'center',
          color: '#64748b',
          fontSize: 14,
        }}
      >
        Loading account data...
      </div>
    )
  }

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  return (
    <div
      style={{
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {shortAddress.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              {shortAddress}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Chain ID: {chainId ?? '—'}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderTop: '1px solid #e2e8f0',
          fontSize: 13,
        }}
      >
        <span style={{ color: '#64748b' }}>Balance</span>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          {balance} ETH
        </span>
      </div>
    </div>
  )
}
