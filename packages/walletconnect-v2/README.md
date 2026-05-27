# @cinacoin/walletconnect-v2

WalletConnect v2 adapter for Cinacoin.

## Installation

```bash
npm install @cinacoin/walletconnect-v2
```

## Usage

```ts
import { WalletConnectAdapter } from '@cinacoin/walletconnect-v2';

const adapter = new WalletConnectAdapter({
  projectId: 'YOUR_PROJECT_ID',
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `WalletConnectAdapter` | class | WC v2 adapter |
| `WalletConnectConnector` | class | WC connector class |
| `createWCSession` | function | Create WC session |
| `WCConfig` | type | Configuration type |
| `WCSessionData` | type | Session data type |
