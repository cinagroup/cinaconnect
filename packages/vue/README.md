# @cinaconnect/vue

Vue 3 support for CinaConnect wallet connection.

## Installation

```bash
npm install @cinaconnect/vue
```

## Usage

```vue
<script setup>
import { createCinaConnect, useCinaConnect } from '@cinaconnect/vue';

const cinaConnect = createCinaConnect({ projectId: 'YOUR_PROJECT_ID' });
const { address, isConnected } = useCinaConnect();
</script>

<template>
  <cina-connect-button />
  <p v-if="isConnected">Connected: {{ address }}</p>
</template>
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createCinaConnect` | function | Create CinaConnect instance |
| `useCinaConnect` | composable | Main wallet composable |
| `ConnectButton` | component | Connect wallet button |
| `AccountButton` | component | Account display button |
| `NetworkButton` | component | Network switcher button |
| `CinaConnectOptions` | type | Options type |
