# Nuxt SDK API

> `@cinacoin/nuxt` — Nuxt 3 模块，自动导入 composables 和组件。

## Installation

```bash
npm install @cinacoin/nuxt
```

## Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@cinacoin/nuxt'],
  cinacoin: {
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.yourdomain.com/v1',
    chains: [
      { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrl: 'https://eth.llamarpc.com' },
    ],
  },
})
```

## Auto-imported Composables

Composables 自动导入，无需手动 import：

```vue
<script setup>
// 自动导入
const { address, isConnected, connect, disconnect } = useCinacoin()
const { balance } = useAccount()
const { chainId, switchChain } = useChainId()
</script>
```

## Auto-imported Components

```vue
<template>
  <ConnectButton />
  <AccountButton />
  <NetworkButton />
</template>
```

## Server-Side

Nuxt 模块支持 SSR 兼容的钱包状态管理。服务端渲染时连接状态为 `false`，客户端 hydration 后恢复。

## Error Handling

```vue
<script setup>
const { error } = useCinacoin()

watch(error, (e) => {
  if (e) console.error('Wallet error:', e.message)
})
</script>
```

## See Also

- [Vue SDK](./vue.md)
- [Core SDK](./core-sdk.md)
