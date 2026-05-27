# Vue 3 SDK API

> `@cinacoin/vue` — Vue 3 集成包，提供 composables、组件和 Provider。

## Installation

```bash
npm install @cinacoin/vue
```

## Setup

### Option 1: CinacoinProvider (Recommended)

在应用根组件包裹 `CinacoinProvider`：

```vue
<script setup>
import { CinacoinProvider } from '@cinacoin/vue'
</script>

<template>
  <CinacoinProvider
    :config="{
      projectId: 'your-project-id',
      relayUrl: 'wss://relay.yourdomain.com/v1',
      chains: [
        { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrl: 'https://eth.llamarpc.com' },
      ],
      metadata: { name: 'My Vue dApp', description: 'Vue 3 dApp with Cinacoin', url: window.location.origin, icons: [] },
    }"
  >
    <RouterView />
  </CinacoinProvider>
</template>
```

### Option 2: ONCHAINUX_KEY with provide/inject

```vue
<script setup>
import { ONCHAINUX_KEY } from '@cinacoin/vue'
import { provide } from 'vue'

const config = { projectId: 'your-project-id', relayUrl: 'wss://relay.yourdomain.com/v1', chains: [] }
provide(ONCHAINUX_KEY, config)
</script>
```

## Components

### OcxConnectButton

连接钱包按钮组件。

```vue
<template>
  <OcxConnectButton label="Connect Wallet" />
</template>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `'Connect'` | 按钮文字 |

### OcxConnectModal

连接钱包弹窗组件。

```vue
<template>
  <OcxConnectModal v-model:open="modalOpen" />
</template>
```

### OcxChainSwitcher

链切换组件。

```vue
<template>
  <OcxChainSwitcher />
</template>
```

## Composables

### useCinacoin

核心 composable，提供连接状态和操作方法。

```vue
<script setup>
import { useCinacoin } from '@cinacoin/vue'

const { account, chainId, connectors, connect, disconnect } = useCinacoin()
</script>
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `account` | `Ref<AccountState>` | 当前账户状态 |
| `chainId` | `Ref<number>` | 当前链 ID |
| `connectors` | `Ref<Connector[]>` | 可用连接器列表 |
| `connect(connector)` | `(c: Connector) => Promise<void>` | 连接钱包 |
| `disconnect()` | `() => Promise<void>` | 断开连接 |

### useAccount

账户信息 composable。

```vue
<script setup>
import { useAccount } from '@cinacoin/vue'

const { address, balance, status, isConnected } = useAccount()
</script>
```

### useChainId

链 ID composable。

```vue
<script setup>
import { useChainId } from '@cinacoin/vue'

const { chainId, switchChain } = useChainId()
</script>
```

### useConnect

连接操作 composable。

```vue
<script setup>
import { useConnect } from '@cinacoin/vue'

const { connect, disconnect, isConnecting } = useConnect()
</script>
```

### useDisconnect

断开连接 composable。

```vue
<script setup>
import { useDisconnect } from '@cinacoin/vue'

const { disconnect } = useDisconnect()
</script>
```

### useWalletCapabilities

钱包能力查询 composable (EIP-5792)。

```vue
<script setup>
import { useWalletCapabilities } from '@cinacoin/vue'

const { capabilities, isSupported } = useWalletCapabilities()
</script>
```

### useSendCalls

原子批量发送 composable。

```vue
<script setup>
import { useSendCalls } from '@cinacoin/vue'

const { sendCalls, callsId, status } = useSendCalls()
</script>
```

### useAtomicBatch

原子批量交易 composable。

```vue
<script setup>
import { useAtomicBatch } from '@cinacoin/vue'

const { execute, isExecuting } = useAtomicBatch()
</script>
```

### useCallsStatus

批量交易状态查询。

```vue
<script setup>
import { useCallsStatus } from '@cinacoin/vue'

const { status, refetch } = useCallsStatus(callsId)
</script>
```

## Types

### CinacoinConfig

```typescript
interface CinacoinConfig {
  projectId: string
  relayUrl: string
  chains: ChainConfig[]
  metadata?: AppMetadata
  theme?: { mode: ThemeMode; accentColor?: string }
  debug?: boolean
}
```

### CinacoinProviderProps

```typescript
interface CinacoinProviderProps {
  config: CinacoinConfig
}
```

### AccountState

```typescript
interface AccountState {
  address: string | null
  balance: string
  isConnected: boolean
}
```

## Error Handling

所有 composables 通过 Vue 的 `ref` 和 `reactive` 管理错误状态。连接失败时 `isConnected` 为 `false`，可通过 `status` 检查详细状态。

```vue
<script setup>
import { useAccount } from '@cinacoin/vue'

const { status, error } = useAccount()

watch(error, (e) => {
  if (e) console.error('Connection error:', e.message)
})
</script>
```

## See Also

- [Core SDK](./core-sdk.md) — 核心 SDK
- [React SDK](./react.md) — React 版本
- [Next.js](./next.md) — Next.js 集成
