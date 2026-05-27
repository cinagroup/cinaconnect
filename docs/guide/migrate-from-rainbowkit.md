# Migration Guide: RainbowKit → Cinacoin

> Complete guide for migrating from RainbowKit + wagmi to Cinacoin.

## Overview

RainbowKit is a popular React wallet connector that sits on top of wagmi. Cinacoin provides equivalent and expanded functionality — wallet connection UI, multi-chain support, SIWE auth, and self-hosted infrastructure — without any third-party branding or cloud dependency.

## Architecture Comparison

| Layer | RainbowKit Stack | Cinacoin |
|-------|-----------------|-------------|
| UI Components | `@rainbow-me/rainbowkit` | `@cinacoin/react` (ConnectButton, ConnectModal, ChainSwitcher) |
| Hooks & Logic | `wagmi` | `@cinacoin/react` (useCinacoin, useAccount, useConnect) |
| Transport | WalletConnect Cloud | Self-hosted Cinacoin Relay |
| RPC | Alchemy/Infura/etc. | Self-hosted RPC Proxy with intelligent routing |
| Chain Config | `wagmi` chains | `@cinacoin/core-sdk` ChainConfig |
| SIWE Auth | `siwe` + custom | `@cinacoin/siwe` built-in |
| Multi-chain | Via wagmi | Native multi-chain adapters |

## Step-by-Step Migration

### 1. Remove RainbowKit + wagmi

```bash
npm uninstall @rainbow-me/rainbowkit wagmi viem @wagmi/connectors
```

### 2. Install Cinacoin

```bash
npm install @cinacoin/core @cinacoin/react @cinacoin/core-sdk
```

### 3. Replace Provider Setup

#### Before (RainbowKit + wagmi)

```tsx
// App.tsx
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: 'My dApp',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [mainnet, polygon, arbitrum],
})

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <YourApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

#### After (Cinacoin)

```tsx
// App.tsx
import { CinacoinProvider } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

function App() {
  return (
    <CinacoinProvider
      projectId="your-cinacoin-project-id"
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
        { id: 'eip155:137', name: 'Polygon', rpcUrl: 'https://rpc.yourdomain.com/polygon' },
        { id: 'eip155:42161', name: 'Arbitrum', rpcUrl: 'https://rpc.yourdomain.com/arbitrum' },
      ]}
      adapters={[new EvmAdapter()]}
      themeMode="dark"
      metadata={{
        name: 'My dApp',
        description: 'My awesome dApp',
        url: 'https://mydapp.com',
        icons: ['https://mydapp.com/icon.png'],
      }}
    >
      <YourApp />
    </CinacoinProvider>
  )
}
```

### 4. Replace Connect Button

#### Before (RainbowKit)

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit'

function Header() {
  return <ConnectButton />
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

### 5. Replace wagmi Hooks

#### API Mapping Table

| wagmi Hook | Cinacoin Hook | Notes |
|------------|-----------------|-------|
| `useAccount()` | `useAccount()` | Same name, equivalent return shape |
| `useConnect()` | `useConnect()` | Same name, walletId-based API |
| `useDisconnect()` | `useDisconnect()` | Same name |
| `useSwitchChain()` | `useCinacoin()` → `switchChain` | Integrated into main context |
| `useBalance()` | `useAccount()` → `account.balance` | Balance is part of account state |
| `useNetwork()` | `useChainId()` / `useCinacoin()` | Chain info from context |
| `usePublicClient()` | Use RPC Proxy directly | Cinacoin RPC Proxy handles this |
| `useWalletClient()` | `useCinacoin()` → `connect()` | Connector access |
| `useEnsName()` | `useCinacoin()` → `ensName` | ENS resolution built-in |
| `useEnsAvatar()` | `useCinacoin()` → `ensAvatar` | ENS avatar built-in |
| `useSignMessage()` | `useCinacoin()` → `signMessage()` | Typed method |
| `useSendTransaction()` | `useCinacoin()` → `signTransaction()` | Typed method |
| `useContractRead()` | Use RPC Proxy + ethers/viem directly | Cinacoin handles transport |
| `useContractWrite()` | Use RPC Proxy + ethers/viem directly | Cinacoin handles transport |

#### Before (wagmi)

```tsx
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useBalance, useEnsName, useSignMessage } from 'wagmi'
import { injected } from 'wagmi/connectors'

function WalletPanel() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { data: balance } = useBalance({ address })
  const { data: ensName } = useEnsName({ address })

  return (
    <div>
      {isConnected ? (
        <>
          <p>Address: {address}</p>
          <p>ENS: {ensName || '—'}</p>
          <p>Balance: {balance?.formatted} {balance?.symbol}</p>
          <p>Chain: {chain?.name}</p>
          <button onClick={() => switchChain({ chainId: 1 })}>
            Switch to Ethereum
          </button>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      ) : (
        <button onClick={() => connect({ connector: connectors[0] })}>
          Connect
        </button>
      )}
    </div>
  )
}
```

#### After (Cinacoin)

```tsx
import { useAccount, useConnect, useDisconnect, useCinacoin } from '@cinacoin/react'

function WalletPanel() {
  const account = useAccount()
  const { connect, status } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, ensName, ensAvatar, signMessage } = useCinacoin()

  const isConnected = account !== null

  return (
    <div>
      {isConnected ? (
        <>
          <p>Address: {account.address}</p>
          <p>ENS: {ensName || '—'}</p>
          <p>Balance: {account.balance} {account.chainSymbol}</p>
          <p>Chain ID: {account.chainId}</p>
          <button onClick={() => switchChain('eip155:1')}>
            Switch to Ethereum
          </button>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      ) : (
        <button onClick={() => connect('metamask')}>
          Connect
        </button>
      )}
    </div>
  )
}
```

## Breaking Changes

### 1. Connector API Difference

RainbowKit uses wagmi's connector objects. Cinacoin uses wallet ID strings.

| RainbowKit (wagmi) | Cinacoin |
|--------------------|-------------|
| `connect({ connector: injected() })` | `connect('metamask')` |
| `connect({ connector: walletConnectConnector })` | `connect('walletconnect')` |
| `connect({ connector: coinbaseWalletConnector })` | `connect('coinbase')` |

### 2. Chain ID Format

| RainbowKit | Cinacoin |
|------------|-------------|
| `chainId: 1` (number) | `id: 'eip155:1'` (CAIP-2 string) |
| `chains: [mainnet]` from wagmi/chains | `chains: [{ id, name, rpcUrl }]` custom config |

### 3. No QueryClient Required

RainbowKit requires `@tanstack/react-query`. Cinacoin does not — it uses its own state management.

### 4. No wagmi/viem Dependency

Cinacoin is self-contained. You can still use viem or ethers.js for contract interactions on top of Cinacoin's transport layer.

### 5. Custom Connectors

| RainbowKit | Cinacoin |
|------------|-------------|
| Custom wagmi connector | Custom adapter via `ChainAdapter` interface |
| `createConnector()` | Implement `ChainAdapter` from `@cinacoin/core-sdk` |

## Migration Examples

### Example 1: Simple dApp

#### Before

```tsx
import { getDefaultConfig, RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit'
import { WagmiProvider, useAccount } from 'wagmi'
import { mainnet, polygon } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: 'Simple dApp',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [mainnet, polygon],
})

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div>
            <ConnectButton />
            <Content />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function Content() {
  const { address, isConnected } = useAccount()
  return isConnected ? <p>Connected: {address}</p> : <p>Not connected</p>
}
```

#### After

```tsx
import { CinacoinProvider, ConnectButton, useAccount } from '@cinacoin/react'
import { EvmAdapter } from '@cinacoin/core-sdk'

export default function App() {
  return (
    <CinacoinProvider
      projectId={process.env.NEXT_PUBLIC_CINACOIN_PROJECT_ID!}
      chains={[
        { id: 'eip155:1', name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
        { id: 'eip155:137', name: 'Polygon', rpcUrl: 'https://rpc.yourdomain.com/polygon' },
      ]}
      adapters={[new EvmAdapter()]}
    >
      <div>
        <ConnectButton />
        <Content />
      </div>
    </CinacoinProvider>
  )
}

function Content() {
  const account = useAccount()
  return account ? <p>Connected: {account.address}</p> : <p>Not connected</p>
}
```

### Example 2: Custom Connect Modal

#### Before (RainbowKit)

```tsx
import { useConnectModal } from '@rainbow-me/rainbowkit'

function CustomTrigger() {
  const { openConnectModal } = useConnectModal()

  return (
    <button
      onClick={openConnectModal}
      style={{
        background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      🔗 Connect Wallet
    </button>
  )
}
```

#### After (Cinacoin)

```tsx
import { ConnectModal } from '@cinacoin/react'
import { useState } from 'react'

function CustomTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        🔗 Connect Wallet
      </button>
      <ConnectModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Connect your wallet"
      />
    </>
  )
}
```

### Example 3: Multi-Chain dApp

#### Before (RainbowKit + wagmi)

```tsx
import { useAccount, useSwitchChain } from 'wagmi'
import { useChainModal } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'

function ChainManager() {
  const { chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const { openChainModal } = useChainModal()

  return (
    <div>
      <p>Current: {chain?.name}</p>
      <button onClick={openChainModal}>Change Network</button>
      <div>
        <button onClick={() => switchChain({ chainId: mainnet.id })}>Ethereum</button>
        <button onClick={() => switchChain({ chainId: polygon.id })}>Polygon</button>
        <button onClick={() => switchChain({ chainId: arbitrum.id })}>Arbitrum</button>
      </div>
    </div>
  )
}
```

#### After (Cinacoin)

```tsx
import { useCinacoin, ChainSwitcher } from '@cinacoin/react'

function ChainManager() {
  const { chainId, switchChain } = useCinacoin()

  return (
    <div>
      <p>Current Chain ID: {chainId}</p>
      <ChainSwitcher showIcon={true} />
      <div>
        <button onClick={() => switchChain('eip155:1')}>Ethereum</button>
        <button onClick={() => switchChain('eip155:137')}>Polygon</button>
        <button onClick={() => switchChain('eip155:42161')}>Arbitrum</button>
      </div>
    </div>
  )
}
```

## Infrastructure Migration

### Relay & RPC

If you were using WalletConnect Cloud relay with RainbowKit:

| Component | RainbowKit | Cinacoin |
|-----------|-----------|-------------|
| WalletConnect Relay | `projectId` → Reown Cloud | Your Relay Server (`wss://relay.yourdomain.com/v1`) |
| RPC Provider | Alchemy/Infura configured in wagmi | Cinacoin RPC Proxy with intelligent routing |

Deploy self-hosted infrastructure:

```bash
# Relay Server (Rust)
cd packages/relay-server
cargo build --release
./target/release/relay-server --config relay-config.yaml

# RPC Proxy (Go/Rust)
cd packages/rpc-proxy
cargo build --release
./target/release/rpc-proxy --config rpc-config.yaml

# Or use Helm for full deployment
helm install cinacoin ./deploy/helm/cinacoin \
  --namespace cinacoin \
  --create-namespace
```

## Automated Migration

Use the Cinacoin codemod to automate the bulk of the migration:

```bash
# Install codemod
npm install -D @cinacoin/codemod

# Run RainbowKit → Cinacoin transform
npx cinacoin-codemod --src-dir ./src --transform rainbowkit-to-cinacoin

# Dry run to preview changes
npx cinacoin-codemod --src-dir ./src --transform rainbowkit-to-cinacoin --dry-run --verbose
```

## Migration Checklist

### Pre-Migration

- [ ] Set up Cinacoin Relay Server
- [ ] Set up Cinacoin RPC Proxy
- [ ] Deploy to staging environment
- [ ] Configure supported chains

### Code Migration

- [ ] Remove `@rainbow-me/rainbowkit`, `wagmi`, `viem`, `@tanstack/react-query`
- [ ] Install `@cinacoin/core`, `@cinacoin/react`, `@cinacoin/core-sdk`
- [ ] Replace `RainbowKitProvider` + `WagmiProvider` with `CinacoinProvider`
- [ ] Replace `ConnectButton` from RainbowKit with Cinacoin `ConnectButton`
- [ ] Replace wagmi hooks with Cinacoin hooks
- [ ] Update chain configuration format (number → CAIP-2)
- [ ] Update connector API (connector objects → wallet ID strings)
- [ ] Test all wallet connection flows

### Testing

- [ ] Test MetaMask, WalletConnect QR, Coinbase Wallet connections
- [ ] Test chain switching
- [ ] Test disconnect / reconnect
- [ ] Test on mobile browsers
- [ ] Test deep linking (if applicable)
- [ ] Verify no wagmi/rainbowkit imports remain

### Deployment

- [ ] Deploy Relay and RPC Proxy to production
- [ ] Deploy updated dApp
- [ ] Monitor connection success rates
- [ ] Verify no RainbowKit/wagmi dependencies in bundle

## Next Steps

- See [Cinacoin Quick Start](/guide/quick-start) for a full walkthrough
- See [React API Reference](/api/react) for detailed hook documentation
- See [Multi-Chain Example](/examples/multi-chain) for advanced multi-chain setups
- See [Migrate from Reown](/guide/migrate-from-reown) for full infrastructure migration details
