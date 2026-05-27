# @cinacoin/wallet-buttons

Cinacoin Wallet Buttons — standalone connect buttons for any framework.

## Installation

```bash
npm install @cinacoin/wallet-buttons
```

## Usage

```ts
import { createConnectButton } from '@cinacoin/wallet-buttons';

const button = createConnectButton({
  projectId: 'YOUR_PROJECT_ID',
  container: '#wallet-container',
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createConnectButton` | function | Create a connect button |
| `ConnectButton` | class | Button class |
| `WalletButton` | class | Generic wallet button |
| `ButtonConfig` | type | Button configuration |
| `ButtonStyle` | type | Style options |
