# Solana Wallet Connection

> Connect to Solana wallets — Phantom, Solflare, and other Solana wallet providers.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react
```

## Quick Start

```tsx
import { CinacoinProvider } from '@cinacoin/react'
import { ConnectButton, useAccount } from '@cinacoin/react'

<CinacoinProvider
  config={{
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
    chains: [
      {
        id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Solana',
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      },
      {
        id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
        name: 'Solana Devnet',
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        rpcUrl: 'https://api.devnet.solana.com',
      },
    ],
    metadata: {
      name: 'Solana dApp',
      description: 'Connect to Solana wallets',
      url: 'https://mydapp.com',
      icons: [],
    },
  }}
>
  <App />
</CinacoinProvider>
```

## Complete Example

### 1. Provider Setup with Solana Chains

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinacoinProvider } from '@cinacoin/react'
import App from './App'

const solanaMainnet = {
  id: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'Solana',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  rpcUrl: 'https://api.mainnet-beta.solana.com',
}

const solanaDevnet = {
  id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  name: 'Solana Devnet',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  rpcUrl: 'https://api.devnet.solana.com',
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinacoinProvider
      config={{
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.cinacoin.com/v1',
        chains: [solanaMainnet, solanaDevnet],
        metadata: {
          name: 'Solana dApp',
          description: 'Solana wallet connection example',
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

### 2. Connect & Display Solana Account

```tsx
// src/App.tsx
import { useCinacoin, useAccount, useDisconnect } from '@cinacoin/react'

function SolanaApp() {
  const { connect, status } = useCinacoin()
  const account = useAccount()
  const { disconnect } = useDisconnect()

  if (account.address) {
    return (
      <div>
        <h2>✅ Connected to Solana</h2>
        <p>Address: <code>{account.address}</code></p>
        <p>Balance: {account.balance} SOL</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Connect Your Solana Wallet</h2>
      <p>Status: {status}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => connect('phantom')}>Phantom</button>
        <button onClick={() => connect('solflare')}>Solflare</button>
        <button onClick={() => connect('backpack')}>Backpack</button>
      </div>
    </div>
  )
}

export default SolanaApp
```

### 3. Low-Level SDK (Vanilla JS)

```ts
// src/solana-wallet.ts
import { Connector, InjectedProvider } from '@cinacoin/core-sdk'

async function connectPhantom() {
  const connector = new Connector({
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
  })

  const provider = new InjectedProvider()
  const result = await connector.connect({
    provider,
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  })

  console.log('Connected:', result.accounts[0])
  console.log('Chain:', result.chainId)
  console.log('Session ID:', result.sessionId)

  return result
}

// Sign a message (Solana-style)
async function signMessage(address: string, message: string) {
  const connector = new Connector({
    projectId: 'your-project-id',
  })

  // Solana uses signMessage for arbitrary messages
  const signature = await connector.request({
    method: 'signMessage',
    params: [new TextEncoder().encode(message)],
  })

  return signature
}

// Send a Solana transaction
async function sendTransaction(encodedTx: string) {
  const connector = new Connector({
    projectId: 'your-project-id',
  })

  const signature = await connector.request({
    method: 'signAndSendTransaction',
    params: [encodedTx],
  })

  console.log('Transaction signature:', signature)
  return signature
}
```

### 4. Connect via Wallet Adapter

```ts
import { Connector } from '@cinacoin/core-sdk'

async function connectViaRelay(walletId: string) {
  const connector = new Connector({
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
  })

  const result = await connector.connect({
    connectorId: walletId, // 'phantom', 'solflare', 'backpack'
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  })

  return result
}
```

## Expected Output

```
Connected: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Chain: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
Session ID: sol_abc123...
```

## Common RPC Methods

```ts
// Get balance
const balance = await connector.request({
  method: 'getBalance',
  params: [address],
})

// Get recent blockhash
const blockhash = await connector.request({
  method: 'getRecentBlockhash',
  params: [],
})

// Sign a versioned transaction
const signedTx = await connector.request({
  method: 'signTransaction',
  params: [serializedTransaction],
})
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Phantom not detected | Ensure Phantom extension is installed and unlocked |
| Devnet SOL has no balance | Request devnet SOL from faucet |
| Transaction fails | Verify recent blockhash hasn't expired |

## Related

- [Ethereum](./ethereum.md)
- [Bitcoin](./bitcoin.md)
- [Multi-Chain](./multi-chain.md)
