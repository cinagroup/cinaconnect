# Migration Example: ConnectKit → Cinacoin

> Full before/after example showing a typical ConnectKit + wagmi dApp migrated to Cinacoin.

## Scenario

A DeFi dashboard with wallet connection, account info, and token balance display — originally built with ConnectKit + wagmi.

## Before (ConnectKit + wagmi)

```tsx
// App.tsx
import { ConnectKitProvider, ConnectKitButton } from 'connectkit'
import {
  WagmiProvider,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useEnsName,
  useEnsAvatar,
} from 'wagmi'
import { mainnet, polygon, base } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = createConfig({
  chains: [mainnet, polygon, base],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
      metadata: {
        name: 'DeFi Dashboard',
        description: 'Track your DeFi portfolio',
        url: 'https://defidashboard.app',
      },
    }),
    coinbaseWallet({
      appName: 'DeFi Dashboard',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
})

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="dark"
          customTheme={{
            '--ck-accent-color': '#10b981',
            '--ck-border-radius': '12px',
          }}
        >
          <Header />
          <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
            <Dashboard />
          </main>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function Header() {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid #333',
    }}>
      <h1>DeFi Dashboard</h1>
      <ConnectKitButton />
    </header>
  )
}

function Dashboard() {
  const account = useAccount()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address: account.address })
  const { data: ensName } = useEnsName({ address: account.address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  if (!account.isConnected) {
    return <p>Connect your wallet to view your portfolio.</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {ensAvatar && <img src={ensAvatar} alt="ENS" width={48} height={48} />}
        <div>
          <h2>{ensName || 'Wallet'}</h2>
          <code style={{ fontSize: 14, color: '#888' }}>
            {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
          </code>
        </div>
      </div>

      <div style={{
        padding: 20,
        background: '#1a1a2e',
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <h3>Balance</h3>
        <p style={{ fontSize: 28, fontWeight: 'bold' }}>
          {balance?.formatted ?? '0'} {balance?.symbol}
        </p>
        <p style={{ color: '#888' }}>
          Network: {account.chain?.name}
        </p>
      </div>

      <button
        onClick={() => disconnect()}
        style={{
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Disconnect
      </button>
    </div>
  )
}
```

## After (Cinacoin)

```tsx
// App.tsx
import {
  CinacoinProvider,
  ConnectButton,
  useAccount,
  useConnect,
  useDisconnect,
  useCinacoin,
} from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'
import '@cinacoin/design-tokens/base.css'

export default function App() {
  return (
    <CinacoinProvider
      projectId={process.env.NEXT_PUBLIC_CINACOIN_PROJECT_ID!}
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
        { id: 'eip155:137', name: 'Polygon', rpcUrl: 'https://rpc.yourdomain.com/polygon' },
        { id: 'eip155:8453', name: 'Base', rpcUrl: 'https://rpc.yourdomain.com/base' },
      ]}
      adapters={[new EvmAdapter()]}
      themeMode="dark"
      metadata={{
        name: 'DeFi Dashboard',
        description: 'Track your DeFi portfolio',
        url: 'https://defidashboard.app',
      }}
    >
      <Header />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <Dashboard />
      </main>
    </CinacoinProvider>
  )
}

function Header() {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid #333',
    }}>
      <h1>DeFi Dashboard</h1>
      <ConnectButton
        label="Connect Wallet"
        showBalance={true}
        showChain={true}
      />
    </header>
  )
}

function Dashboard() {
  const account = useAccount()
  const { disconnect } = useDisconnect()
  const { ensName, ensAvatar } = useCinacoin()

  if (!account) {
    return <p>Connect your wallet to view your portfolio.</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {ensAvatar && <img src={ensAvatar} alt="ENS" width={48} height={48} />}
        <div>
          <h2>{ensName || 'Wallet'}</h2>
          <code style={{ fontSize: 14, color: '#888' }}>
            {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
          </code>
        </div>
      </div>

      <div style={{
        padding: 20,
        background: '#1a1a2e',
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <h3>Balance</h3>
        <p style={{ fontSize: 28, fontWeight: 'bold' }}>
          {account.balance ?? '0'} {account.chainSymbol}
        </p>
        <p style={{ color: '#888' }}>
          Chain ID: {account.chainId}
        </p>
      </div>

      <button
        onClick={() => disconnect()}
        style={{
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Disconnect
      </button>
    </div>
  )
}
```

## Key Changes Summary

| Area | ConnectKit | Cinacoin |
|------|-----------|-------------|
| Provider | `WagmiProvider` + `ConnectKitProvider` + `QueryClientProvider` | Single `CinacoinProvider` |
| Connect Button | `<ConnectKitButton />` | `<ConnectButton />` |
| Config | `createConfig()` with connectors + transports | Inline provider props |
| Balance | `useBalance({ address })` hook | `account.balance` from `useAccount()` |
| ENS | `useEnsName()` + `useEnsAvatar()` | `ensName` + `ensAvatar` from `useCinacoin()` |
| Theming | `customTheme` CSS variables | `@cinacoin/design-tokens` |
| Dependencies | 6+ packages | 3 packages |
| QueryClient | Required | Not needed |
| Infrastructure | Reown Cloud for WC | Self-hosted Relay |

## Automated Migration

```bash
npx cinacoin-codemod \
  --src-dir ./src \
  --transform connectkit-to-cinacoin \
  --verbose
```

Manual steps after codemod:
- Add your RPC Proxy URLs to chain configs
- Remove `QueryClient` boilerplate (codemod comments it out)
- Replace `customTheme` with design token imports
- Update `useBalance` → `account.balance`
- Update ENS access → `useCinacoin().ensName`

## Next Steps

- [Migrate from ConnectKit Guide](/guide/migrate-from-connectkit) — Full migration reference
- [Quick Start](/guide/quick-start) — Cinacoin basics
- [React API](/api/react) — Hook documentation
