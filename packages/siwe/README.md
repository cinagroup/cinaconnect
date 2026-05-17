# @cinaconnect/siwe

Sign-In with Ethereum (SIWE) integration for CinaConnect.

## Installation

```bash
npm install @cinaconnect/siwe
```

## Usage

```ts
import { createSiweMessage, verifySiweSignature } from '@cinaconnect/siwe';

const message = createSiweMessage({
  domain: 'example.com',
  address: '0x...',
  statement: 'Sign in to the app',
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createSiweMessage` | function | Create SIWE message |
| `verifySiweSignature` | function | Verify SIWE signature |
| `SiweMessage` | type | SIWE message type |
| `SiweConfig` | type | Configuration type |
| `SiweSession` | type | Session type |
