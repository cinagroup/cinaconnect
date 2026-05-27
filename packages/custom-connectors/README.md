# @cinacoin/custom-connectors

Custom wallet connector interface and built-in connectors for Cinacoin.

## Installation

```bash
npm install @cinacoin/custom-connectors
```

## Usage

```ts
import { ConnectorFactory, InjectedConnector } from '@cinacoin/custom-connectors';

const factory = new ConnectorFactory();
const connector = factory.create('injected');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ConnectorFactory` | class | Factory for creating connectors |
| `InjectedConnector` | class | Injected wallet connector |
| `QRConnector` | class | QR code connector |
| `WalletConnectConnector` | class | WalletConnect connector |
| `useConnectors` | hook | React hook for connectors |
| `ConnectorPicker` | component | Connector picker UI component |
| `ConnectorConfig` | type | Connector configuration |
| `ConnectionResult` | type | Connection result type |
