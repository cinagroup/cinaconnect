import { useState, useCallback, useEffect } from 'react'
import { createHeadlessClient, type HeadlessClient } from '@cinacoin/config'

interface ConnectButtonProps {
  client: HeadlessClient
  onConnected?: (account: string) => void
}

/**
 * HeadlessConnectButton — a completely custom connect button.
 *
 * Uses only the headless client API (`@cinacoin/config`) with zero
 * built-in UI. You control every pixel of the experience.
 *
 * @example
 * ```tsx
 * const client = createHeadlessClient({ projectId: 'your-project-id' })
 *
 * <HeadlessConnectButton
 *   client={client}
 *   onConnected={(account) => console.log('Connected:', account)}
 * />
 * ```
 */
export function HeadlessConnectButton({
  client,
  onConnected,
}: ConnectButtonProps) {
  const [account, setAccount] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = useCallback(async () => {
    if (account) return // Already connected
    setConnecting(true)
    setError(null)

    try {
      const result = await client.connect()
      const address = result?.address ?? result?.account ?? '0xunknown'
      setAccount(address)
      onConnected?.(address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }, [account, client, onConnected])

  const handleDisconnect = useCallback(async () => {
    try {
      await client.disconnect()
      setAccount(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    }
  }, [client])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!account ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          style={{
            padding: '10px 20px',
            background: connecting ? '#94a3b8' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: connecting ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <button
          onClick={handleDisconnect}
          style={{
            padding: '10px 20px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Disconnect
        </button>
      )}
      {error && (
        <span style={{ color: '#dc2626', fontSize: 12 }}>{error}</span>
      )}
    </div>
  )
}
