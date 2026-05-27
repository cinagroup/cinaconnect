# Ethereum Wallet Connection

> Full Ethereum (EVM) wallet connection example — MetaMask, WalletConnect, Coinbase Wallet, and low-level SDK.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react viem
```

## Quick Start: Connect in 3 Lines

```tsx
import { CinacoinProvider } from '@cinacoin/react'
import { ConnectButton, useAccount } from '@cinacoin/react'

// Wrap your app
<CinacoinProvider config={{ projectId: 'YOUR_PROJECT_ID' }}>
  <App />
</CinacoinProvider>

// Drop a button anywhere
<ConnectButton />

// Read account state
const { address, balance, chainId } = useAccount()
```

## Complete Example

### 1. Provider Setup

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
            id: 11155111,
            name: 'Sepolia',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrl: 'https://sepolia.drpc.org',
          },
        ],
        metadata: {
          name: 'Ethereum dApp',
          description: 'Connect to Ethereum wallets',
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

### 2. Connect & Display Account

```tsx
// src/App.tsx
import { useCinacoin, useAccount, useDisconnect } from '@cinacoin/react'

function App() {
  const { connect, status, connectors } = useCinacoin()
  const account = useAccount()
  const { disconnect } = useDisconnect()

  if (account.address) {
    return (
      <div>
        <h2>✅ Connected</h2>
        <p>Address: <code>{account.address}</code></p>
        <p>Chain ID: {account.chainId}</p>
        <p>Balance: {account.balance} {account.chainSymbol}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Connect Your Ethereum Wallet</h2>
      <p>Status: {status}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => connect('metamask')}>MetaMask</button>
        <button onClick={() => connect('walletconnect')}>WalletConnect</button>
        <button onClick={() => connect('coinbase')}>Coinbase Wallet</button>
      </div>
    </div>
  )
}

export default App
```

### 3. Low-Level SDK (Vanilla JS / TypeScript)

```ts
// src/eth-wallet.ts
import { Connector, InjectedProvider, EvmAdapter } from '@cinacoin/core-sdk'

// --- Connect via injected provider (MetaMask) ---
async function connectMetaMask() {
  const connector = new Connector({
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
  })

  const provider = new InjectedProvider()
  const result = await connector.connect({
    provider,
    chainId: 1,
  })

  console.log('Connected:', result.accounts[0])
  console.log('Chain ID:', result.chainId)
  console.log('Session ID:', result.sessionId)

  return result
}

// --- Connect via EVM Adapter (supports multiple connectors) ---
async function connectViaEvmAdapter(walletId: string) {
  const adapter = new EvmAdapter({
    projectId: 'your-project-id',
  })

  const result = await adapter.connect({
    connectorId: walletId, // 'metamask', 'walletconnect', 'coinbase'
    chainId: 1,
  })

  return result
}

// --- Sign a message ---
async function signMessage(address: string, message: string) {
  const connector = new Connector({
    projectId: 'your-project-id',
  })

  const signature = await connector.request({
    method: 'personal_sign',
    params: [message, address],
  })

  return signature
}

// --- Send a transaction ---
async function sendTransaction(from: string, to: string, value: string) {
  const connector = new Connector({
    projectId: 'your-project-id',
  })

  const txHash = await connector.request({
    method: 'eth_sendTransaction',
    params: [{ from, to, value }],
  })

  console.log('Transaction sent:', txHash)
  return txHash
}
```

### 4. EIP-6963 Wallet Discovery

```ts
import { discoverWallets, watchWallets, findWalletByRdns } from '@cinacoin/core-sdk'

// Discover all EIP-6963 wallets in the browser
const wallets = await discoverWallets()
wallets.forEach(w => {
  console.log(`${w.info.name} (${w.info.rdns})`)
})

// Watch for wallets appearing/disappearing (e.g., user installs extension)
watchWallets((detail) => {
  console.log('Wallet event:', detail.type, detail.info.name)
})

// Find a specific wallet by RDNS
const metamask = findWalletByRdns('io.metamask')
```

### 5. Session Management

```ts
import { SessionManager, createCinacoinStore } from '@cinacoin/core-sdk'

// Create a persistent state store
const store = createCinacoinStore({
  persistKey: 'cinacoin-state',
})

// Initialize with previous session
await initializeStore(store)

if (store.state.status === 'connected') {
  console.log('Restored session:', store.state.session?.sessionId)
}
```

## Expected Output

```
Connected: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
Chain ID: 1
Session ID: abc123...
Transaction sent: 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060
```

## Common RPC Methods

```ts
// eth_call (read contract)
const balance = await connector.request({
  method: 'eth_call',
  params: [{ to: '0xContract...', data: '0x70a08231...' }, 'latest'],
})

// eth_estimateGas
const gasEstimate = await connector.request({
  method: 'eth_estimateGas',
  params: [{ from: address, to: recipient, data: '0x...' }],
})

// eth_getBalance
const balance = await connector.request({
  method: 'eth_getBalance',
  params: [address, 'latest'],
})
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MetaMask not detected | Check `window.ethereum` exists; user may need to install extension |
| Wrong chain | Call `wallet_switchEthereumChain` or use `useSwitchChain` hook |
| User rejected | Catch the error and show a friendly message |

## Related

- [React Integration](./react-integration.md)
- [SIWE Auth](./siwe-auth.md)
- [Multi-Chain](./multi-chain.md)
- [EIP-5792 Batch](./eip5792-batch.md)
- [Next.js](./nextjs.md)
