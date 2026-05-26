# Vue

> `@cinaconnect/vue` — Vue 3 composition API adapter for CinaConnect.

## Installation

```bash
npm install @cinaconnect/vue @cinaconnect/core-sdk
```

## Usage

```vue
<script setup>
import { useCinaConnect } from '@cinaconnect/vue'

const { connect, disconnect, account } = useCinaConnect()
</script>

<template>
  <button @click="connect">Connect</button>
  <p>Account: {{ account }}</p>
</template>
```

## Composables

- `useCinaConnect()` — Core SDK instance
- `useAccount()` — Current account
- `useConnect()` — Connect helper
- `useDisconnect()` — Disconnect helper
- `useSwitchChain()` — Chain switching

## Related

- [React](/api/react) — React adapter
- [Svelte](/api/svelte) — Svelte adapter
