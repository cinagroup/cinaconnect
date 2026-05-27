import { useState, useCallback } from 'react'
import type { HeadlessClient } from '@cinacoin/config'

interface NetworkOption {
  chainId: number
  name: string
  rpcUrl?: string
  icon?: string
}

interface NetworkSelectorProps {
  client: HeadlessClient
  networks: NetworkOption[]
  currentChainId?: number
  onNetworkChange?: (chainId: number) => void
}

const DEFAULT_NETWORKS: NetworkOption[] = [
  { chainId: 1, name: 'Ethereum Mainnet', icon: '🔵' },
  { chainId: 137, name: 'Polygon', icon: '🟣' },
  { chainId: 42161, name: 'Arbitrum One', icon: '🔵' },
  { chainId: 10, name: 'Optimism', icon: '🔴' },
  { chainId: 8453, name: 'Base', icon: '🔵' },
  { chainId: 56, name: 'BNB Chain', icon: '🟡' },
  { chainId: 43114, name: 'Avalanche', icon: '🔴' },
  { chainId: 84532, name: 'Base Sepolia', icon: '🔵' },
  { chainId: 11155111, name: 'Sepolia Testnet', icon: '🟢' },
]

/**
 * HeadlessNetworkSelector — a custom network/chain selector.
 *
 * Renders a fully custom dropdown for switching chains using only
 * the headless client API. No built-in UI components involved.
 *
 * @example
 * ```tsx
 * const client = createHeadlessClient({ projectId })
 *
 * <HeadlessNetworkSelector
 *   client={client}
 *   networks={[
 *     { chainId: 1, name: 'Ethereum', icon: '🔵' },
 *     { chainId: 137, name: 'Polygon', icon: '🟣' },
 *   ]}
 *   currentChainId={currentChain}
 *   onNetworkChange={(id) => console.log('Switched to', id)}
 * />
 * ```
 */
export function HeadlessNetworkSelector({
  client,
  networks = DEFAULT_NETWORKS,
  currentChainId,
  onNetworkChange,
}: NetworkSelectorProps) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = useCallback(
    async (chainId: number) => {
      setOpen(false)
      setSwitching(chainId)
      setError(null)

      try {
        await client.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        })
        onNetworkChange?.(chainId)
      } catch (switchError: unknown) {
        // Chain not added to wallet — try to add it
        const network = networks.find((n) => n.chainId === chainId)
        if (network?.rpcUrl) {
          try {
            await client.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${chainId.toString(16)}`,
                  chainName: network.name,
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                  rpcUrls: [network.rpcUrl],
                },
              ],
            })
            onNetworkChange?.(chainId)
          } catch (addError) {
            setError(
              addError instanceof Error
                ? addError.message
                : 'Failed to add network'
            )
          }
        } else {
          setError(
            switchError instanceof Error
              ? switchError.message
              : 'Failed to switch network'
          )
        }
      } finally {
        setSwitching(null)
      }
    },
    [client, networks, onNetworkChange]
  )

  const currentNetwork = networks.find((n) => n.chainId === currentChainId)

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          color: '#1e293b',
        }}
      >
        {currentNetwork ? (
          <>
            <span>{currentNetwork.icon}</span>
            <span>{currentNetwork.name}</span>
          </>
        ) : (
          <span style={{ color: '#94a3b8' }}>Select Network</span>
        )}
        <span style={{ fontSize: 10, marginLeft: 4 }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 100,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              minWidth: 220,
              maxHeight: 320,
              overflowY: 'auto',
              padding: 4,
            }}
          >
            {networks.map((network) => {
              const isCurrent = network.chainId === currentChainId
              const isSwitching = switching === network.chainId

              return (
                <button
                  key={network.chainId}
                  onClick={() => handleSelect(network.chainId)}
                  disabled={isSwitching}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    background: isCurrent ? '#eff6ff' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: isSwitching ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    color: isCurrent ? '#2563eb' : '#1e293b',
                    fontWeight: isCurrent ? 600 : 400,
                    textAlign: 'left',
                  }}
                >
                  <span>{network.icon}</span>
                  <span style={{ flex: 1 }}>{network.name}</span>
                  {isSwitching && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Switching...
                    </span>
                  )}
                  {isCurrent && !isSwitching && (
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Error display */}
      {error && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
