# @cinacoin/svelte

Svelte support for Cinacoin wallet connection.

## Installation

```bash
npm install @cinacoin/svelte
```

## Usage

```svelte
<script>
  import { CinacoinProvider, ConnectButton, useCinacoin } from '@cinacoin/svelte';
  const { address, isConnected } = useCinacoin();
</script>

<CinacoinProvider projectId="YOUR_PROJECT_ID">
  <ConnectButton />
  {#if $isConnected}
    <p>Connected: {$address}</p>
  {/if}
</CinacoinProvider>
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinacoinProvider` | component | Provider wrapper |
| `ConnectButton` | component | Connect wallet button |
| `AccountButton` | component | Account display |
| `useCinacoin` | function | Svelte store getter |
| `cinaConnectStore` | store | Svelte writable store |
| `CinacoinOptions` | type | Options type |
