# UI 组件 API

> `@cinacoin/react` / `@cinacoin/vue` — UI 组件参考。

## CinacoinProvider

顶层 Provider，为应用注入 Cinacoin 上下文。

```tsx
import { CinacoinProvider } from '@cinacoin/react'

<CinacoinProvider config={config}>
  <App />
</CinacoinProvider>
```

### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `config` | `CinacoinConfig` | ✅ | 配置对象，见 [配置文档](/guide/configuration) |
| `children` | `ReactNode` | ✅ | 子组件 |

## ConnectButton

主连接按钮，显示连接状态和账户信息。

```tsx
import { ConnectButton } from '@cinacoin/react'

<ConnectButton
  label="连接钱包"
  variant="primary"
  size="md"
  showBalance={true}
  showAvatar={true}
  showNetwork={true}
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `label` | `string` | `'Connect Wallet'` | 未连接时的按钮文本 |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | 按钮样式 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按钮尺寸 |
| `showBalance` | `boolean` | `true` | 连接时显示余额 |
| `showAvatar` | `boolean` | `true` | 连接时显示头像（ENS） |
| `showNetwork` | `boolean` | `true` | 连接时显示网络 |
| `className` | `string` | — | 自定义 CSS 类 |
| `style` | `CSSProperties` | — | 内联样式 |
| `onClick` | `() => void` | — | 点击回调 |
| `onDisconnect` | `() => void` | — | 断开连接回调 |

### 状态展示

```
Disconnected: ┌────────────────────────┐
              │   🔗 Connect Wallet    │
              └────────────────────────┘

Connected:    ┌────────────────────────┐
              │ [●] 0x1a2b...3c4d ▼   │
              │      $1,234.56 [ETH]  │
              └────────────────────────┘
```

## ConnectModal

钱包连接弹窗。

```tsx
import { ConnectModal } from '@cinacoin/react'

<ConnectModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  views={['wallets', 'social', 'scan']}
  defaultView="wallets"
  recommendedWallets={['metamask', 'rabby']}
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isOpen` | `boolean` | — | 是否打开弹窗 |
| `onClose` | `() => void` | — | 关闭回调 |
| `views` | `Array<'wallets' \| 'social' \| 'email' \| 'scan'>` | `['wallets']` | 显示的连接方式 |
| `defaultView` | `string` | `'wallets'` | 默认视图 |
| `recommendedWallets` | `string[]` | — | 推荐钱包列表（排序靠前） |
| `theme` | `ThemeConfig` | — | 主题覆盖 |

## ChainSwitcher

链切换下拉菜单。

```tsx
import { ChainSwitcher } from '@cinacoin/react'

<ChainSwitcher
  chains={chains}
  activeChainId={currentChainId}
  onChainChange={(chainId) => handleChainChange(chainId)}
/>
```

### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chains` | `ChainInfo[]` | ✅ | 支持的链列表 |
| `activeChainId` | `number` | ✅ | 当前链 ID |
| `onChainChange` | `(chainId: number) => void` | ✅ | 切换回调 |

## AccountModal

账户管理弹窗。

```tsx
import { AccountModal } from '@cinacoin/react'

<AccountModal
  address={account}
  chainId={chainId}
  onDisconnect={() => disconnect()}
  onCopyAddress={() => copyToClipboard(account)}
  onViewExplorer={() => window.open(explorerUrl)}
/>
```

## TransactionToast

交易通知组件。

```tsx
import { TransactionToast } from '@cinacoin/react'

<TransactionToast
  hash="0xabc123..."
  chainId={1}
  status="pending"
  confirmations={3}
  targetConfirmations={12}
  autoDismiss={5000}
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `hash` | `string` | ✅ | 交易哈希 |
| `chainId` | `number` | ✅ | 链 ID |
| `status` | `'pending' \| 'confirmed' \| 'failed' \| 'replaced'` | ✅ | 交易状态 |
| `confirmations` | `number` | `0` | 当前确认数 |
| `targetConfirmations` | `number` | `12` | 目标确认数 |
| `explorerUrl` | `string` | — | 区块浏览器链接 |
| `autoDismiss` | `number` | `0` | 自动关闭时间 (ms)，0 为不自动关闭 |

## NetworkBadge

网络标记组件。

```tsx
import { NetworkBadge } from '@cinacoin/react'

<NetworkBadge chainId={1} size="sm" />
```

## useCinacoin Hook

React Hook，提供 Cinacoin 上下文。

```tsx
import { useCinacoin } from '@cinacoin/react'

function Component() {
  const {
    account,        // 当前账户地址
    chainId,        // 当前链 ID
    status,         // 'disconnected' | 'connecting' | 'connected' | 'error'
    connectors,     // 可用连接器列表
    connect,        // (connector: Connector) => Promise<void>
    disconnect,     // () => Promise<void>
    switchChain,    // (chainId: number) => Promise<void>
    signMessage,    // (message: string) => Promise<string>
    balance,        // 当前账户余额 (格式化)
    ensName,        // ENS 名称
    ensAvatar,      // ENS 头像 URL
  } = useCinacoin()

  // ...
}
```

## 无障碍支持

所有组件遵循 **WCAG 2.1 AA** 标准：

- ✅ `aria-label` 语义标签
- ✅ 键盘导航 (Tab/Enter/Escape/Arrow)
- ✅ 焦点管理 (Focus Trap 弹窗)
- ✅ 屏幕阅读器兼容
- ✅ 高对比度模式支持

## 国际化

组件内置多语言支持，通过 `locale` 配置切换：

```typescript
// 支持的语言
const supportedLocales = [
  'en',     // English
  'zh-CN',  // 简体中文
  'zh-TW',  // 繁体中文
  'ja',     // 日本語
  'ko',     // 한국어
  'fr',     // Français
  'de',     // Deutsch
  'es',     // Español
  'ru',     // Русский
  'ar',     // العربية (RTL)
]
```
