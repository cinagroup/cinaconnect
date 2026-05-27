# @cinacoin/core-sdk

Cinacoin Core SDK — Self-hosted wallet connection toolkit.

## Installation

```bash
npm install @cinacoin/core-sdk
```

## Usage

```ts
import { Connector, SessionManager, createCinacoinStore } from '@cinacoin/core-sdk';

const store = createCinacoinStore({ projectId: 'YOUR_PROJECT_ID' });
const connector = new Connector({ namespace: 'eip155' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `Connector` | class | Base connector class |
| `SessionManager` | class | Session state management |
| `createCinacoinStore` | function | Create global state store |
| `initializeStore` | function | Initialize the store |
| `EventEmitter` | class | Event emitter utility |
| `discoverWallets` | function | Discover EIP-6963 wallets |
| `watchWallets` | function | Watch for wallet changes |
| `findWalletByRdns` | function | Find wallet by RDNS |
| `RelayTransport` | class | Relay transport layer |
| `Chain` | type | Chain definition type |
| `ConnectParams` | type | Connection parameters |
| `ConnectionResult` | type | Connection result type |
