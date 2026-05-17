# Core SDK API

> `@cinaconnect/core` — CinaConnect 核心 SDK 参考。

## CinaConnect

主入口类，管理钱包连接、链切换、会话等核心功能。

### 构造函数

```typescript
import { CinaConnect } from '@cinaconnect/core'

const cinaconnect = new CinaConnect(config: CinaConnectConfig)
```

### CinaConnectConfig

```typescript
interface CinaConnectConfig {
  /** 项目唯一标识 */
  projectId: string
  /** Relay WebSocket URL */
  relayUrl: string
  /** 支持的链 */
  chains: Chain[]
  /** 应用元数据 */
  metadata?: Metadata
  /** 是否开启调试日志 */
  debug?: boolean
}
```

### 方法

#### `registerAdapter(adapter: ChainAdapter)`

注册链适配器（EVM、Solana 等）。

```typescript
import { EvmAdapter } from '@cinaconnect/adapter-evm'

cinaconnect.registerAdapter(new EvmAdapter())
```

#### `registerTransport(transport: Transport)`

注册传输层（Relay WebSocket、QR 码等）。

```typescript
import { RelayTransport } from '@cinaconnect/transport-relay'

cinaconnect.registerTransport(new RelayTransport({
  url: 'wss://relay.yourdomain.com/v1',
}))
```

#### `getConnectors(): Connector[]`

获取所有已注册的连接器。

```typescript
const connectors = cinaconnect.getConnectors()
// [{ id: 'metamask', name: 'MetaMask', ... }, ...]
```

#### `connect(connector: Connector, params?: ConnectParams): Promise<ConnectionResult>`

连接指定钱包。

```typescript
const [connector] = cinaconnect.getConnectors()
const result = await cinaconnect.connect(connector)

console.log(result.accounts)  // ['0x1a2b...3c4d']
console.log(result.chainId)   // 1
```

#### `disconnect(): Promise<void>`

断开当前连接。

```typescript
await cinaconnect.disconnect()
```

#### `switchChain(chainId: number): Promise<void>`

切换区块链网络。

```typescript
await cinaconnect.switchChain(137)  // 切换到 Polygon
```

#### `signMessage(message: string): Promise<string>`

签名消息（EIP-191）。

```typescript
const signature = await cinaconnect.signMessage('Hello, CinaConnect!')
```

#### `signTransaction(tx: TransactionRequest): Promise<string>`

签名交易。

```typescript
const txHash = await cinaconnect.signTransaction({
  to: '0x...',
  value: 1000000000000000000n,  // 1 ETH
  data: '0x...',
})
```

#### `on(event: string, handler: EventHandler): void`

监听事件。

```typescript
cinaconnect.on('accountChanged', (accounts: string[]) => {
  console.log('Account changed:', accounts)
})

cinaconnect.on('chainChanged', (chainId: number) => {
  console.log('Chain changed:', chainId)
})

cinaconnect.on('disconnect', () => {
  console.log('Disconnected')
})
```

#### `off(event: string, handler: EventHandler): void`

移除事件监听器。

```typescript
cinaconnect.off('accountChanged', handler)
```

#### `getAccounts(): Promise<string[]>`

获取当前账户列表。

```typescript
const accounts = await cinaconnect.getAccounts()
// ['0x1a2b...3c4d']
```

#### `getChainId(): Promise<number>`

获取当前链 ID。

```typescript
const chainId = await cinaconnect.getChainId()
// 1
```

## Connector 接口

```typescript
interface Connector {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly installed: boolean

  connect(params?: ConnectParams): Promise<ConnectionResult>
  disconnect(): Promise<void>
  getAccounts(): Promise<string[]>
  getChainId(): Promise<number>
  switchChain(chainId: number): Promise<void>
  signMessage(message: string): Promise<string>
  signTransaction(tx: TransactionRequest): Promise<string>
  on(event: string, handler: EventHandler): void
  off(event: string, handler: EventHandler): void
}
```

## ConnectionResult

```typescript
interface ConnectionResult {
  /** 已连接的账户 */
  accounts: string[]
  /** 当前链 ID */
  chainId: number
  /** 会话 ID */
  sessionId: string
}
```

## ChainAdapter

链适配器基类，每种链（EVM、Solana 等）实现自己的适配器。

```typescript
interface ChainAdapter {
  /** 适配器支持的链类型 */
  readonly chainType: string

  /** 解析连接器 */
  resolveConnector(connector: Connector): Promise<Connector>

  /** 签名交易 */
  signTransaction(tx: any): Promise<string>

  /** 签名消息 */
  signMessage(message: string): Promise<string>
}
```

## EIP-6963 钱包发现

```typescript
import { discoverWallets } from '@cinaconnect/core'

const wallets = await discoverWallets()
// [
//   { info: { rdns: 'io.metamask', name: 'MetaMask', ... }, provider: ... },
//   { info: { rdns: 'com.rabby', name: 'Rabby', ... }, provider: ... },
// ]
```

## 传输层

### RelayTransport

通过自建 Relay 进行 WebSocket 通信。

```typescript
import { RelayTransport } from '@cinaconnect/transport-relay'

const transport = new RelayTransport({
  url: 'wss://relay.yourdomain.com/v1',
  reconnectInterval: 5000,
  pingInterval: 30000,
})
```

### InjectedTransport

通过注入的 EIP-1193 Provider 通信。

```typescript
import { InjectedTransport } from '@cinaconnect/transport-injected'

const transport = new InjectedTransport(window.ethereum!)
```

### QRCodeTransport

通过扫码连接。

```typescript
import { QRCodeTransport } from '@cinaconnect/transport-qrcode'

const transport = new QRCodeTransport({
  relayUrl: 'wss://relay.yourdomain.com/v1',
})

const uri = await transport.getUri()
// 展示 uri 为 QR 码
```

## 会话管理

```typescript
import { SessionManager } from '@cinaconnect/core'

const sessionManager = new SessionManager({
  storage: localStorage,
  ttl: 30 * 24 * 60 * 60 * 1000, // 30 天
})

// 恢复持久化会话
const state = await sessionManager.restore()

// 监听状态变化
sessionManager.subscribe((state) => {
  console.log(state)
})
```

### SessionState

```typescript
type SessionState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; accounts: string[]; chainId: number; sessionId: string }
  | { status: 'error'; error: Error }
```
