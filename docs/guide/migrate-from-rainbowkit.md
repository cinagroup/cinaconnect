# Migration Guide: RainbowKit → CinaConnect

> Complete guide for migrating from RainbowKit + wagmi to CinaConnect.

## Overview

RainbowKit is a popular React wallet connector that sits on top of wagmi. CinaConnect provides equivalent and expanded functionality — wallet connection UI, multi-chain support, SIWE auth, and self-hosted infrastructure — without any third-party branding or cloud dependency.

## Architecture Comparison

| Layer | RainbowKit Stack | CinaConnect |
|-------|-----------------|-------------|
| UI Components | `@rainbow-me/rainbowkit` | `@cinaconnect/react` (ConnectButton, ConnectModal, ChainSwitcher) |
| Hooks & Logic | `wagmi` | `@cinaconnect/react` (useCinaConnect, useAccount, useConnect) |
| Transport | WalletConnect Cloud | Self-hosted CinaConnect Relay |
| RPC | Alchemy/Infura/etc. | Self-hosted RPC Proxy with intelligent routing |
| Chain Config | `wagmi` chains | `@cinaconnect/core-sdk` ChainConfig |
| SIWE Auth | `siwe` + custom | `@cinaconnect/siwe` built-in |
| Multi-chain | Via wagmi | Native multi-chain adapters |

## Step-by-Step Migration

### 1. Remove RainbowKit + wagmi

```bash
npm uninstall @rainbow-me/rainbowkit wagmi viem @wagmi/connectors
```

### 2. Install CinaConnect

```bash
npm install @cinaconnect/core @cinaconnect/react @cinaconnect/core-sdk
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

#### After (CinaConnect)

```tsx
// App.tsx
import { CinaConnectProvider } from '@cinaconnect/react'
import { EvmAdapter } from '@cinaconnect/core-sdk'

function App() {
  return (
    <CinaConnectProvider
      projectId="your-cinaconnect-project-id"
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
    </CinaConnectProvider>
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

#### After (CinaConnect)

```tsx
import { ConnectButton } from '@cinaconnect/react'

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

| wagmi Hook | CinaConnect Hook | Notes |
|------------|-----------------|-------|
| `useAccount()` | `useAccount()` | Same name, equivalent return shape |
| `useConnect()` | `useConnect()` | Same name, walletId-based API |
| `useDisconnect()` | `useDisconnect()` | Same name |
| `useSwitchChain()` | `useCinaConnect()` → `switchChain` | Integrated into main context |
| `useBalance()` | `useAccount()` → `account.balance` | Balance is part of account state |
| `useNetwork()` | `useChainId()` / `useCinaConnect()` | Chain info from context |
| `usePublicClient()` | Use RPC Proxy directly | CinaConnect RPC Proxy handles this |
| `useWalletClient()` | `useCinaConnect()` → `connect()` | Connector access |
| `useEnsName()` | `useCinaConnect()` → `ensName` | ENS resolution built-in |
| `useEnsAvatar()` | `useCinaConnect()` → `ensAvatar` | ENS avatar built-in |
| `useSignMessage()` | `useCinaConnect()` → `signMessage()` | Typed method |
| `useSendTransaction()` | `useCinaConnect()` → `signTransaction()` | Typed method |
| `useContractRead()` | Use RPC Proxy + ethers/viem directly | CinaConnect handles transport |
| `useContractWrite()` | Use RPC Proxy + ethers/viem directly | CinaConnect handles transport |

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

#### After (CinaConnect)

```tsx
import { useAccount, useConnect, useDisconnect, useCinaConnect } from '@cinaconnect/react'

function WalletPanel() {
  const account = useAccount()
  const { connect, status } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, ensName, ensAvatar, signMessage } = useCinaConnect()

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

RainbowKit uses wagmi's connector objects. CinaConnect uses wallet ID strings.

| RainbowKit (wagmi) | CinaConnect |
|--------------------|-------------|
| `connect({ connector: injected() })` | `connect('metamask')` |
| `connect({ connector: walletConnectConnector })` | `connect('walletconnect')` |
| `connect({ connector: coinbaseWalletConnector })` | `connect('coinbase')` |

### 2. Chain ID Format

| RainbowKit | CinaConnect |
|------------|-------------|
| `chainId: 1` (number) | `id: 'eip155:1'` (CAIP-2 string) |
| `chains: [mainnet]` from wagmi/chains | `chains: [{ id, name, rpcUrl }]` custom config |

### 3. No QueryClient Required

RainbowKit requires `@tanstack/react-query`. CinaConnect does not — it uses its own state management.

### 4. No wagmi/viem Dependency

CinaConnect is self-contained. You can still use viem or ethers.js for contract interactions on top of CinaConnect's transport layer.

### 5. Custom Connectors

| RainbowKit | CinaConnect |
|------------|-------------|
| Custom wagmi connector | Custom adapter via `ChainAdapter` interface |
| `createConnector()` | Implement `ChainAdapter` from `@cinaconnect/core-sdk` |

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
import { CinaConnectProvider, ConnectButton, useAccount } from '@cinaconnect/react'
import { EvmAdapter } from '@cinaconnect/core-sdk'

export default function App() {
  return (
    <CinaConnectProvider
      projectId={process.env.NEXT_PUBLIC_CINACONNECT_PROJECT_ID!}
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
    </CinaConnectProvider>
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

#### After (CinaConnect)

```tsx
import { ConnectModal } from '@cinaconnect/react'
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

#### After (CinaConnect)

```tsx
import { useCinaConnect, ChainSwitcher } from '@cinaconnect/react'

function ChainManager() {
  const { chainId, switchChain } = useCinaConnect()

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

| Component | RainbowKit | CinaConnect |
|-----------|-----------|-------------|
| WalletConnect Relay | `projectId` → Reown Cloud | Your Relay Server (`wss://relay.yourdomain.com/v1`) |
| RPC Provider | Alchemy/Infura configured in wagmi | CinaConnect RPC Proxy with intelligent routing |

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
helm install cinaconnect ./deploy/helm/cinaconnect \
  --namespace cinaconnect \
  --create-namespace
```

## Automated Migration

Use the CinaConnect codemod to automate the bulk of the migration:

```bash
# Install codemod
npm install -D @cinaconnect/codemod

# Run RainbowKit → CinaConnect transform
npx cinaconnect-codemod --src-dir ./src --transform rainbowkit-to-cinaconnect

# Dry run to preview changes
npx cinaconnect-codemod --src-dir ./src --transform rainbowkit-to-cinaconnect --dry-run --verbose
```

## Migration Checklist

### Pre-Migration

- [ ] Set up CinaConnect Relay Server
- [ ] Set up CinaConnect RPC Proxy
- [ ] Deploy to staging environment
- [ ] Configure supported chains

### Code Migration

- [ ] Remove `@rainbow-me/rainbowkit`, `wagmi`, `viem`, `@tanstack/react-query`
- [ ] Install `@cinaconnect/core`, `@cinaconnect/react`, `@cinaconnect/core-sdk`
- [ ] Replace `RainbowKitProvider` + `WagmiProvider` with `CinaConnectProvider`
- [ ] Replace `ConnectButton` from RainbowKit with CinaConnect `ConnectButton`
- [ ] Replace wagmi hooks with CinaConnect hooks
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

- See [CinaConnect Quick Start](/guide/quick-start) for a full walkthrough
- See [React API Reference](/api/react) for detailed hook documentation
- See [Multi-Chain Example](/examples/multi-chain) for advanced multi-chain setups
- See [Migrate from Reown](/guide/migrate-from-reown) for full infrastructure migration details
