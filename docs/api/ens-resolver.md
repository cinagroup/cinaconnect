# ENS Resolver API

> `@cinacoin/ens-resolver` — ENS 名称解析、反向查找和头像获取。

## Installation

```bash
npm install @cinacoin/ens-resolver
```

## Usage

```typescript
import { ENSResolver, createENSResolver, resolveENSName, reverseLookupENS, getAvatarENS } from '@cinacoin/ens-resolver'

// Create resolver
const resolver = createENSResolver({ rpcUrl: 'https://eth.llamarpc.com' })

// Resolve ENS name to address
const address = await resolver.resolveName('vitalik.eth')

// Reverse lookup
const name = await resolver.reverseLookup('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')

// Get ENS avatar
const avatar = await resolver.getAvatar('vitalik.eth')

// Get ENS records
const records = await resolver.getRecords('vitalik.eth', ['email', 'url', 'avatar'])
```

## Configuration

```typescript
import { ENSResolver, ENS_CHAIN_CONFIG } from '@cinacoin/ens-resolver'

const resolver = new ENSResolver({
  rpcUrl: 'https://eth.llamarpc.com',
  cache: true,
  cacheTTL: 300_000, // 5 minutes
})
```

## Error Handling

```typescript
import { ENSResolverError, ENS_ERRORS } from '@cinacoin/ens-resolver'

try {
  const address = await resolver.resolveName('invalid-name')
} catch (err) {
  if (err.code === ENS_ERRORS.NAME_NOT_FOUND) { /* ENS name does not exist */ }
  if (err.code === ENS_ERRORS.RESOLVER_NOT_FOUND) { /* No resolver configured */ }
}
```

## See Also

- [Core SDK](./core-sdk.md)
