# Configuration

> Full configuration options for CinaConnect.

## Core Configuration

```typescript
import { CinaConnect } from '@cinaconnect/core-sdk'

const cinaconnect = new CinaConnect({
  // Required
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.yourdomain.com/v1',
  chains: [mainnet, polygon],

  // Optional
  metadata: {
    name: 'My dApp',
    description: 'My awesome dApp',
    url: 'https://myapp.com',
    icons: ['https://myapp.com/logo.png'],
  },
  theme: 'dark',
  locale: 'en',
})
```

## Relay Server Configuration

```yaml
# docker-compose.yml
services:
  relay-server:
    image: cinaconnect/relay-server:latest
    environment:
      - NATS_URL=nats://nats:4222
      - REDIS_URL=redis://redis:6379
      - PORT=443
    ports:
      - "443:443"
```

## RPC Proxy Configuration

```yaml
services:
  rpc-proxy:
    image: cinaconnect/rpc-proxy:latest
    environment:
      - PROVIDERS=alchemy,infura,quicknode
      - CACHE_TTL=60
      - RATE_LIMIT=1000
```

## Next Steps

- [Quick Start](/guide/quick-start)
- [Migration Guide](/guide/migrate-from-reown)
