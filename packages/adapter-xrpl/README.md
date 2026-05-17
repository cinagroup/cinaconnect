# @cinaconnect/adapter-xrpl

XRP Ledger chain adapter for CinaConnect — Xaman (formerly Xumm), Fireblocks, Ledger.

## Installation

```bash
npm install @cinaconnect/adapter-xrpl
```

## Usage

```ts
import { XrplAdapter } from '@cinaconnect/adapter-xrpl';

const adapter = new XrplAdapter();
await adapter.connect({ connectorId: 'xaman' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `XrplAdapter` | class | Main XRPL chain adapter |
| `announceXrplProviders` | function | Announce XRPL providers via EIP-6963 |
| `XamanConnector` | class | Xaman (Xumm) wallet connector |
| `XrplNetwork` | type | Network type |
| `XrplConnectionResult` | type | Connection result type |
| `XrplConnector` | type | Connector interface |
| `XrpSendParams` | type | XRP send parameters |
| `AccountSettingsParams` | type | Account settings parameters |
| `TrustLineParams` | type | Trust line parameters |
| `NftMintParams` | type | NFT mint parameters |
