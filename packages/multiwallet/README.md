# @cinacoin/multiwallet

Multi-wallet linking: manage multiple wallet connections simultaneously across namespaces.

## Installation

```bash
npm install @cinacoin/multiwallet
```

## Usage

```ts
import { MultiwalletManager, MultiwalletSwitcher } from '@cinacoin/multiwallet';

const manager = new MultiwalletManager();
await manager.connect('eip155', 'metamask');
await manager.connect('solana', 'phantom');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `MultiwalletManager` | class | Manages multiple wallet connections |
| `MultiwalletStore` | class | State store for multi-wallet |
| `useMultiwallet` | hook | React hook for multi-wallet |
| `useConnectionAnalytics` | hook | Connection analytics hook |
| `MultiwalletSwitcher` | component | Wallet switcher UI |
| `ConnectionAnalyzer` | component | Connection analyzer UI |
| `ConnectionRecord` | type | Connection record type |
| `MultiwalletState` | type | State type |
