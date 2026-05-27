# Migration Guide: Reown/WalletConnect → Cinacoin

> Complete guide for migrating from Reown (WalletConnect) ecosystem to Cinacoin.

## Overview

Cinacoin is a fully self-hosted alternative to the Reown/WalletConnect stack. This guide covers:

- **WalletConnect v2** → **Cinacoin Relay**
- **Web3Modal** → **Cinacoin UI Components**
- **AppKit SDK** → **Cinacoin SDK**
- Infrastructure migration
- Automated CLI migration tool

## Why Migrate?

| Factor | Reown/WalletConnect | Cinacoin |
|--------|-------------------|-----------|
| Monthly cost | $500–$5,000+ | $0 (self-hosted infrastructure costs only) |
| MAU limit | 500 (free), unlimited (paid) | Unlimited |
| Brand control | Reown branding required | Fully white-label |
| Data privacy | Reown sees connection data | All data stays on your infrastructure |
| Reliability | Single point of failure | Multi-region, self-managed |
| Customization | Limited | Full source access |

---

## 1. WalletConnect v2 → Cinacoin Relay

### Before (WalletConnect v2)

```typescript
import { WalletConnectProvider } from '@walletconnect/ethereum-provider'

const provider = await WalletConnectProvider.init({
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [1],
  showQrModal: true,
  methods: ['eth_sendTransaction', 'personal_sign'],
  events: ['chainChanged', 'accountsChanged'],
})

await provider.enable()
```

### After (Cinacoin)

```typescript
import { Cinacoin } from '@cinacoin/core'
import { RelayTransport } from '@cinacoin/transport-relay'

const cinacoin = new Cinacoin({
  projectId: 'your-cinacoin-project-id',
  relayUrl: 'wss://relay.yourdomain.com/v1',
  chains: [mainnet, polygon],
})

// Connect via injected wallet
const connectors = cinacoin.getConnectors()
const result = await cinacoin.connect(connectors[0])

// Or via QR code (equivalent to WalletConnect)
const qrTransport = new QRCodeTransport({
  relayUrl: 'wss://relay.yourdomain.com/v1',
})
const uri = await qrTransport.getUri()
// Display URI as QR code
```

### Key Differences

| Feature | WalletConnect | Cinacoin |
|---------|--------------|-----------|
| Project ID | Reown Dashboard | Your own config |
| Relay | Reown-hosted | Your Relay Server |
| QR Modal | Built-in `showQrModal` | Use `ConnectModal` component |
| Provider init | `WalletConnectProvider.init()` | `new Cinacoin(config)` |
| Connection | `provider.enable()` | `cinacoin.connect(connector)` |

---

## 2. Web3Modal → Cinacoin UI Components

### Before (Web3Modal / AppKit)

```typescript
import { createWeb3Modal } from '@web3modal/wagmi'
import { defaultWagmiConfig } from '@web3modal/wagmi/config'

const wagmiConfig = defaultWagmiConfig({
  chains: [mainnet, polygon],
  projectId: 'YOUR_PROJECT_ID',
  metadata: { name: 'My dApp', description: '...', url: 'https://...' },
})

createWeb3Modal({
  wagmiConfig,
  projectId: 'YOUR_PROJECT_ID',
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3B82F6',
  },
  enableAnalytics: true,
})
```

```tsx
// In your component
import { w3m-button } from '@web3modal/wagmi'

<w3m-button />
```

### After (Cinacoin React)

```typescript
import { CinacoinProvider } from '@cinacoin/react'

const config = {
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.yourdomain.com/v1',
  chains: [mainnet, polygon],
  metadata: { name: 'My dApp', description: '...', url: 'https://...' },
}

function App() {
  return (
    <CinacoinProvider config={config}>
      <YourApp />
    </CinacoinProvider>
  )
}
```

```tsx
// In your component
import { ConnectButton, ConnectModal } from '@cinacoin/react'

// Option 1: Simple connect button (equivalent to w3m-button)
<ConnectButton
  label="连接钱包"
  variant="primary"
  size="md"
  showBalance={true}
  showAvatar={true}
  showNetwork={true}
/>

// Option 2: Custom modal
<ConnectModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  views={['wallets', 'social', 'scan']}
  recommendedWallets={['metamask', 'rabby']}
  theme={{ mode: 'dark', primaryColor: '#3B82F6' }}
/>
```

### Component Mapping

| Web3Modal Component | Cinacoin Equivalent |
|--------------------|---------------------|
| `<w3m-button />` | `<ConnectButton />` |
| `<w3m-network-button />` | `<ChainSwitcher />` |
| `<w3m-account-button />` | `<ConnectButton />` (connected state) |
| Modal (auto) | `<ConnectModal />` |
| `w3m-router` | `<AccountModal />` |
| `themeMode` / `themeVariables` | `theme` prop on components |
| `enableAnalytics` | Built-in telemetry (configurable) |

---

## 3. AppKit SDK → Cinacoin SDK

### Before (AppKit)

```typescript
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

function Component() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { provider } = useAppKitProvider('eip155')

  return (
    <button onClick={() => open()}>
      {isConnected ? address : 'Connect Wallet'}
    </button>
  )
}
```

### After (Cinacoin React)

```typescript
import { useCinacoin, ConnectButton } from '@cinacoin/react'

function Component() {
  const {
    account,        // equivalent to address
    chainId,
    status,         // 'disconnected' | 'connecting' | 'connected' | 'error'
    connectors,
    connect,
    disconnect,
    switchChain,
    signMessage,
    balance,
    ensName,
    ensAvatar,
  } = useCinacoin()

  const isConnected = status === 'connected'

  return (
    <button onClick={() => connect(connectors[0])}>
      {isConnected ? account : 'Connect Wallet'}
    </button>
  )
}
```

### Hook Mapping

| AppKit Hook | Cinacoin Hook |
|------------|----------------|
| `useAppKit()` | Use `ConnectButton` or `ConnectModal` directly |
| `useAppKitAccount()` | `useCinacoin()` → `account`, `status`, `balance` |
| `useAppKitProvider('eip155')` | `useCinacoin()` → `connectors`, `connect()` |
| `useAppKitState()` | `useCinacoin()` → `status`, `chainId` |
| `useDisconnect()` | `useCinacoin()` → `disconnect()` |
| `useSwitchChain()` | `useCinacoin()` → `switchChain()` |
| `useWalletInfo()` | `useCinacoin()` → `connectors` |

---

## 4. Infrastructure Migration

### Relay Server

| Component | WalletConnect | Cinacoin |
|-----------|--------------|-----------|
| Relay | Reown Cloud | Your Rust Relay Server |
| Protocol | WAMP over WebSocket | Custom protocol over WebSocket |
| Hosting | Reown | Your servers (K8s) |

Deploy your own Relay:

```bash
cd packages/relay-server
cargo build --release
./target/release/relay-server --config relay-config.yaml
```

### RPC Proxy

| Component | WalletConnect | Cinacoin |
|-----------|--------------|-----------|
| RPC | Reown RPC | Your Go/Rust RPC Proxy |
| Multi-Provider | No | Yes (intelligent routing) |
| Caching | No | Yes (Redis-backed) |

Deploy your RPC Proxy:

```bash
cd packages/rpc-proxy
cargo build --release
./target/release/rpc-proxy --config rpc-config.yaml
```

### Helm Deployment

```bash
# Deploy full Cinacoin infrastructure
helm install cinacoin ./deploy/helm/cinacoin \
  --namespace cinacoin \
  --create-namespace \
  --values ./deploy/helm/cinacoin/values.yaml
```

---

## 5. Breaking Changes

### API Changes

| WalletConnect/AppKit | Cinacoin | Notes |
|---------------------|-----------|-------|
| `projectId` from Reown Dashboard | Self-configured | Your own project ID |
| `WalletConnectProvider.init()` | `new Cinacoin(config)` | Constructor pattern |
| `web3Modal.open()` | `ConnectModal` component / `connect()` | Component-based |
| `provider.request({ method: '...' })` | `cinacoin.signMessage()`, `signTransaction()` | Typed methods |
| `eth_chainId` events | `chainChanged` event | Event naming |
| `accountsChanged` callback | `accountChanged` event | Event naming |
| `pairing` concept | Direct connection | No pairing layer |
| `session` object | `SessionState` | Simplified state model |

### Behavioral Changes

1. **No pairing layer** — Cinacoin connects directly without the WalletConnect pairing concept
2. **Self-hosted relay** — You control the relay infrastructure
3. **No cloud dependency** — Everything runs on your servers
4. **Custom event system** — Different event names but equivalent functionality
5. **No Reown analytics** — Built-in analytics are optional and self-hosted

---

## 6. Automated Migration CLI

Cinacoin provides a CLI tool to automate parts of the migration.

### Install

```bash
npm install -g @cinacoin/cli
# or
npx @cinacoin/cli
```

### Migrate

```bash
# Scan and migrate a project directory
cinacoin migrate ./my-dapp-project

# Options:
cinacoin migrate ./my-dapp-project \
  --framework react \
  --relay-url wss://relay.yourdomain.com/v1 \
  --output-dir ./migrated \
  --dry-run
```

### What the CLI does:

1. **Scan** — Finds `@walletconnect`, `@web3modal`, `@reown/appkit` imports
2. **Transform** — Replaces imports with Cinacoin equivalents
3. **Generate** — Creates new component wrappers
4. **Report** — Shows a diff of all changes

### Example Migration Report

```
Migration Report
================

Files scanned: 47
Files modified: 12
Files unchanged: 35

Changes:
  ✅ @walletconnect/ethereum-provider → @cinacoin/core (3 files)
  ✅ @web3modal/wagmi → @cinacoin/react (5 files)
  ✅ @reown/appkit/react → @cinacoin/react (4 files)
  ⚠️  Manual review needed: custom provider logic (2 files)
  ⚠️  Manual review needed: session event handlers (1 file)

Next steps:
  1. Review changed files
  2. Update relay URL in configuration
  3. Test connection flow
  4. Deploy and verify
```

---

## 7. Migration Checklist

### Pre-Migration

- [ ] Set up Cinacoin Relay Server
- [ ] Set up Cinacoin RPC Proxy
- [ ] Deploy to staging environment
- [ ] Configure chains and wallet registry
- [ ] Set up monitoring and alerting

### Code Migration

- [ ] Replace `@walletconnect` imports with `@cinacoin/core`
- [ ] Replace `@web3modal` / `@reown/appkit` with `@cinacoin/react`
- [ ] Update connection flow logic
- [ ] Update event handlers
- [ ] Update theme/styling configuration
- [ ] Test all wallet connection scenarios

### Testing

- [ ] Test wallet connections (MetaMask, Rabby, WalletConnect, etc.)
- [ ] Test chain switching
- [ ] Test message signing
- [ ] Test transaction sending
- [ ] Test QR code scanning (mobile)
- [ ] Test deep linking (mobile)
- [ ] Test session persistence
- [ ] Test error handling

### Deployment

- [ ] Deploy Relay and RPC Proxy to production
- [ ] Update dApp configuration
- [ ] Deploy updated dApp
- [ ] Monitor connection success rates
- [ ] Verify no WalletConnect dependencies remain
- [ ] Cancel Reown subscription

---

## 8. Rollback Plan

If issues arise during migration:

1. **Keep WalletConnect dependencies** — Install Cinacoin alongside (not replacing)
2. **Feature flag** — Use a feature flag to switch between providers
3. **Gradual rollout** — Migrate a percentage of users first

```typescript
// Feature flag approach
const useCinacoin = process.env.USE_ONCHAINUX === 'true'

function ConnectButton() {
  if (useCinacoin) {
    return <CinacoinConnectButton />
  }
  return <Web3ModalButton />
}
```
