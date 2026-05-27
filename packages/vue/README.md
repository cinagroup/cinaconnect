# @cinacoin/vue

Vue 3 support for Cinacoin wallet connection.

## Installation

```bash
npm install @cinacoin/vue
```

## Usage

```vue
<script setup>
import { createCinacoin, useCinacoin } from '@cinacoin/vue';

const cinaConnect = createCinacoin({ projectId: 'YOUR_PROJECT_ID' });
const { address, isConnected } = useCinacoin();
</script>

<template>
  <cina-connect-button />
  <p v-if="isConnected">Connected: {{ address }}</p>
</template>
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createCinacoin` | function | Create Cinacoin instance |
| `useCinacoin` | composable | Main wallet composable |
| `ConnectButton` | component | Connect wallet button |
| `AccountButton` | component | Account display button |
| `NetworkButton` | component | Network switcher button |
| `CinacoinOptions` | type | Options type |
