# @cinacoin/ens-resolver

ENS name resolution, reverse lookup, avatar retrieval, and record fetching for Cinacoin.

## Installation

```bash
npm install @cinacoin/ens-resolver
```

## Usage

```ts
import { resolveENSName, reverseLookupENS } from '@cinacoin/ens-resolver';

const address = await resolveENSName('vitalik.eth');
const name = await reverseLookupENS('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ENSResolver` | class | Main ENS resolver class |
| `createENSResolver` | function | Factory for ENS resolver |
| `resolveENSName` | function | Resolve ENS name to address |
| `reverseLookupENS` | function | Reverse lookup address to name |
| `getAvatarENS` | function | Get ENS avatar |
| `ENSRecord` | type | ENS record type |
| `ENSProfile` | type | ENS profile type |
| `ENSResolverError` | class | Custom error class |
| `ENS_CHAIN_CONFIG` | const | ENS chain configuration |
