# Migration Example: RainbowKit → Cinacoin

> Full before/after example showing a typical RainbowKit + wagmi dApp migrated to Cinacoin.

## Scenario

A multi-chain dApp with wallet connection, account display, chain switching, and SIWE authentication — originally built with RainbowKit + wagmi.

## Before (RainbowKit + wagmi)

```tsx
// App.tsx
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
  useConnectModal,
  useAccountModal,
  useChainModal,
} from '@rainbow-me/rainbowkit'
import {
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useSignMessage,
} from 'wagmi'
import { mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SiweMessage } from 'siwe'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: 'Multi-Chain dApp',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [mainnet, polygon, arbitrum, sepolia],
})

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme="dark"
          initialChainId={mainnet.id}
        >
          <Header />
          <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
            <WalletPanel />
            <ChainManager />
            <SignInPanel />
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function Header() {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid #333',
    }}>
      <h1>Multi-Chain dApp</h1>
      <ConnectButton />
    </header>
  )
}

function WalletPanel() {
  const { address, isConnected, chain } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { openAccountModal } = useAccountModal()
  const { disconnect } = useDisconnect()

  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Wallet</h2>
      {isConnected ? (
        <div style={{ padding: 16, background: '#1a1a2e', borderRadius: 8 }}>
          <p>Address: <code>{address}</code></p>
          <p>Network: {chain?.name} (ID: {chain?.id})</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={openAccountModal}>Account</button>
            <button onClick={() => disconnect()}>Disconnect</button>
          </div>
        </div>
      ) : (
        <button
          onClick={openConnectModal}
          style={{
            padding: '12px 24px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Connect Wallet
        </button>
      )}
    </section>
  )
}

function ChainManager() {
  const { chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const { openChainModal } = useChainModal()

  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Network</h2>
      <button onClick={openChainModal} style={{ marginBottom: 12 }}>
        Change Network
      </button>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => switchChain({ chainId: mainnet.id })}>Ethereum</button>
        <button onClick={() => switchChain({ chainId: polygon.id })}>Polygon</button>
        <button onClick={() => switchChain({ chainId: arbitrum.id })}>Arbitrum</button>
      </div>
    </section>
  )
}

function SignInPanel() {
  const { address, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()

  async function signIn() {
    if (!address || !chainId) return

    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in to Multi-Chain dApp',
      uri: window.location.origin,
      version: '1',
      chainId,
    })

    const signature = await signMessageAsync({
      message: message.prepareMessage(),
    })

    // Send to server for verification
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.prepareMessage(),
        signature,
      }),
    })

    if (!response.ok) {
      throw new Error('Authentication failed')
    }

    console.log('✅ Signed in!')
  }

  return (
    <section>
      <h2>Authentication</h2>
      <button onClick={signIn} disabled={!address}>
        Sign In with Ethereum
      </button>
    </section>
  )
}
```

## After (Cinacoin)

```tsx
// App.tsx
import {
  CinacoinProvider,
  ConnectButton,
  ConnectModal,
  useAccount,
  useConnect,
  useDisconnect,
  useCinacoin,
} from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'
import { generateMessage } from '@cinacoin/siwe'
import { Connector } from '@cinacoin/core-sdk'
import '@cinacoin/design-tokens/base.css'
import { useState } from 'react'

export default function App() {
  return (
    <CinacoinProvider
      projectId={process.env.NEXT_PUBLIC_CINACOIN_PROJECT_ID!}
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
        { id: 'eip155:137', name: 'Polygon', rpcUrl: 'https://rpc.yourdomain.com/polygon' },
        { id: 'eip155:42161', name: 'Arbitrum', rpcUrl: 'https://rpc.yourdomain.com/arbitrum' },
        { id: 'eip155:11155111', name: 'Sepolia', rpcUrl: 'https://rpc.yourdomain.com/sepolia' },
      ]}
      adapters={[new EvmAdapter()]}
      themeMode="dark"
      metadata={{
        name: 'Multi-Chain dApp',
        description: 'A multi-chain decentralized application',
        url: 'https://mydapp.com',
      }}
    >
      <Header />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <WalletPanel />
        <ChainManager />
        <SignInPanel />
      </main>
    </CinacoinProvider>
  )
}

function Header() {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid #333',
    }}>
      <h1>Multi-Chain dApp</h1>
      <ConnectButton
        label="Connect Wallet"
        showBalance={true}
        showChain={true}
      />
    </header>
  )
}

function WalletPanel() {
  const account = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Wallet</h2>
      {account ? (
        <div style={{ padding: 16, background: '#1a1a2e', borderRadius: 8 }}>
          <p>Address: <code>{account.address}</code></p>
          <p>Network: Chain ID {account.chainId}</p>
          <p>Balance: {account.balance} {account.chainSymbol}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setModalOpen(true)}>Account</button>
            <button onClick={() => disconnect()}>Disconnect</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Connect Wallet
        </button>
      )}
      <ConnectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Connect your wallet"
      />
    </section>
  )
}

function ChainManager() {
  const { chainId, switchChain } = useCinacoin()

  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Network</h2>
      <p>Current Chain ID: {chainId}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => switchChain('eip155:1')}>Ethereum</button>
        <button onClick={() => switchChain('eip155:137')}>Polygon</button>
        <button onClick={() => switchChain('eip155:42161')}>Arbitrum</button>
      </div>
    </section>
  )
}

function SignInPanel() {
  const account = useAccount()
  const { signMessage } = useCinacoin()

  async function signIn() {
    if (!account) return

    // 1. Get nonce from server
    const { nonce } = await fetch('/api/auth/nonce').then(r => r.json())

    // 2. Generate SIWE message
    const message = generateMessage({
      domain: window.location.host,
      address: account.address,
      uri: window.location.origin,
      chainId: account.chainId ?? 1,
      nonce,
      statement: 'Sign in to Multi-Chain dApp',
    })

    // 3. Sign with wallet
    const signature = await signMessage(message)

    // 4. Verify on server
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    })

    if (!response.ok) {
      throw new Error('Authentication failed')
    }

    console.log('✅ Signed in!')
  }

  return (
    <section>
      <h2>Authentication</h2>
      <button onClick={signIn} disabled={!account}>
        Sign In with Ethereum
      </button>
    </section>
  )
}
```

## Key Changes Summary

| Area | RainbowKit | Cinacoin |
|------|-----------|-------------|
| Provider | `WagmiProvider` + `RainbowKitProvider` + `QueryClientProvider` | Single `CinacoinProvider` |
| Connect Button | `<ConnectButton />` from RainbowKit | `<ConnectButton />` from Cinacoin |
| Connect Modal | `useConnectModal().openConnectModal()` | `<ConnectModal isOpen={...} />` |
| Chain Switching | `useSwitchChain({ chainId: N })` | `switchChain('eip155:N')` |
| Account | `useAccount()` from wagmi | `useAccount()` from Cinacoin |
| Signing | `useSignMessageAsync()` from wagmi | `signMessage()` from Cinacoin |
| SIWE | `SiweMessage` from siwe package | `generateMessage` from @cinacoin/siwe |
| Dependencies | 6+ packages | 3 packages |
| QueryClient | Required | Not needed |
| Infrastructure | Reown Cloud | Self-hosted Relay + RPC Proxy |

## Automated Migration

Run the codemod to handle the bulk of the migration:

```bash
npx cinacoin-codemod \
  --src-dir ./src \
  --transform rainbowkit-to-cinacoin \
  --verbose
```

Then manually review:
- Chain configs (add your RPC URLs)
- Connector calls (replace connector objects with wallet ID strings)
- SIWE message generation (update to `generateMessage`)
- Remove `@tanstack/react-query` boilerplate

## Next Steps

- [Migrate from RainbowKit Guide](/guide/migrate-from-rainbowkit) — Full migration reference
- [Quick Start](/guide/quick-start) — Cinacoin basics
- [React API](/api/react) — Hook documentation
- [SIWE Auth Example](/examples/siwe-auth) — Authentication setup
