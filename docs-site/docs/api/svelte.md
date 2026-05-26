# Svelte

> `@cinaconnect/svelte` — Svelte adapter for CinaConnect.

## Installation

```bash
npm install @cinaconnect/svelte @cinaconnect/core-sdk
```

## Usage

```svelte
<script>
import { useCinaConnect } from '@cinaconnect/svelte'

const { connect, account } = useCinaConnect()
</script>

<button on:click={connect}>Connect</button>
<p>Account: {$account}</p>
```

## Related

- [React](/api/react) — React adapter
- [Vue](/api/vue) — Vue adapter
