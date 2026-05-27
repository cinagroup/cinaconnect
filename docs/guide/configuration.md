# 配置

> Cinacoin 完整配置选项参考。

## CinacoinProvider 配置

`CinacoinProvider` 接受一个 `config` 对象：

```tsx
import { CinacoinProvider } from '@cinacoin/react'

<CinacoinProvider config={config}>
  <App />
</CinacoinProvider>
```

### 配置字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `projectId` | `string` | ✅ | — | 项目唯一标识，用于会话管理和 analytics |
| `relayUrl` | `string` | ✅ | — | 自建 Relay WebSocket 地址 |
| `chains` | `Chain[]` | ✅ | `[]` | 支持的区块链网络列表 |
| `metadata` | `Metadata` | ❌ | `{}` | 应用元数据（名称、描述、图标） |
| `theme` | `ThemeConfig` | ❌ | `default` | 主题配置 |
| `locale` | `string` | ❌ | `'en'` | 语言代码 |
| `debug` | `boolean` | ❌ | `false` | 开启调试日志 |
| `sessionPersistence` | `'local' \| 'session' \| 'none'` | ❌ | `'local'` | 会话持久化策略 |

### Chain 配置

```typescript
interface Chain {
  /** 链 ID (EIP-155) */
  id: number
  /** 链名称 */
  name: string
  /** 原生币种 */
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  /** RPC URL（自建或公共） */
  rpcUrl: string
  /** 区块浏览器 URL */
  blockExplorerUrl?: string
  /** 图标 URL */
  iconUrl?: string
  /** 是否为测试网 */
  testnet?: boolean
}
```

### Metadata 配置

```typescript
interface Metadata {
  /** 应用名称 */
  name: string
  /** 应用描述 */
  description: string
  /** 应用 URL */
  url: string
  /** 图标列表 */
  icons: string[]
}
```

### Theme 配置

```typescript
interface ThemeConfig {
  /** 主题模式 */
  mode?: 'dark' | 'light'
  /** 自定义 CSS 变量 */
  variables?: Record<string, string>
  /** 预设主题名 */
  preset?: 'default' | 'minimal' | 'neon'
  /** 圆角大小 */
  borderRadius?: string
  /** 品牌色 */
  accentColor?: string
}
```

## 完整示例

```tsx
import { mainnet, polygon, arbitrum } from '@cinacoin/core/chains'
import { CinacoinProvider } from '@cinacoin/react'

const config = {
  projectId: 'my-project-123',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet, polygon, arbitrum],
  metadata: {
    name: 'MyDeFi App',
    description: 'Decentralized Finance Platform',
    url: 'https://mydefi.app',
    icons: ['https://mydefi.app/logo.png'],
  },
  theme: {
    mode: 'dark',
    accentColor: '#3B82F6',
    borderRadius: '12px',
  },
  locale: 'zh-CN',
  debug: process.env.NODE_ENV === 'development',
  sessionPersistence: 'local',
}

function App() {
  return (
    <CinacoinProvider config={config}>
      <Router />
    </CinacoinProvider>
  )
}
```

## 环境变量配置

推荐通过环境变量注入敏感配置：

```bash
# .env
VITE_ONCHAINUX_PROJECT_ID=your-project-id
VITE_ONCHAINUX_RELAY_URL=wss://relay.yourdomain.com/v1
```

```tsx
const config = {
  projectId: import.meta.env.VITE_ONCHAINUX_PROJECT_ID,
  relayUrl: import.meta.env.VITE_ONCHAINUX_RELAY_URL,
  // ...
}
```

## 多环境配置

```typescript
const configs = {
  development: {
    projectId: 'dev-123',
    relayUrl: 'wss://relay-dev.cinacoin.com/v1',
    debug: true,
  },
  staging: {
    projectId: 'staging-123',
    relayUrl: 'wss://relay-staging.cinacoin.com/v1',
    debug: false,
  },
  production: {
    projectId: 'prod-123',
    relayUrl: 'wss://relay.cinacoin.com/v1',
    debug: false,
  },
}

const config = configs[process.env.NODE_ENV || 'development']
```
