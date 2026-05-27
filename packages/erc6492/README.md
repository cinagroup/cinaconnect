# @cinacoin/erc6492

ERC-6492 signature validation for Cinacoin — contract signature verification.

## Installation

```bash
npm install @cinacoin/erc6492
```

## Usage

```ts
import { verifyERC6492Signature } from '@cinacoin/erc6492';

const isValid = await verifyERC6492Signature({
  address: '0x...',
  data: '0x...',
  signature: '0x...',
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `verifyERC6492Signature` | function | Validate ERC-6492 signature |
| `encodeERC6492Signature` | function | Encode signature in ERC-6492 format |
| `isERC6492Signature` | function | Check if signature is ERC-6492 |
| `ERC6492Signature` | type | Signature type |
| `ERC6492Config` | type | Configuration type |
