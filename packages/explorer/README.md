# @cinacoin/explorer

Explorer API — wallet/dApp discovery, logo fetching, registry.

## Installation

```bash
npm install @cinacoin/explorer
```

## Usage

```ts
import { WalletRegistry, fetchWalletLogo } from '@cinacoin/explorer';

const wallets = await WalletRegistry.search('meta');
const logoUrl = await fetchWalletLogo(wallet.rdns);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `WalletRegistry` | class | Wallet registry with search |
| `fetchWalletLogo` | function | Fetch wallet logo URL |
| `fetchChainLogo` | function | Fetch chain logo URL |
| `logoCache` | object | Logo cache |
| `useExplorer` | hook | React hook for explorer |
| `WalletSearch` | component | Wallet search UI component |
| `WalletInfo` | type | Wallet metadata type |
| `ChainInfo` | type | Chain metadata type |
| `SearchFilter` | type | Search filter type |
