# @cinaconnect/siwx

Sign-In with X (SIWX) — multi-chain authentication extension for CinaConnect.

## Installation

```bash
npm install @cinaconnect/siwx
```

## Usage

```ts
import { SiwxVerifier } from '@cinaconnect/siwx';

const verifier = new SiwxVerifier();
const result = await verifier.verify({ chain: 'solana', message, signature });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `SiwxVerifier` | class | Multi-chain SIWX verifier |
| `SiwxMessage` | type | SIWX message type |
| `SiwxResult` | type | Verification result type |
| `SiwxConfig` | type | Configuration type |
