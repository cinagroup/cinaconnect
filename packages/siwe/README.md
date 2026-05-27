# @cinacoin/siwe

Sign-In with Ethereum (SIWE) integration for Cinacoin.

## Installation

```bash
npm install @cinacoin/siwe
```

## Usage

```ts
import { createSiweMessage, verifySiweSignature } from '@cinacoin/siwe';

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
