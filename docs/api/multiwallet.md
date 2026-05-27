# Multiwallet API

> `@cinacoin/multiwallet` — 多钱包管理和连接分析。

## Installation

```bash
npm install @cinacoin/multiwallet
```

## Usage

```typescript
import { MultiwalletManager, MultiwalletStore } from '@cinacoin/multiwallet'

const store = new MultiwalletStore()
const manager = new MultiwalletManager(store)

// Connect multiple wallets
await manager.connect('metamask')
await manager.connect('walletconnect')

// Get all connections
const connections = manager.getAllConnections()

// Switch active wallet
manager.setActive('walletconnect')

// Disconnect
await manager.disconnect('metamask')
```

## React Hooks

```tsx
import { useMultiwallet, useConnectionAnalytics } from '@cinacoin/multiwallet'

// Multiwallet hook
const {
  connections,
  activeConnection,
  connect,
  disconnect,
  setActive,
} = useMultiwallet()

// Analytics hook
const {
  connectionHistory,
  walletUsageStats,
  mostUsedWallet,
} = useConnectionAnalytics()
```

## Components

```tsx
import { MultiwalletSwitcher, ConnectionAnalyzer } from '@cinacoin/multiwallet'

<MultiwalletSwitcher />
<ConnectionAnalyzer />
```

## Error Handling

```typescript
try {
  await manager.connect('metamask')
} catch (err) {
  if (err.code === 'ALREADY_CONNECTED') { /* wallet already connected */ }
  if (err.code === 'CONNECTION_FAILED') { /* user rejected or timeout */ }
}
```

## See Also

- [Core SDK](./core-sdk.md)
