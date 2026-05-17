# @cinaconnect/svelte

Svelte support for CinaConnect wallet connection.

## Installation

```bash
npm install @cinaconnect/svelte
```

## Usage

```svelte
<script>
  import { CinaConnectProvider, ConnectButton, useCinaConnect } from '@cinaconnect/svelte';
  const { address, isConnected } = useCinaConnect();
</script>

<CinaConnectProvider projectId="YOUR_PROJECT_ID">
  <ConnectButton />
  {#if $isConnected}
    <p>Connected: {$address}</p>
  {/if}
</CinaConnectProvider>
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnectProvider` | component | Provider wrapper |
| `ConnectButton` | component | Connect wallet button |
| `AccountButton` | component | Account display |
| `useCinaConnect` | function | Svelte store getter |
| `cinaConnectStore` | store | Svelte writable store |
| `CinaConnectOptions` | type | Options type |
