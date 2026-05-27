# React Hooks Integration

> Deep dive into all Cinacoin React hooks — `useCinacoin`, `useAccount`, `useConnect`, `useDisconnect`, `useChainId`, and EIP-5792 hooks.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A React project (Vite, CRA, or Next.js)
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react viem
```

## Provider Setup

All hooks must be used inside `<CinacoinProvider>`:

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinacoinProvider } from '@cinacoin/react'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinacoinProvider
      config={{
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.cinacoin.com/v1',
        chains: [
          {
            id: 1,
            name: 'Ethereum',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrl: 'https://eth.drpc.org',
          },
          {
            id: 137,
            name: 'Polygon',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrl: 'https://polygon-rpc.com',
          },
        ],
        metadata: {
          name: 'My dApp',
          description: 'React hooks demo',
          url: 'https://mydapp.com',
          icons: [],
        },
      }}
    >
      <App />
    </CinacoinProvider>
  </React.StrictMode>,
)
```

## Hook Reference

### `useCinacoin()`

Access the full Cinacoin context:

```tsx
import { useCinacoin } from '@cinacoin/react'

function FullAccess() {
  const {
    account,         // Account state { address, balance, chainId, ... }
    chainId,         // Current chain ID
    status,          // 'disconnected' | 'connecting' | 'connected' | 'error'
    connectors,      // Available connector list
    connect,         // (walletId) => Promise<void>
    disconnect,      // () => Promise<void>
    switchChain,     // (chainId) => Promise<void>
    isSwitchingChain // boolean
  } = useCinacoin()

  return (
    <div>
      <p>Status: {status}</p>
      <p>Account: {account?.address ?? 'none'}</p>
      <button onClick={() => connect('metamask')}>Connect</button>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}
```

### `useAccount()`

Convenient access to the current account:

```tsx
import { useAccount } from '@cinacoin/react'

function AccountInfo() {
  const { address, balance, chainId, chainName, chainSymbol } = useAccount()

  if (!address) return <p>No account connected</p>

  return (
    <div>
      <p><strong>Address:</strong> <code>{address}</code></p>
      <p><strong>Balance:</strong> {balance} {chainSymbol}</p>
      <p><strong>Chain:</strong> {chainName} (ID: {chainId})</p>
    </div>
  )
}
```

### `useConnect()`

Connect to a wallet:

```tsx
import { useConnect } from '@cinacoin/react'

function ConnectButtons() {
  const { connect, status, isSwitchingChain } = useConnect()

  const wallets = [
    { id: 'metamask', name: 'MetaMask' },
    { id: 'walletconnect', name: 'WalletConnect' },
    { id: 'coinbase', name: 'Coinbase Wallet' },
    { id: 'rainbow', name: 'Rainbow' },
  ]

  return (
    <div>
      {wallets.map((wallet) => (
        <button
          key={wallet.id}
          onClick={() => connect(wallet.id)}
          disabled={status === 'connecting' || isSwitchingChain}
        >
          {wallet.name}
        </button>
      ))}

      {status === 'connecting' && <p>Connecting...</p>}
    </div>
  )
}
```

### `useDisconnect()`

Disconnect from the current wallet:

```tsx
import { useDisconnect } from '@cinacoin/react'

function DisconnectButton() {
  const { disconnect } = useDisconnect()

  return (
    <button onClick={() => disconnect()}>
      Disconnect Wallet
    </button>
  )
}
```

### `useChainId()`

Get the current chain ID:

```tsx
import { useChainId } from '@cinacoin/react'

function ChainDisplay() {
  const chainId = useChainId()

  const names: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    10: 'Optimism',
    42161: 'Arbitrum',
  }

  return <p>Current chain: {names[chainId ?? 0] ?? `Unknown (${chainId})`}</p>
}
```

### EIP-5792 Hooks

```tsx
import {
  useWalletCapabilities,
  useSendCalls,
  useAtomicBatch,
  useCallsStatus,
} from '@cinacoin/react'

function EIP5792Demo() {
  // Discover wallet capabilities
  const { capabilities, isLoading } = useWalletCapabilities()

  // Send batch calls
  const { sendCalls, status: sendStatus } = useSendCalls()

  // Execute atomic batch
  const { atomicBatch, execute, status: batchStatus, reset } = useAtomicBatch()

  // Poll batch call status
  const { callsStatus, isLoading: statusLoading } = useCallsStatus(batchId)

  return <div>{/* UI */}</div>
}
```

## Complete App: All Hooks Together

```tsx
// src/App.tsx
import {
  useCinacoin,
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  ChainSwitcher,
  ConnectButton,
} from '@cinacoin/react'

function App() {
  const account = useAccount()
  const chainId = useChainId()
  const { connect, status, switchChain, isSwitchingChain } = useCinacoin()
  const { disconnect } = useDisconnect()

  // ─── Disconnected State ───
  if (!account.address) {
    return (
      <div style={{ maxWidth: 400, margin: '40px auto', padding: 24 }}>
        <h1>🔢 Cinacoin React Demo</h1>
        <p>Status: <strong>{status}</strong></p>
        <ConnectButton />
        <hr />
        <p>Or connect directly:</p>
        <ConnectButtons />
      </div>
    )
  }

  // ─── Connected State ───
  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24 }}>
      <h1>🔢 Connected</h1>

      {/* Account Card */}
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <p><strong>Address:</strong></p>
        <code style={{ wordBreak: 'break-all' }}>{account.address}</code>
        <p><strong>Balance:</strong> {account.balance} {account.chainSymbol}</p>
        <p><strong>Chain:</strong> {account.chainName} (ID: {account.chainId})</p>
      </div>

      {/* Chain Switching */}
      <div style={{ marginTop: 16 }}>
        <h3>Switch Chain</h3>
        <ChainSwitcher />
        {isSwitchingChain && <p>Switching...</p>}
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => switchChain(1)}>Ethereum</button>
        <button onClick={() => switchChain(137)}>Polygon</button>
        <button onClick={() => switchChain(42161)}>Arbitrum</button>
      </div>

      {/* Disconnect */}
      <div style={{ marginTop: 24 }}>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    </div>
  )
}

// Quick connect buttons
function ConnectButtons() {
  const { connect } = useConnect()
  const wallets = [
    { id: 'metamask', name: 'MetaMask' },
    { id: 'walletconnect', name: 'WalletConnect' },
    { id: 'coinbase', name: 'Coinbase' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {wallets.map(w => (
        <button key={w.id} onClick={() => connect(w.id)}>{w.name}</button>
      ))}
    </div>
  )
}

export default App
```

## Event Listeners

```tsx
import { useEffect } from 'react'
import { useCinacoin } from '@cinacoin/react'

function EventDemo() {
  const { account } = useCinacoin()

  useEffect(() => {
    // Listen for account changes
    if (account.address) {
      console.log('Account changed:', account.address)
    }
  }, [account.address])

  useEffect(() => {
    // Listen for chain changes
    if (account.chainId) {
      console.log('Chain changed:', account.chainId)
    }
  }, [account.chainId])

  return null
}
```

## Custom Hook Example

```tsx
// src/hooks/useBalance.ts
import { useState, useEffect } from 'react'
import { useAccount } from '@cinacoin/react'

/**
 * Custom hook that fetches and formats balance.
 */
export function useFormattedBalance() {
  const { address, balance, chainSymbol } = useAccount()
  const [formatted, setFormatted] = useState<string>('0')

  useEffect(() => {
    if (balance) {
      // Convert from wei to human-readable
      const eth = Number(balance) / 1e18
      setFormatted(eth.toFixed(4))
    }
  }, [balance])

  return { formatted, symbol: chainSymbol, raw: balance, address }
}
```

## UI Components

```tsx
import { ConnectButton, ChainSwitcher } from '@cinacoin/react'

// ConnectButton renders a styled connect/disconnect button
<ConnectButton />

// ChainSwitcher renders a dropdown for chain switching
<ChainSwitcher />
```

## Expected Output

```
Status: connected
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
Balance: 1.2345 ETH
Chain: Ethereum (ID: 1)
```

## Related

- [Ethereum](./ethereum.md)
- [Next.js](./nextjs.md)
- [SIWE Auth](./siwe-auth.md)
- [EIP-5792 Batch](./eip5792-batch.md)
