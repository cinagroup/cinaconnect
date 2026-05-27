# Bitcoin Wallet Connection

> Connect to Bitcoin wallets — Unisat, Xverse, Leather, OKX Wallet, SatsConnect, and Wallet Standard.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 / pnpm ≥ 8
- A project ID from your Cinacoin dashboard

## Installation

```bash
npm install @cinacoin/core-sdk @cinacoin/react @cinacoin/adapter-bitcoin
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
        id: 'bip122:000000000019d6689c085ae165831e93',
        name: 'Bitcoin',
        nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
        rpcUrl: 'https://mempool.space/api',
      },
      {
        id: 'bip122:000000000933ea01ad0ee984209779ba',
        name: 'Bitcoin Testnet',
        nativeCurrency: { name: 'Bitcoin', symbol: 'tBTC', decimals: 8 },
        rpcUrl: 'https://mempool.space/testnet/api',
      },
    ],
    metadata: {
      name: 'Bitcoin dApp',
      description: 'Connect to Bitcoin wallets',
      url: 'https://mydapp.com',
      icons: [],
    },
  }}
>
  <App />
</CinacoinProvider>
```

## Complete Example

### 1. Provider Setup

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinacoinProvider } from '@cinacoin/react'
import App from './App'

const bitcoinMainnet = {
  id: 'bip122:000000000019d6689c085ae165831e93',
  name: 'Bitcoin',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
  rpcUrl: 'https://mempool.space/api',
}

const bitcoinTestnet = {
  id: 'bip122:000000000933ea01ad0ee984209779ba',
  name: 'Bitcoin Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'tBTC', decimals: 8 },
  rpcUrl: 'https://mempool.space/testnet/api',
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinacoinProvider
      config={{
        projectId: 'your-project-id',
        relayUrl: 'wss://relay.cinacoin.com/v1',
        chains: [bitcoinMainnet, bitcoinTestnet],
        metadata: {
          name: 'Bitcoin dApp',
          description: 'Bitcoin wallet connection',
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

### 2. Connect & Display Bitcoin Account

```tsx
// src/App.tsx
import { useCinacoin, useAccount, useDisconnect } from '@cinacoin/react'

function BitcoinApp() {
  const { connect, status } = useCinacoin()
  const account = useAccount()
  const { disconnect } = useDisconnect()

  if (account.address) {
    return (
      <div>
        <h2>✅ Connected to Bitcoin</h2>
        <p>Address: <code>{account.address}</code></p>
        <p>Balance: {account.balance} BTC</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Connect Your Bitcoin Wallet</h2>
      <p>Status: {status}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => connect('unisat')}>Unisat</button>
        <button onClick={() => connect('xverse')}>Xverse</button>
        <button onClick={() => connect('leather')}>Leather</button>
        <button onClick={() => connect('okx-bitcoin')}>OKX</button>
      </div>
    </div>
  )
}

export default BitcoinApp
```

### 3. Low-Level SDK with BitcoinConnectorFactory

```ts
// src/btc-wallet.ts
import {
  bitcoinConnectorFactory,
  BitcoinConnectorFactory,
} from '@cinacoin/adapter-bitcoin'

// --- Discover available Bitcoin wallets ---
const available = bitcoinConnectorFactory.detectAvailableConnectors()
console.log('Available wallets:', available.map(c => c.name))

// --- Get recommended connectors (sorted by priority) ---
const recommended = bitcoinConnectorFactory.getRecommendedConnectors()
console.log('Recommended:', recommended[0]?.name) // Usually Unisat

// --- Connect to a specific wallet ---
async function connectUnisat() {
  const connector = bitcoinConnectorFactory.getConnector('unisat')
  if (!connector) {
    throw new Error('Unisat not installed')
  }

  const accounts = await connector.requestAccounts()
  console.log('Connected:', accounts[0])

  return connector
}

// --- Get account addresses ---
async function getAccounts(connector: any) {
  const accounts = await connector.getAccounts()
  return accounts
}

// --- Sign a message (BIP-322) ---
async function signMessage(connector: any, message: string, address: string) {
  const signature = await connector.signMessage(message, address)
  console.log('Signature:', signature)
  return signature
}

// --- Send a Bitcoin transaction ---
async function sendBitcoin(connector: any, recipient: string, satoshis: number) {
  const txid = await connector.sendBitcoin(recipient, satoshis)
  console.log('Transaction ID:', txid)
  return txid
}

// --- Sign a PSBT ---
async function signPsbt(connector: any, psbtBase64: string) {
  const signedPsbt = await connector.signPsbt(psbtBase64)
  return signedPsbt
}
```

### 4. Auto-Detect & Connect

```ts
import { bitcoinConnectorFactory } from '@cinacoin/adapter-bitcoin'

async function autoConnect() {
  // Get recommended connectors sorted by priority
  const recommended = bitcoinConnectorFactory.getRecommendedConnectors()

  for (const connector of recommended) {
    if (connector.isAvailable()) {
      console.log(`Connecting via ${connector.name}...`)
      const accounts = await connector.requestAccounts()
      return { connector, accounts }
    }
  }

  throw new Error('No Bitcoin wallet detected. Install Unisat, Xverse, or Leather.')
}
```

## Supported Wallets

| Wallet | ID | Extension | Mobile |
|--------|-----|-----------|--------|
| Unisat | `unisat` | ✅ | ✅ |
| Xverse | `xverse` | ✅ | ✅ |
| Leather | `leather` | ✅ | ❌ |
| OKX Bitcoin | `okx-bitcoin` | ✅ | ✅ |
| SatsConnect | `sats-connect` | ✅ | ❌ |
| Wallet Standard | `wallet-standard` | ✅ | ❌ |

## Expected Output

```
Available wallets: ['Unisat', 'Xverse', 'Leather']
Recommended: Unisat
Connected: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
Transaction ID: 8f14e45fceea167a5a36dedd4bea2543...
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No wallets detected | Install a Bitcoin browser extension wallet |
| Wrong network | Switch wallet to mainnet/testnet in wallet settings |
| PSBT signing fails | Verify PSBT format matches wallet expectations |

## Related

- [Ethereum](./ethereum.md)
- [Solana](./solana.md)
- [Multi-Chain](./multi-chain.md)
