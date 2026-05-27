# Multi-Chain Switching

> Connect and switch between Ethereum, Solana, Bitcoin, and other supported chains seamlessly.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react
```

## Quick Start: Multi-Chain Provider

```tsx
import { CinacoinProvider } from '@cinacoin/react'
import { ConnectButton, ChainSwitcher, useAccount, useChainId } from '@cinacoin/react'

<CinacoinProvider
  config={{
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
    chains: [
      // Ethereum
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
      {
        id: 42161,
        name: 'Arbitrum',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
      },
      // Solana
      {
        id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Solana',
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      },
      // Bitcoin
      {
        id: 'bip122:000000000019d6689c085ae165831e93',
        name: 'Bitcoin',
        nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
        rpcUrl: 'https://mempool.space/api',
      },
    ],
    metadata: {
      name: 'Multi-Chain dApp',
      description: 'Seamless multi-chain wallet connection',
      url: 'https://mydapp.com',
      icons: [],
    },
  }}
>
  <App />
</CinacoinProvider>
```

## Complete Example

### 1. Full Multi-Chain App

```tsx
// src/App.tsx
import {
  useCinacoin,
  useAccount,
  useChainId,
  useDisconnect,
  useConnect,
  ChainSwitcher,
  ConnectButton,
} from '@cinacoin/react'

function MultiChainApp() {
  const account = useAccount()
  const chainId = useChainId()
  const { disconnect, status } = useCinacoin()
  const { connect, isSwitchingChain } = useConnect()

  if (!account.address) {
    return (
      <div>
        <h1>Multi-Chain dApp</h1>
        <p>Connect your wallet to get started</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>Multi-Chain dApp</h1>

      {/* Connected account info */}
      <div>
        <p><strong>Address:</strong> <code>{account.address}</code></p>
        <p><strong>Balance:</strong> {account.balance} {account.chainSymbol}</p>
        <p><strong>Chain:</strong> {account.chainName} (ID: {account.chainId})</p>
      </div>

      {/* Chain switcher */}
      <div style={{ marginTop: 16 }}>
        <h3>Switch Chain</h3>
        <ChainSwitcher />
        {isSwitchingChain && <p>Switching chain...</p>}
      </div>

      {/* Disconnect */}
      <div style={{ marginTop: 16 }}>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    </div>
  )
}

export default MultiChainApp
```

### 2. Manual Chain Switching

```tsx
import { useCinacoin } from '@cinacoin/react'

function ManualChainSwitcher() {
  const { connect, switchChain, account } = useCinacoin()

  const chains = [
    { id: 1, name: 'Ethereum', symbol: 'ETH' },
    { id: 137, name: 'Polygon', symbol: 'MATIC' },
    { id: 10, name: 'Optimism', symbol: 'OP' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
    { id: 8453, name: 'Base', symbol: 'ETH' },
  ]

  return (
    <div>
      <h3>Select Network</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chains.map((chain) => (
          <button
            key={chain.id}
            onClick={() => switchChain(chain.id)}
            disabled={account.chainId === chain.id}
          >
            {chain.name} {account.chainId === chain.id && '✓'}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### 3. Cross-Chain Balance Display

```tsx
import { useState, useEffect } from 'react'
import { useCinacoin, useAccount } from '@cinacoin/react'
import { Connector } from '@cinacoin/core-sdk'

function CrossChainBalance() {
  const account = useAccount()
  const { switchChain } = useCinacoin()
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const chains = [
    { id: 1, name: 'Ethereum', symbol: 'ETH', rpcUrl: 'https://eth.drpc.org' },
    { id: 137, name: 'Polygon', symbol: 'MATIC', rpcUrl: 'https://polygon-rpc.com' },
    { id: 10, name: 'Optimism', symbol: 'OP', rpcUrl: 'https://mainnet.optimism.io' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  ]

  async function fetchAllBalances() {
    if (!account.address) return
    setLoading(true)

    const results: Record<string, string> = {}
    for (const chain of chains) {
      try {
        await switchChain(chain.id)
        // Balance is available via useAccount after switch
        results[chain.name] = account.balance || '0'
      } catch {
        results[chain.name] = 'Error'
      }
    }

    setBalances(results)
    setLoading(false)
  }

  return (
    <div>
      <h3>Cross-Chain Balances</h3>
      <button onClick={fetchAllBalances} disabled={loading}>
        {loading ? 'Fetching...' : 'Fetch All Balances'}
      </button>

      <table>
        <thead>
          <tr><th>Network</th><th>Balance</th></tr>
        </thead>
        <tbody>
          {chains.map((chain) => (
            <tr key={chain.id}>
              <td>{chain.name}</td>
              <td>{balances[chain.name] ?? '—'} {chain.symbol}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 4. Low-Level Multi-Chain Connection

```ts
import { Connector, SessionManager } from '@cinacoin/core-sdk'

async function connectMultiChain() {
  const connector = new Connector({
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
  })

  // Connect with multiple chains specified
  const result = await connector.connect({
    chains: [1, 137, 42161], // Ethereum, Polygon, Arbitrum
  })

  console.log('Connected accounts:', result.accounts)
  console.log('Active chain:', result.chainId)
  console.log('Session:', result.sessionId)

  // Switch chains within the same session
  await connector.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x89' }], // 137 = Polygon
  })
}
```

### 5. Chain-Aware Components

```tsx
import { useChainId, useAccount } from '@cinacoin/react'

function ChainAwareUI() {
  const chainId = useChainId()
  const account = useAccount()

  const chainConfig = getChainConfig(chainId)

  return (
    <div>
      <NetworkBadge chainId={chainId} />
      <BalanceDisplay
        balance={account.balance}
        symbol={account.chainSymbol}
      />
    </div>
  )
}

function getChainConfig(chainId: number | string | null) {
  const configs: Record<number, { name: string; explorer: string }> = {
    1: { name: 'Ethereum', explorer: 'https://etherscan.io' },
    137: { name: 'Polygon', explorer: 'https://polygonscan.com' },
    10: { name: 'Optimism', explorer: 'https://optimistic.etherscan.io' },
    42161: { name: 'Arbitrum', explorer: 'https://arbiscan.io' },
    8453: { name: 'Base', explorer: 'https://basescan.org' },
  }
  return configs[chainId as number] ?? { name: 'Unknown', explorer: '' }
}
```

## Expected Output

```
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
Balance: 1.234 ETH
Chain: Ethereum (ID: 1)

Cross-Chain Balances:
  Ethereum:  1.234 ETH
  Polygon:   50.0 MATIC
  Optimism:  0.5 OP
  Arbitrum:  0.8 ETH
```

## Supported Chains

| Chain | ID | Namespace |
|-------|-----|-----------|
| Ethereum | `1` | `eip155` |
| Polygon | `137` | `eip155` |
| Arbitrum | `42161` | `eip155` |
| Optimism | `10` | `eip155` |
| Base | `8453` | `eip155` |
| BNB Chain | `56` | `eip155` |
| Avalanche | `43114` | `eip155` |
| Solana | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | `solana` |
| Bitcoin | `bip122:000000000019d6689c085ae165831e93` | `bip122` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Chain switch rejected | Wallet may not support the target chain |
| Balance shows 0 after switch | Wait for state sync; check RPC connectivity |
| Different address on different chain | Some wallets use different derivation paths |

## Related

- [Ethereum](./ethereum.md)
- [Solana](./solana.md)
- [Bitcoin](./bitcoin.md)
