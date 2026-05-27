# Phase 2: 自有品牌 UI 组件库 — 详细技术设计

> **目标**: 构建完全自有品牌的钱包连接与链上交互 UI 组件库  
> **时间**: M2-M4  
> **产出物**: `@cinacoin/ui` 组件库 + 多框架适配器 + 示例应用

---

## 1. 设计原则

### 1.1 品牌独立性

- **零 Reown 痕迹**：不包含任何 Reown/WalletConnect logo、品牌色、文案
- **可定制主题**：提供完整 Design Token 系统，支持一键换肤
- **白标输出**：支持第三方产品完全替换品牌标识

### 1.2 多框架支持

- **核心渲染**：基于 Web Components (Lit)，框架无关
- **框架适配**：React / Vue / Svelte / Angular 专属 Wrapper
- **React Native**：独立 RN 实现（非 Web Components 包装）

### 1.3 无障碍与国际化

- **WCAG 2.1 AA** 合规
- **RTL** 语言支持
- **i18n** 完整多语言包（中/英/日/韩/法/德/西/俄/阿拉伯）

---

## 2. 组件架构

```
@cinacoin/ui
├── packages/
│   ├── design-tokens/     # 设计令牌 (CSS Variables)
│   │   ├── colors.json
│   │   ├── spacing.json
│   │   ├── typography.json
│   │   ├── shadows.json
│   │   └── animations.json
│   │
│   ├── core/              # Web Components 核心 (Lit)
│   │   ├── components/
│   │   │   ├── connect-button/
│   │   │   ├── connect-modal/
│   │   │   ├── wallet-list/
│   │   │   ├── wallet-card/
│   │   │   ├── chain-switcher/
│   │   │   ├── account-modal/
│   │   │   ├── transaction-toast/
│   │   │   ├── network-badge/
│   │   │   └── ...
│   │   └── foundation/
│   │       ├── base-element.ts
│   │       ├── slot-manager.ts
│   │       └── animation-engine.ts
│   │
│   ├── react/             # React 适配层
│   ├── vue/               # Vue 适配层
│   ├── svelte/            # Svelte 适配层
│   ├── react-native/      # React Native 原生实现
│   └── themes/            # 预设主题
│       ├── default/       # 默认深色主题
│       ├── light/         # 浅色主题
│       ├── minimal/       # 极简主题
│       └── neon/          # 赛博朋克主题
```

---

## 3. 核心组件详细设计

### 3.1 ConnectButton — 连接按钮

**功能**: 主入口按钮，显示连接状态和快捷操作

```typescript
// 组件定义
interface ConnectButtonProps {
  /** 按钮文本 (未连接时) */
  label?: string;
  
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'ghost';
  
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  
  /** 连接时显示账户信息 */
  showBalance?: boolean;
  showAvatar?: boolean;
  showNetwork?: boolean;
  
  /** 自定义样式 */
  className?: string;
  style?: CSSProperties;
  
  /** 事件回调 */
  onClick?: () => void;
  onDisconnect?: () => void;
}

// 渲染状态
enum ButtonState {
  Disconnected = 'connect',        // "Connect Wallet"
  Connecting   = 'connecting',     // 加载动画
  Connected    = 'connected',      // 显示地址/ENS + 余额
  WrongNetwork = 'wrong_network',  // "Switch Network"
  Error        = 'error',          // 错误提示
}

// 视觉设计
/*
  ┌─────────────────────────────────┐
  │  [●]  0x1a2b...3c4d    ▼        │  ← Connected 状态
  │       $1,234.56   [ETH]         │
  └─────────────────────────────────┘
  
  ┌─────────────────────────────────┐
  │         🔗 Connect Wallet        │  ← Disconnected 状态
  └─────────────────────────────────┘
*/
```

### 3.2 ConnectModal — 连接弹窗

**功能**: 核心连接界面，包含多种连接方式

```typescript
interface ConnectModalProps {
  /** 是否打开 */
  isOpen: boolean;
  
  /** 关闭回调 */
  onClose: () => void;
  
  /** 显示的连接方式 */
  views?: Array<'wallets' | 'social' | 'email' | 'scan'>;
  
  /** 默认视图 */
  defaultView?: string;
  
  /** 推荐钱包列表 (排序) */
  recommendedWallets?: WalletId[];
  
  /** 主题覆盖 */
  theme?: ThemeConfig;
}

// 弹窗布局
/*
  ┌──────────────────────────────────────────────────┐
  │  ┌────────────────────────────────────────────┐  │
  │  │               [✕]                          │  │
  │  │                                            │  │
  │  │   Connect your wallet                       │  │
  │  │                                            │  │
  │  │  ┌────────────┐  ┌────────────┐            │  │
  │  │  │  MetaMask  │  │  WalletConnect│           │  │
  │  │  │  [图标]    │  │  [图标]     │           │  │
  │  │  │  Browser   │  │  QR Code    │           │  │
  │  │  └────────────┘  └────────────┘            │  │
  │  │                                            │  │
  │  │  ┌────────────┐  ┌────────────┐            │  │
  │  │  │   Coinbase  │  │   Rabby     │           │  │
  │  │  │  [图标]    │  │  [图标]     │           │  │
  │  │  │  Wallet    │  │             │           │  │
  │  │  └────────────┘  └────────────┘            │  │
  │  │                                            │  │
  │  │  ─────── or ───────                        │  │
  │  │                                            │  │
  │  │  [📧 Email]  [🔑 Social Login]  [📱 Scan]  │  │
  │  │                                            │  │
  │  │  ───────────────────────────               │  │
  │  │  Powered by YourBrand™                     │  │
  │  └────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────┘
*/
```

### 3.3 WalletCard — 钱包卡片

```typescript
interface WalletCardProps {
  /** 钱包信息 */
  wallet: WalletInfo;
  
  /** 安装状态 */
  installed: boolean;
  
  /** 推荐标记 */
  recommended?: boolean;
  
  /** 点击处理 */
  onClick: () => void;
}

interface WalletInfo {
  id: string;
  name: string;
  icon: string;          // URL 或 data URI
  iconBackground?: string;
  description?: string;
  downloadUrl?: string;  // 未安装时的下载链接
  rdns?: string;         // EIP-6963 反向 DNS
}
```

### 3.4 ChainSwitcher — 链切换器

```typescript
interface ChainSwitcherProps {
  /** 支持的链列表 */
  chains: ChainInfo[];
  
  /** 当前链 */
  activeChainId: number;
  
  /** 切换回调 */
  onChainChange: (chainId: number) => void;
}

interface ChainInfo {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  iconUrl?: string;
  blockExplorerUrl?: string;
  testnet?: boolean;
}

// 下拉菜单
/*
  ┌────────────────────────────────┐
  │  [ETH] Ethereum        ▼      │
  └────────────┬───────────────────┘
               │
    ┌──────────┼──────────────────┐
    │ ✓  [ETH] Ethereum          │
    │    [POL] Polygon            │
    │    [BSC] BNB Chain          │
    │    [ARB] Arbitrum           │
    │    [OP]  Optimism           │
    │    [SOL] Solana             │
    └─────────────────────────────┘
*/
```

### 3.5 AccountModal — 账户管理弹窗

```typescript
interface AccountModalProps {
  /** 当前账户 */
  address: string;
  
  /** 当前链 */
  chainId: number;
  
  /** 多账户 (EIP-5749) */
  allAccounts?: AccountInfo[];
  
  /** 断开连接 */
  onDisconnect: () => void;
  
  /** 切换账户 */
  onSwitchAccount?: (address: string) => void;
  
  /** 复制地址 */
  onCopyAddress?: () => void;
  
  /** 查看浏览器 */
  onViewExplorer?: () => void;
}

// 布局
/*
  ┌──────────────────────────────────────┐
  │  [🔙]                     [⚙️ 设置]  │
  │                                      │
  │  ╔═══════════════════════════════╗   │
  │  ║   🧑 0x1a2b...3c4d          ║   │
  │  ║       $1,234.56 ETH          ║   │
  │  ║       [复制] [↗ 浏览器]       ║   │
  │  ╚═══════════════════════════════╝   │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │ 🔄 Switch Account              │  │
  │  │    0x5e6f...7g8h   $567.89    │  │
  │  │    0x9i0j...1k2l   $123.45    │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │ 🔗 Connected Apps              │  │
  │  │    Uniswap     Last: 2h ago    │  │
  │  │    OpenSea     Last: 1d ago    │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │  [🔴 Disconnect]                     │
  └──────────────────────────────────────┘
*/
```

### 3.6 TransactionToast — 交易通知

```typescript
interface TransactionToastProps {
  /** 交易哈希 */
  hash: string;
  
  /** 链 ID */
  chainId: number;
  
  /** 状态 */
  status: 'pending' | 'confirmed' | 'failed' | 'replaced';
  
  /** 确认数 */
  confirmations?: number;
  
  /** 目标确认数 */
  targetConfirmations?: number;
  
  /** 区块浏览器 URL */
  explorerUrl?: string;
  
  /** 自动关闭时间 (ms) */
  autoDismiss?: number;
}

// 状态动画
/*
  pending:    ⏳  Transaction pending... (1/12)
  confirmed:  ✅  Transaction confirmed! [↗ View]
  failed:     ❌  Transaction failed. [Retry]
  replaced:   🔄  Transaction replaced. [↗ View]
*/
```

---

## 4. 设计令牌系统 (Design Tokens)

### 4.1 Token 层级

```yaml
# 三层 Token 架构
tokens:
  # Level 1: 全局原始值 (不可覆盖)
  global:
    blue-500: "#3B82F6"
    blue-600: "#2563EB"
    gray-900: "#111827"
    gray-100: "#F3F4F6"
    spacing-4: "1rem"
    font-sans: "Inter, system-ui, sans-serif"
    
  # Level 2: 语义令牌 (可覆盖)
  semantic:
    color-brand-primary: "{global.blue-500}"
    color-brand-hover: "{global.blue-600}"
    color-bg-primary: "{global.gray-900}"
    color-text-primary: "{global.gray-100}"
    spacing-md: "{global.spacing-4}"
    font-family-body: "{global.font-sans}"
    
  # Level 3: 组件令牌 (最低优先级)
  component:
    connect-button-bg: "{semantic.color-brand-primary}"
    connect-button-text: "{semantic.color-text-primary}"
    modal-overlay: "rgba(0, 0, 0, 0.7)"
    modal-radius: "1.5rem"
```

### 4.2 主题配置

```typescript
// 主题接口
interface ThemeConfig {
  /** 色彩系统 */
  colors: {
    // 品牌色
    '--ocx-color-accent-100': string;
    '--ocx-color-accent-500': string;
    '--ocx-color-accent-600': string;
    '--ocx-color-accent-glow': string;
    
    // 背景色
    '--ocx-color-bg-primary': string;
    '--ocx-color-bg-secondary': string;
    '--ocx-color-bg-overlay': string;
    '--ocx-color-bg-card': string;
    '--ocx-color-bg-card-hover': string;
    
    // 文字色
    '--ocx-color-text-primary': string;
    '--ocx-color-text-secondary': string;
    '--ocx-color-text-tertiary': string;
    '--ocx-color-text-inverse': string;
    
    // 状态色
    '--ocx-color-success': string;
    '--ocx-color-warning': string;
    '--ocx-color-error': string;
    '--ocx-color-info': string;
    
    // 边框色
    '--ocx-color-border': string;
    '--ocx-color-border-hover': string;
  };
  
  /** 圆角 */
  radii: {
    '--ocx-radius-sm': string;
    '--ocx-radius-md': string;
    '--ocx-radius-lg': string;
    '--ocx-radius-xl': string;
    '--ocx-radius-full': string;
  };
  
  /** 阴影 */
  shadows: {
    '--ocx-shadow-sm': string;
    '--ocx-shadow-md': string;
    '--ocx-shadow-lg': string;
    '--ocx-shadow-glow': string;
  };
  
  /** 字体 */
  typography: {
    '--ocx-font-family': string;
    '--ocx-font-size-xs': string;
    '--ocx-font-size-sm': string;
    '--ocx-font-size-md': string;
    '--ocx-font-size-lg': string;
    '--ocx-font-size-xl': string;
  };
  
  /** 动画 */
  animations: {
    '--ocx-duration-fast': string;
    '--ocx-duration-normal': string;
    '--ocx-duration-slow': string;
    '--ocx-easing-default': string;
    '--ocx-easing-spring': string;
  };
}
```

### 4.3 预设主题示例

```css
/* 默认深色主题 */
.ocx-theme-default {
  --ocx-color-accent-500: #3B82F6;
  --ocx-color-accent-glow: rgba(59, 130, 246, 0.3);
  --ocx-color-bg-primary: #0F172A;
  --ocx-color-bg-card: #1E293B;
  --ocx-color-bg-card-hover: #334155;
  --ocx-color-text-primary: #F8FAFC;
  --ocx-color-text-secondary: #94A3B8;
  --ocx-color-border: #334155;
  --ocx-shadow-glow: 0 0 20px rgba(59, 130, 246, 0.3);
}

/* 浅色主题 */
.ocx-theme-light {
  --ocx-color-accent-500: #2563EB;
  --ocx-color-accent-glow: rgba(37, 99, 235, 0.15);
  --ocx-color-bg-primary: #FFFFFF;
  --ocx-color-bg-card: #F8FAFC;
  --ocx-color-bg-card-hover: #F1F5F9;
  --ocx-color-text-primary: #0F172A;
  --ocx-color-text-secondary: #64748B;
  --ocx-color-border: #E2E8F0;
  --ocx-shadow-glow: 0 0 20px rgba(37, 99, 235, 0.15);
}
```

---

## 5. 框架适配层

### 5.1 React Wrapper

```tsx
// React 组件封装
import { CinacoinProvider, ConnectButton, ConnectModal } from '@cinacoin/react';

function App() {
  return (
    <CinacoinProvider
      config={{
        projectId: 'your-project-id',
        chains: [mainnet, polygon, arbitrum],
        theme: { mode: 'dark' },
        metadata: {
          name: 'My dApp',
          description: 'My awesome dApp',
          url: 'https://mydapp.com',
          icons: ['https://mydapp.com/icon.png'],
        },
      }}
    >
      <ConnectButton />
      <ConnectModal />
    </CinacoinProvider>
  );
}

// Hook
function useCinacoin() {
  const { connectors, connect, disconnect, account, chainId, status } = useContext(CinacoinContext);
  return { connectors, connect, disconnect, account, chainId, status };
}
```

### 5.2 Vue Wrapper

```vue
<script setup>
import { CinacoinProvider } from '@cinacoin/vue'

const config = {
  projectId: 'your-project-id',
  chains: [mainnet, polygon],
  theme: { mode: 'dark' },
}
</script>

<template>
  <CinacoinProvider :config="config">
    <ocx-connect-button />
    <ocx-connect-modal />
  </CinacoinProvider>
</template>
```

### 5.3 React Native 实现

```tsx
// 原生 RN 组件 (非 Web 包装)
import { CinacoinProvider, ConnectButton, ConnectModal } from '@cinacoin/react-native';

function App() {
  return (
    <CinacoinProvider config={config}>
      <View style={styles.container}>
        <ConnectButton
          onPress={() => setShowModal(true)}
          account={account}
          balance={balance}
        />
        
        <ConnectModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          wallets={wallets}
          onWalletSelect={handleWalletSelect}
        />
      </View>
    </CinacoinProvider>
  );
}

// QR 扫码连接使用原生 Camera API
function handleWalletSelect(wallet) {
  if (wallet.type === 'qr') {
    launchCamera({
      onScan: (uri) => connectViaWalletConnect(uri),
    });
  } else if (wallet.type === 'injected') {
    connectInjected(wallet);
  }
}
```

---

## 6. 社交登录与邮箱钱包

### 6.1 社交登录架构

```
┌─────────────────────────────────────────┐
│           社交登录流程                    │
│                                         │
│  用户点击 "Google 登录"                   │
│       │                                 │
│       ▼                                 │
│  ┌─────────────┐                        │
│  │ OAuth 2.0   │  ← Google/Apple/Twitter│
│  │  认证        │                        │
│  └──────┬──────┘                        │
│         │                               │
│         ▼                               │
│  ┌─────────────┐                        │
│  │ 密钥派生     │  ← Web3Auth / 自研      │
│  │ (threshold)  │     MPC 门限签名       │
│  └──────┬──────┘                        │
│         │                               │
│         ▼                               │
│  ┌─────────────┐                        │
│  │ 智能账户创建  │  ← ERC-4337            │
│  │ (第一次登录)  │                        │
│  └──────┬──────┘                        │
│         │                               │
│         ▼                               │
│  ┌─────────────┐                        │
│  │ 会话建立     │                        │
│  └─────────────┘                        │
└─────────────────────────────────────────┘
```

### 6.2 实现方案选型

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Web3Auth** | 成熟、文档好、多 SDK | 有免费额度限制 | ⭐⭐⭐⭐ |
| **Privy** | 简单集成、嵌入式钱包 | 依赖第三方 | ⭐⭐⭐ |
| **Dynamic** | 全功能、多链 | 费用较高 | ⭐⭐⭐ |
| **自研 MPC** | 完全自主、无外部依赖 | 开发周期长 | ⭐⭐⭐⭐⭐ (长期) |

**建议**：Phase 2 使用 Web3Auth 作为过渡，Phase 3 开始自研 MPC 模块。

---

## 7. 无障碍与国际化

### 7.1 ARIA 属性

```typescript
// 所有组件实现完整的 ARIA 支持
const ConnectButton = () => (
  <button
    role="button"
    aria-label={isConnected ? `Connected as ${truncate(address)}` : 'Connect wallet'}
    aria-expanded={isModalOpen}
    aria-haspopup="dialog"
    aria-disabled={isConnecting}
  />
);
```

### 7.2 键盘导航

```
Tab / Shift+Tab  →  焦点在组件间移动
Enter / Space    →  激活当前焦点
Escape           →  关闭弹窗
Arrow Keys       →  在列表项间导航
```

### 7.3 国际化结构

```yaml
# locales/en.json
{
  "connect_wallet": "Connect Wallet",
  "connecting": "Connecting...",
  "disconnect": "Disconnect",
  "copy_address": "Copy Address",
  "copied": "Copied!",
  "switch_network": "Switch Network",
  "wrong_network": "Wrong Network",
  "no_wallet_installed": "No wallet installed",
  "install_wallet": "Install Wallet",
  "scan_qr": "Scan QR Code",
  "login_with_email": "Login with Email",
  "login_with_social": "Continue with {{provider}}"
}
```

---

## 8. 示例应用

### 8.1 Gallery (组件展示)

```
/apps/gallery
├── src/
│   ├── stories/          # Storybook stories
│   │   ├── ConnectButton.stories.tsx
│   │   ├── ConnectModal.stories.tsx
│   │   ├── ChainSwitcher.stories.tsx
│   │   └── ...
│   ├── themes/           # 主题展示页面
│   └── accessibility/    # 无障碍测试页面
```

### 8.2 Demo dApp (集成示例)

```
/apps/demo
├── src/
│   ├── App.tsx           # 主应用
│   ├── components/       # 使用 Cinacoin 组件
│   └── pages/
│       ├── Home.tsx      # 连接演示
│       ├── Swap.tsx      # Swap 演示
│       ├── NFT.tsx       # NFT 演示
│       └── MultiChain.tsx # 多链演示
```

---

## 9. Phase 2 里程碑

| 里程碑 | 时间 | 验收标准 |
|--------|------|---------|
| M2.1 | Week 1-2 | Design Token 系统完成 + 深色/浅色主题 |
| M2.2 | Week 3-4 | ConnectButton + ConnectModal Web Component |
| M2.3 | Week 5-6 | WalletList + WalletCard + ChainSwitcher |
| M2.4 | Week 7-8 | React 适配层 + Storybook Gallery |
| M2.5 | Week 9-10 | Vue + Svelte 适配层 |
| M2.6 | Week 11-12 | React Native 原生组件 + 社交登录集成 |
| M2.7 | Week 12 | 无障碍审计 + i18n 多语言包 |

---

## 10. 组件 API 一致性约定

```typescript
// 所有组件遵循统一的 Props 模式
interface BaseProps {
  /** 数据属性 */
  data?: unknown;
  
  /** 样式覆盖 */
  className?: string;
  style?: CSSProperties;
  
  /** 无障碍 */
  ariaLabel?: string;
  role?: string;
  
  /** 自定义渲染 (render prop) */
  render?: (props: RenderProps) => ReactNode;
  
  /** 数据加载状态 */
  loading?: boolean;
  
  /** 错误状态 */
  error?: Error | null;
}

// 所有组件导出类型定义
export type { ComponentNameProps } from './ComponentName';

// 所有组件支持组合使用
// <ConnectModal>
//   <ConnectModal.Wallets />
//   <ConnectModal.SocialLogin />
//   <ConnectModal.Footer>自定义底部</ConnectModal.Footer>
// </ConnectModal>
```

---

*Phase 2 Design Document v1.0 — 2026-05-16*
