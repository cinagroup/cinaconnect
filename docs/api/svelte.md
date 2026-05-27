# Svelte SDK API

> `@cinacoin/svelte` — Svelte/SvelteKit 钱包连接集成。

## Installation

```bash
npm install @cinacoin/svelte
```

## Setup

```typescript
// src/app.ts (Svelte)
import { createCinacoin } from '@cinacoin/svelte'

const cinacoin = createCinacoin({
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.yourdomain.com/v1',
  chains: [
    { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrl: 'https://eth.llamarpc.com' },
  ],
})
```

### SvelteKit

```typescript
// src/hooks.server.ts
import { cinaConnectConnect, cinaConnectNetwork } from '@cinacoin/svelte/kit'
```

## Stores

所有状态通过 Svelte stores 暴露：

```svelte
<script>
  import { isConnected, address, balance, chainId, status, error, chains } from '@cinacoin/svelte'
</script>

{#if $isConnected}
  <p>Connected: {$address} on chain {$chainId}</p>
  <p>Balance: {$balance}</p>
{:else}
  <button on:click={connect}>Connect Wallet</button>
{/if}
```

| Store | Type | Description |
|-------|------|-------------|
| `isConnected` | `Readable<boolean>` | 是否已连接 |
| `address` | `Readable<string \| null>` | 当前地址 |
| `balance` | `Readable<string>` | 账户余额 |
| `chainId` | `Readable<number>` | 当前链 ID |
| `status` | `Readable<ConnectionStatus>` | 连接状态 |
| `error` | `Readable<Error \| null>` | 错误信息 |
| `isConnecting` | `Readable<boolean>` | 是否正在连接 |
| `hasError` | `Readable<boolean>` | 是否有错误 |
| `chains` | `Readable<Chain[]>` | 可用链列表 |

## Actions

### cinaConnectConnect

```typescript
import { cinaConnectConnect } from '@cinacoin/svelte'

cinaConnectConnect({ connectorId: 'injected' })
```

### cinaConnectNetwork

```typescript
import { cinaConnectNetwork } from '@cinacoin/svelte'

cinaConnectNetwork({ chainId: 1 })
```

## Utility Functions

```typescript
import { initCinacoin, resetCinacoin, getConnector, open, close, switchChain } from '@cinacoin/svelte'

// Initialize
initCinacoin(config)

// Reset
resetCinacoin()

// Get connector
const connector = getConnector('injected')

// Open/close modal
open()
close()

// Switch chain
switchChain(137)
```

## Components

```svelte
<script>
  import { CinacoinButton, CinacoinAccountButton, CinacoinNetworkButton } from '@cinacoin/svelte'
</script>

<CinacoinButton />
<CinacoinAccountButton />
<CinacoinNetworkButton />
```

## Error Handling

检查 `error` 和 `hasError` stores：

```svelte
<script>
  import { error, hasError } from '@cinacoin/svelte'
</script>

{#if $hasError}
  <p class="error">{$error?.message}</p>
{/if}
```

## See Also

- [Core SDK](./core-sdk.md)
- [Vue SDK](./vue.md)
- [React SDK](./react.md)
