# Core SDK API

> `@cinacoin/core-sdk` — Cinacoin 核心 SDK 参考。

## Installation

```bash
npm install @cinacoin/core-sdk
```

## Main Entry — Cinacoin

主入口类，管理钱包连接、链切换、会话等核心功能。

### 构造函数

```typescript
import { Cinacoin } from '@cinacoin/core-sdk'

const cinacoin = new Cinacoin(config: CinacoinConfig)
```

### CinacoinConfig

```typescript
interface CinacoinConfig {
  projectId: string          // 项目唯一标识
  relayUrl: string           // Relay WebSocket URL
  chains: Chain[]            // 支持的链
  metadata?: Metadata        // 应用元数据
  debug?: boolean            // 是否开启调试日志
}
```

### 方法

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerAdapter` | `(adapter: ChainAdapter) => void` | 注册链适配器 |
| `registerTransport` | `(transport: Transport) => void` | 注册传输层 |
| `getConnectors` | `() => Connector[]` | 获取所有已注册的连接器 |
| `connect` | `(connector: Connector, params?: ConnectParams) => Promise<ConnectionResult>` | 连接指定钱包 |
| `disconnect` | `() => Promise<void>` | 断开当前连接 |
| `switchChain` | `(chainId: number) => Promise<void>` | 切换区块链网络 |
| `signMessage` | `(message: string) => Promise<string>` | 签名消息（EIP-191） |
| `signTransaction` | `(tx: TransactionRequest) => Promise<string>` | 签名交易 |
| `getAccounts` | `() => Promise<string[]>` | 获取当前账户列表 |
| `getChainId` | `() => Promise<number>` | 获取当前链 ID |
| `on` | `(event: string, handler: EventHandler) => void` | 监听事件 |
| `off` | `(event: string, handler: EventHandler) => void` | 移除事件监听 |

### 事件

| Event | Payload | Description |
|-------|---------|-------------|
| `accountChanged` | `string[]` | 账户变更 |
| `chainChanged` | `number` | 链切换 |
| `disconnect` | — | 断开连接 |
| `connect` | `ConnectionResult` | 连接成功 |

## Connector — 抽象基类

所有钱包连接方式（injected, QR, relay/WC）都实现此接口。

```typescript
import { Connector, RedirectHandler } from '@cinacoin/core-sdk'

abstract class Connector extends EventEmitter {
  readonly id: string          // 唯一标识符
  readonly name: string        // 显示名称
  readonly icon: string        // 图标 URL
  readonly installed: boolean  // 是否已安装
  readonly type: string        // 'injected' | 'qr' | 'relay' | 'walletconnect'

  abstract connect(params?: ConnectParams): Promise<ConnectionResult>
  abstract disconnect(): Promise<void>
  abstract getAccounts(): Promise<string[]>
  abstract getChainId(): Promise<number>
  abstract switchChain(chainId: number): Promise<void>
  abstract signMessage(message: string): Promise<string>
  abstract signTransaction(tx: TransactionRequest): Promise<string>

  // Deep link support
  setRedirectHandler(handler?: RedirectHandler): void
  openDeepLink(walletId: string, uri: string, params?: DeepLinkParams): Promise<RedirectResult>
  generateDeepLink(walletId: string, uri: string, queryParams?: Record<string, string>): string
}
```

### RedirectHandler

处理 deep link 跳转逻辑（deep link → timeout → universal link → QR code）：

```typescript
import { RedirectHandler } from '@cinacoin/core-sdk'

const handler = new RedirectHandler()
await handler.openDeepLink('metamask', 'wc://...')
```

## SessionManager — 会话管理

管理钱包连接生命周期状态机。

```typescript
import { SessionManager } from '@cinacoin/core-sdk'

const sessionManager = new SessionManager()

// 启动连接
await sessionManager.initiate(connector, params)

// 确认连接
await sessionManager.confirm(sessionId, accounts, chainId)

// 断开连接
await sessionManager.terminate()

// 恢复持久化会话
const state = await sessionManager.restore()

// 订阅状态变化
const unsubscribe = sessionManager.subscribe((state) => {
  console.log('State:', state.status)
})

// 取消订阅
unsubscribe()
```

### SessionState

```typescript
type SessionState =
  | { status: 'disconnected' }
  | { status: 'connecting'; connectorId: string }
  | { status: 'connected'; accounts: string[]; chainId: number; sessionId: string; connectorId: string }
  | { status: 'error'; error: Error }
```

### 状态转换

```
disconnected → connecting → connected → disconnected
    ↓               ↓           ↓
    └────── error ──┘           │
                                └── error → disconnected
```

## Core Types

### Chain & ChainReference

```typescript
type ChainNamespace = 'eip155' | 'solana' | 'bip121' | 'bip122' | 'tron' | 'ton' | 'polkadot'

interface ChainReference {
  namespace: ChainNamespace  // e.g. 'eip155'
  reference: string          // e.g. '1' for Ethereum mainnet
}

interface Chain {
  id: string                 // CAIP-2 chain ID
  name: string               // Human-readable name
  rpcUrl: string             // JSON-RPC endpoint
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
  explorerUrl?: string
  iconUrl?: string
}
```

### ConnectParams & ConnectionResult

```typescript
interface ConnectParams {
  topic?: string             // 已有会话的 topic
  relayUrl?: string          // Relay URL 覆盖
  uri?: string               // WalletConnect 配对 URI
  chains?: number[]          // 支持的链 ID
  metadata?: AppMetadata     // dApp 元数据
}

interface ConnectionResult {
  sessionId: string           // 会话 ID
  accounts: string[]          // 已连接账户
  chainId: number             // 当前链 ID
  connectorId: string         // 使用的连接器
}
```

### AppMetadata

```typescript
interface AppMetadata {
  name: string
  description: string
  url: string
  icons: string[]
}
```

### TransactionRequest

```typescript
interface TransactionRequest {
  from: string
  to: string
  value?: string              // wei (hex)
  data?: string               // calldata (hex)
  gas?: string                // gas limit (hex)
  gasPrice?: string           // gas price (hex)
  maxFeePerGas?: string       // EIP-1559 (hex)
  maxPriorityFeePerGas?: string
  nonce?: string
  chainId?: number
}
```

### SessionProposal & Pairing

```typescript
interface SessionProposal {
  id: number
  requiredNamespaces: Record<string, RequiredNamespace>
  optionalNamespaces?: Record<string, RequiredNamespace>
  relays: { protocol: string; data?: string }[]
  proposer: { publicKey: string; metadata: AppMetadata }
}

interface RequiredNamespace {
  chains: string[]
  methods: string[]
  events: string[]
}

interface PairingData {
  topic: string
  uri: string
  peerMetadata?: AppMetadata
  active: boolean
  expiry: number             // ms timestamp
}
```

## Transports

### RelayTransport

通过自建 Relay 进行 WebSocket 通信：

```typescript
import { RelayTransport, type RelayTransportConfig } from '@cinacoin/core-sdk'

const transport = new RelayTransport({
  url: 'wss://relay.yourdomain.com/v1',
})
```

### InjectedProvider

通过浏览器注入的 EIP-1193 Provider 通信：

```typescript
import { InjectedProvider } from '@cinacoin/core-sdk'

const provider = new InjectedProvider(window.ethereum!)
```

### QRTransport

通过扫码连接：

```typescript
import { QRTransport, type QRTransportConfig } from '@cinacoin/core-sdk'

const transport = new QRTransport(config)
```

## Chain Adapters

The SDK includes adapters for multiple blockchain ecosystems, all available through `createAdapter()`:

### createAdapter

```typescript
import { createAdapter, type NewChainAdapterFactoryConfig } from '@cinacoin/core-sdk'

// Create adapters by type
const tonAdapter = await createAdapter({ type: 'ton' })
const tronAdapter = await createAdapter({ type: 'tron', chains: [...] })
const polkadotAdapter = await createAdapter({ type: 'polkadot' })
const solanaAdapter = await createAdapter({ type: 'solana' })
```

Supported adapter types: `'viem' | 'wagmi' | 'ethers5' | 'ethers6' | 'ton' | 'tron' | 'polkadot' | 'solana'`

### Built-in Adapters

| Adapter | Export | Utilities |
|---------|--------|-----------|
| EVM | `EvmAdapter` | — |
| viem | `ViemChainAdapter`, `createViemAdapter` | `ViemClient`, `ViemAccount`, `ViemChain` |
| wagmi | `WagmiConnector`, `MultiChainConnector`, `createWagmiConnector` | `WagmiConfig`, `WagmiChain` |
| ethers v5 | `Ethers5Adapter` | `Ethers5Provider`, `Ethers5Signer` |
| ethers v6 | `Ethers6Adapter` | `Ethers6Provider`, `Ethers6Signer` |
| Solana | `SolanaChainAdapter`, `SOLANA_CHAINS`, `SOLANA_WALLETS` | `isValidSolanaAddress`, `base58Decode` |
| Bitcoin | `BitcoinChainAdapter`, `BITCOIN_CHAINS`, `BITCOIN_WALLETS` | `validateBitcoinAddress`, `UTXO`, `AddressFormat` |
| TON | `TONChainAdapter`, `TON_CHAINS`, `TON_WALLETS` | `isValidTONAddress`, `parseTONAddress`, `hexToBase64url` |
| TRON | `TRONChainAdapter`, `TRON_CHAINS`, `TRON_WALLETS` | `isValidTRONAddress`, `base58ToHex`, `hexToBase58` |
| Polkadot | `PolkadotChainAdapter`, `POLKADOT_CHAINS`, `POLKADOT_WALLETS` | `decodeSS58`, `isValidSS58Address` |

## EIP-6963 Wallet Discovery

```typescript
import { discoverWallets, watchWallets, findWalletByRdns } from '@cinacoin/core-sdk'

// One-time discovery
const wallets = await discoverWallets()

// Watch for new wallets
const unwatch = watchWallets((wallet) => {
  console.log('New wallet detected:', wallet.info.name)
})

// Find a specific wallet by RDNS
const metamask = findWalletByRdns('io.metamask')
```

### EIP-6963 Types

```typescript
interface EIP6963ProviderInfo {
  rdns: string
  name: string
  icon: string   // data URI
  uuid: string
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: EIP1193Provider
}
```

## EIP-5792 Wallet Call API

Support for atomic batch transactions via EIP-5792:

```typescript
import {
  walletGetCapabilities,
  walletSendCalls,
  buildAtomicBatch,
  executeAtomicBatch,
  createEthTransferCall,
  createContractCall,
  createErc20ApproveCall,
  createApproveAndSwapCalls,
  supportsAtomicBatch,
  validateBatchConfig,
} from '@cinacoin/core-sdk'
```

### Key Functions

| Function | Description |
|----------|-------------|
| `walletGetCapabilities` | Fetch wallet capabilities per chain |
| `walletSendCalls` | Send batched calls |
| `walletGetCallsStatus` | Get batch status |
| `waitForCallsStatus` | Poll until batch is confirmed |
| `buildAtomicBatch` | Build an atomic batch config |
| `executeAtomicBatch` | Execute an atomic batch |
| `createEthTransferCall` | Create an ETH transfer call |
| `createContractCall` | Create a contract call |
| `createErc20ApproveCall` | Create an ERC-20 approve call |
| `createApproveAndSwapCalls` | Create approve + swap call batch |
| `supportsAtomicBatch` | Check if wallet supports atomic batch |
| `hasCapability` | Check if a capability is supported |
| `filterByCapability` | Filter chains by capability |

### Types

```typescript
interface WalletCapabilities {
  [chainId: string]: ChainCapabilities
}

interface ChainCapabilities {
  atomicBatch?: { supported: boolean }
  paymasterService?: { supported: boolean; url?: string }
}

interface Call {
  to: string
  value?: string
  data?: string
}

interface SendCallsParams {
  calls: Call[]
  capabilities?: Record<string, unknown>
}

interface SendCallsResult {
  id: string  // batch identifier
}

interface AtomicBatchConfig {
  calls: Call[]
  simulate?: boolean
}
```

## Deep Linking

```typescript
import {
  generateDeepLink,
  registerWalletDeepLink,
  getAppStoreUrl,
  generateUniversalLink,
  generateWalletConnectUniversalLink,
  smartRedirect,
  detectPlatform,
  WALLET_DEEP_LINKS,
} from '@cinacoin/core-sdk'
```

| Function | Description |
|----------|-------------|
| `generateDeepLink` | Generate a deep link URL for a wallet |
| `generateUniversalLink` | Generate an Apple universal link |
| `generateWalletConnectUniversalLink` | Generate a WalletConnect universal link |
| `smartRedirect` | Smart redirect with fallback chain |
| `detectPlatform` | Detect current platform (iOS/Android/Desktop) |
| `getAppStoreUrl` | Get App Store or Play Store URL for a wallet |
| `registerWalletDeepLink` | Register a wallet's deep link config |

## Crypto Utilities

```typescript
import {
  generateKeypair,
  sharedSecret,
  serializeKeypair,
  deserializeKeypair,
  encrypt,
  decrypt,
  deriveSymmetricKey,
  deriveTopic,
  generateNonce,
  bytesToHex,
  hexToBytes,
} from '@cinacoin/core-sdk'
```

| Function | Description |
|----------|-------------|
| `generateKeypair` | Generate X25519 keypair for encryption |
| `sharedSecret` | Compute shared secret from keypairs |
| `serializeKeypair` | Serialize keypair to bytes |
| `deserializeKeypair` | Deserialize keypair from bytes |
| `encrypt` | Encrypt data with shared secret |
| `decrypt` | Decrypt data with shared secret |
| `deriveSymmetricKey` | Derive a symmetric encryption key |
| `deriveTopic` | Derive a topic string for relay |
| `generateNonce` | Generate a cryptographic nonce |

## State Management

```typescript
import { createCinacoinStore, initializeStore } from '@cinacoin/core-sdk'

const store = createCinacoinStore({
  chains: [...],
  projectId: '...',
})

// Or initialize from existing state
initializeStore(store, persistedState)
```

### CinacoinState

```typescript
interface CinacoinState {
  connection: ConnectionStatus
  accounts: string[]
  chainId: number
  connectors: string[]
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
```

## SIWE Authentication

Optional SIWE integration (requires `@cinacoin/siwe`):

```typescript
import { SIWEAuth } from '@cinacoin/core-sdk'

const siweAuth = new SIWEAuth({
  domain: 'mydapp.com',
  uri: 'https://mydapp.com',
  statement: 'Sign in to My dApp',
})

const result = await siweAuth.signIn(address, signMessage)
```

### SIWEAuthConfig

| Property | Type | Description |
|----------|------|-------------|
| `domain` | `string` | Request domain |
| `uri` | `string` | Request URI |
| `statement` | `string` | Human-readable statement |
| `expirationTime` | `string` | Optional expiration |

### SIWESignInResult

```typescript
interface SIWESignInResult {
  valid: boolean
  address: string
  nonce: string
}
```

## Version

```typescript
import { VERSION } from '@cinacoin/core-sdk'

console.log(VERSION) // '0.1.0'
```

## See Also

- [React SDK](./react.md) — React hooks and components
- [AA SDK](./aa-sdk.md) — Account Abstraction
- [SIWE](./siwe.md) — Sign-In With Ethereum
- [Generated TypeDoc](./generated/core-sdk.md) — Auto-generated reference
- [Full TypeDoc Output](./typedoc/) — Complete generated documentation
