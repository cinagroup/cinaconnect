# WalletConnect v2 API

> `@cinacoin/walletconnect-v2` — WalletConnect v2 协议实现。

## Installation

```bash
npm install @cinacoin/walletconnect-v2
```

## Core Client

```typescript
import { WalletConnectClient } from '@cinacoin/walletconnect-v2'

const client = new WalletConnectClient({
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: {
    name: 'My dApp',
    description: 'WalletConnect v2 dApp',
    url: 'https://mydapp.com',
    icons: ['https://mydapp.com/icon.png'],
  },
})

// Initialize
await client.init()

// Connect via URI
await client.pair({ uri: 'wc:...' })

// Get sessions
const sessions = client.sessions.getAll()
```

## Pairing

```typescript
import { parseWcUri, formatWcUri, createPairing, approvePairing, isValidWcUri } from '@cinacoin/walletconnect-v2'

// Parse a WC URI
const parsed = parseWcUri('wc:topic@2?relay-protocol=irn&symKey=...')

// Validate
isValidWcUri('wc:...') // boolean

// Create pairing
const pairing = await createPairing(client, { topic: '...' })
```

## Session Management

```typescript
import { WcSessionManager } from '@cinacoin/walletconnect-v2'

const sessionManager = new WcSessionManager(client)

// Create session
const session = await sessionManager.createSession({
  requiredNamespaces: {
    eip155: { chains: ['eip155:1'], methods: ['eth_sendTransaction'], events: ['chainChanged'] },
  },
})

// Send request
const result = await sessionManager.request({
  chainId: 'eip155:1',
  topic: session.topic,
  request: { method: 'eth_sendTransaction', params: [{ from: '0x...', to: '0x...', value: '0x0' }] },
})
```

## Crypto Utilities

```typescript
import {
  generateKeypair,
  sharedSecret,
  encrypt,
  decrypt,
  deriveSymmetricKey,
  deriveTopic,
  coreEncrypt,
  coreDecrypt,
} from '@cinacoin/walletconnect-v2'

const keypair = generateKeypair()
const secret = sharedSecret(keypair, remotePublicKey)
const encrypted = encrypt(symKey, message)
const decrypted = decrypt(symKey, encrypted)
```

## Relay

```typescript
import { WcRelay } from '@cinacoin/walletconnect-v2'

const relay = new WcRelay({ url: 'wss://relay.walletconnect.com' })
await relay.connect()
relay.publish({ topic: '...', message: '...' })
```

## Error Codes

```typescript
import { WC_PAIRING_ERRORS, WC_SESSION_ERRORS, WC_JSON_RPC_ERRORS } from '@cinacoin/walletconnect-v2'

// Check error type
if (error.code in WC_PAIRING_ERRORS) { /* pairing error */ }
if (error.code in WC_SESSION_ERRORS) { /* session error */ }
```

## See Also

- [Core SDK](./core-sdk.md)
