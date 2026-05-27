# Migration Guide: Family/ConnectKit → Cinacoin

> Complete guide for migrating from Family.co ConnectKit (wagmi-based) to Cinacoin.

## Overview

ConnectKit by Family.co is a lightweight wallet connection UI built on wagmi. Cinacoin provides the same streamlined developer experience with full self-hosting capabilities, multi-chain support, and zero third-party dependencies.

## Architecture Comparison

| Layer | ConnectKit Stack | Cinacoin |
|-------|-----------------|-------------|
| UI Components | `connectkit` | `@cinacoin/react` (ConnectButton, ConnectModal) |
| Hooks & Logic | `wagmi` + `viem` | `@cinacoin/react` (useCinacoin, useAccount) |
| Transport | WalletConnect Cloud (for WC connector) | Self-hosted Cinacoin Relay |
| RPC | Configured in wagmi | Self-hosted RPC Proxy |
| Theming | `ConnectKitProvider` theme props | Component `theme` prop + design tokens |
| SIWE Auth | Custom integration | `@cinacoin/siwe` built-in |

## Why Migrate from ConnectKit?

| Factor | ConnectKit | Cinacoin |
|--------|-----------|-------------|
| Underlying dependency | wagmi + viem | Self-contained SDK |
| WalletConnect relay | Reown Cloud | Self-hosted Relay Server |
| Customization | Limited theme options | Full design token system |
| Brand control | "Powered by Family.co" badge | Fully white-label |
| Cost | Free tier, then depends on WC costs | $0 (self-hosted infra costs only) |
| Multi-framework | React only | React, Vue, Svelte, Angular, React Native, Flutter |

## Step-by-Step Migration

### 1. Remove ConnectKit + wagmi

```bash
npm uninstall connectkit wagmi viem @wagmi/connectors
```

### 2. Install Cinacoin

```bash
npm install @cinacoin/core @cinacoin/react @cinacoin/core-sdk
```

### 3. Replace Provider Setup

#### Before (ConnectKit)

```tsx
// App.tsx
import { ConnectKitProvider, ConnectKitButton } from 'connectkit'
import { WagmiProvider, createConfig } from 'wagmi'
import { mainnet, polygon } from 'wagmi/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = createConfig({
  chains: [mainnet, polygon],
  connectors: [
    injected(),
    walletConnect({ projectId: 'YOUR_WC_PROJECT_ID' }),
    coinbaseWallet({ appName: 'My dApp' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
  },
})

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="dark"
          customTheme={{
            '--ck-font-family': 'Inter, sans-serif',
            '--ck-border-radius': '12px',
            '--ck-accent-color': '#6366f1',
          }}
          initialChainId={1}
        >
          <YourApp />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

#### After (Cinacoin)

```tsx
// App.tsx
import { CinacoinProvider, ConnectButton } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

function App() {
  return (
    <CinacoinProvider
      projectId="your-cinacoin-project-id"
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
        { id: 'eip155:137', name: 'Polygon', rpcUrl: 'https://rpc.yourdomain.com/polygon' },
      ]}
      adapters={[new EvmAdapter()]}
      themeMode="dark"
      metadata={{
        name: 'My dApp',
        description: 'My awesome dApp',
        url: 'https://mydapp.com',
      }}
    >
      <YourApp />
    </CinacoinProvider>
  )
}
```

### 4. Replace Connect Button

#### Before (ConnectKit)

```tsx
import { ConnectKitButton } from 'connectkit'

function Header() {
  return <ConnectKitButton />
}
```

#### After (Cinacoin)

```tsx
import { ConnectButton } from '@cinacoin/react'

function Header() {
  return (
    <ConnectButton
      label="Connect Wallet"
      showBalance={true}
      showChain={true}
    />
  )
}
```

## API Mapping Table

| ConnectKit/wagmi | Cinacoin | Notes |
|------------------|-------------|-------|
| `<ConnectKitProvider>` | `<CinacoinProvider>` | Provider component |
| `<ConnectKitButton>` | `<ConnectButton>` | Drop-in replacement |
| `useAccount()` (wagmi) | `useAccount()` | Same name, same purpose |
| `useConnect()` (wagmi) | `useConnect()` | Same name, walletId-based |
| `useDisconnect()` (wagmi) | `useDisconnect()` | Same name |
| `useSwitchChain()` (wagmi) | `useCinacoin().switchChain` | Via main hook |
| `useEnsName()` (wagmi) | `useCinacoin().ensName` | Built-in ENS |
| `useEnsAvatar()` (wagmi) | `useCinacoin().ensAvatar` | Built-in ENS avatar |
| `useBalance()` (wagmi) | `useAccount().balance` | In account state |
| `connect({ connector })` | `connect(walletId)` | String-based API |
| `createConfig()` | `CinacoinProvider` config props | Inline config |
| ConnectKit theme props | `themeMode` + design tokens | More flexible theming |
| `initialChainId` | `chains` array order | First chain is default |

## Hook Usage Comparison

### useAccount()

#### Before (ConnectKit + wagmi)

```tsx
import { useAccount } from 'wagmi'

function AccountInfo() {
  const { address, isConnected, chain } = useAccount()

  return isConnected ? (
    <div>
      <p>{address}</p>
      <p>{chain?.name}</p>
    </div>
  ) : <p>Not connected</p>
}
```

#### After (Cinacoin)

```tsx
import { useAccount } from '@cinacoin/react'

function AccountInfo() {
  const account = useAccount()

  return account ? (
    <div>
      <p>{account.address}</p>
      <p>Chain ID: {account.chainId}</p>
      <p>Balance: {account.balance} {account.chainSymbol}</p>
    </div>
  ) : <p>Not connected</p>
}
```

### Custom Connect Flow

#### Before (ConnectKit + wagmi)

```tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

function ConnectPanel() {
  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div>
      {isConnected ? (
        <button onClick={() => disconnect()}>Disconnect</button>
      ) : (
        <>
          {connectors.map((connector) => (
            <button key={connector.id} onClick={() => connect({ connector })}>
              {connector.name}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
```

#### After (Cinacoin)

```tsx
import { useAccount, useConnect, useDisconnect } from '@cinacoin/react'

function ConnectPanel() {
  const account = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const wallets = ['metamask', 'walletconnect', 'coinbase']

  return (
    <div>
      {account ? (
        <button onClick={() => disconnect()}>Disconnect</button>
      ) : (
        <>
          {wallets.map((walletId) => (
            <button key={walletId} onClick={() => connect(walletId)}>
              {walletId}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
```

## Theming Migration

### Before (ConnectKit Theme)

```tsx
<ConnectKitProvider
  theme="dark"
  customTheme={{
    '--ck-font-family': 'Inter, sans-serif',
    '--ck-border-radius': '12px',
    '--ck-accent-color': '#6366f1',
    '--ck-accent-text-color': '#ffffff',
    '--ck-body-background': '#1a1a2e',
    '--ck-body-color': '#ffffff',
    '--ck-overlay-background': 'rgba(0,0,0,0.7)',
  }}
  options={{
    language: 'en-US',
    reduceMotion: false,
  }}
>
```

### After (Cinacoin Theme)

```tsx
<CinacoinProvider
  themeMode="dark"
  // Additional theme customization via design tokens
  // See @cinacoin/design-tokens for full token list
>
```

For advanced theming, use the design token system:

```tsx
import '@cinacoin/design-tokens/base.css'
import '@cinacoin/design-tokens/dark.css'

// Override specific tokens in your CSS
:root {
  --cc-primary-color: #6366f1;
  --cc-border-radius: 12px;
  --cc-font-family: 'Inter, sans-serif';
}
```

## Breaking Changes

### 1. No wagmi/viem Dependency

ConnectKit requires wagmi. Cinacoin is self-contained. For contract interactions, use ethers.js, viem, or any library directly — Cinacoin handles the wallet transport layer.

### 2. Connector API

ConnectKit uses wagmi connector objects. Cinacoin uses wallet ID strings for simplicity.

### 3. No QueryClient Required

ConnectKit needs `@tanstack/react-query`. Cinacoin manages its own state.

### 4. Chain Configuration

| ConnectKit (wagmi) | Cinacoin |
|--------------------|-------------|
| `chains: [mainnet, polygon]` from wagmi/chains | Custom `chains` array with RPC URLs |
| Transports via `http()` | RPC URLs in chain config, routed through RPC Proxy |

### 5. Built-in Wallet Registry

ConnectKit relies on wagmi connectors. Cinacoin has a built-in wallet registry with EIP-6963 auto-discovery.

## Migration Examples

### Example 1: Minimal dApp

#### Before

```tsx
import { ConnectKitProvider, ConnectKitButton } from 'connectkit'
import { WagmiProvider, createConfig, useAccount } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: { [mainnet.id]: http() },
})

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <ConnectKitButton />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

#### After

```tsx
import { CinacoinProvider, ConnectButton } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

export default function App() {
  return (
    <CinacoinProvider
      projectId="your-project-id"
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
      ]}
      adapters={[new EvmAdapter()]}
    >
      <ConnectButton />
    </CinacoinProvider>
  )
}
```

### Example 2: SIWE Authentication

#### Before (ConnectKit + SIWE)

```tsx
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'

function SignIn() {
  const { address, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()

  async function signIn() {
    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in to the dApp',
      uri: window.location.origin,
      version: '1',
      chainId,
    })

    const signature = await signMessageAsync({
      message: message.prepareMessage(),
    })

    // Verify on server
    await fetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    })
  }

  return <button onClick={signIn}>Sign In</button>
}
```

#### After (Cinacoin SIWE)

```tsx
import { useAccount, useCinacoin } from '@cinacoin/react'
import { generateMessage } from '@cinacoin/siwe'
import { Connector } from '@cinacoin/core-sdk'

function SignIn() {
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
      chainId: account.chainId,
      nonce,
      statement: 'Sign in to the dApp',
    })

    // 3. Sign with wallet
    const signature = await signMessage(message)

    // 4. Verify on server
    await fetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    })
  }

  if (!account) return <p>Connect wallet first</p>

  return <button onClick={signIn}>Sign In</button>
}
```

## Infrastructure Migration

### Relay & RPC

If your ConnectKit project used WalletConnect for any connectors:

| Component | ConnectKit | Cinacoin |
|-----------|-----------|-------------|
| WC Relay | Reown Cloud (via projectId) | Your Relay Server |
| RPC | Alchemy/Infura in wagmi config | Cinacoin RPC Proxy |

Deploy self-hosted infrastructure:

```bash
# Relay Server
cd packages/relay-server && cargo build --release

# RPC Proxy
cd packages/rpc-proxy && cargo build --release

# Full Helm deployment
helm install cinacoin ./deploy/helm/cinacoin \
  --namespace cinacoin --create-namespace
```

## Automated Migration

```bash
# Install codemod
npm install -D @cinacoin/codemod

# Run transform
npx cinacoin-codemod --src-dir ./src --transform connectkit-to-cinacoin --dry-run --verbose
```

## Migration Checklist

### Pre-Migration

- [ ] Deploy Cinacoin Relay Server
- [ ] Deploy Cinacoin RPC Proxy
- [ ] Configure supported chains

### Code Migration

- [ ] Remove `connectkit`, `wagmi`, `viem` dependencies
- [ ] Install `@cinacoin/core`, `@cinacoin/react`, `@cinacoin/core-sdk`
- [ ] Replace `ConnectKitProvider` with `CinacoinProvider`
- [ ] Replace `ConnectKitButton` with `ConnectButton`
- [ ] Update wagmi hooks to Cinacoin hooks
- [ ] Migrate custom theme to design tokens
- [ ] Test all wallet connection flows

### Testing

- [ ] Test injected wallet connections (MetaMask, Rabby)
- [ ] Test WalletConnect QR code flow
- [ ] Test Coinbase Wallet
- [ ] Test chain switching
- [ ] Test disconnect/reconnect
- [ ] Test on mobile browsers
- [ ] Test SIWE authentication (if applicable)

### Deployment

- [ ] Deploy Relay and RPC Proxy to production
- [ ] Deploy updated dApp
- [ ] Monitor connection success rates
- [ ] Verify no ConnectKit/wagmi imports remain in bundle

## Next Steps

- See [Cinacoin Quick Start](/guide/quick-start) for a full walkthrough
- See [React API Reference](/api/react) for detailed hook documentation
- See [SIWE Auth Example](/examples/siwe-auth) for authentication setup
- See [Migrate from Reown](/guide/migrate-from-reown) for full infrastructure details
