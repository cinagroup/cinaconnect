# Web 示例

> 完整的 Web dApp 示例，展示 Cinacoin 核心功能。

本示例包含：钱包连接、Swap 演示、多链切换、SIWE 认证等完整功能。

## 目录结构

```
examples/web/
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── main.tsx                    # 入口点
│   ├── components/
│   │   ├── ConnectDemo.tsx         # 连接按钮演示
│   │   ├── SwapDemo.tsx            # Swap 演示
│   │   ├── MultiChainDemo.tsx      # 多链演示
│   │   └── AuthDemo.tsx            # SIWE 认证演示
└── README.md
```

## 运行示例

```bash
cd examples/web
npm install
npm run dev
```

访问 `http://localhost:5173` 查看演示。

## 功能演示

### 1. 连接演示 (`ConnectDemo`)

展示 ConnectButton、ConnectModal、WalletList 的基本使用。

- 显示已安装钱包
- 扫码连接（QR Code）
- 连接状态显示

### 2. Swap 演示 (`SwapDemo`)

展示 Swap 聚合器 UI。

- Token 选择器
- 价格获取和显示
- 滑点设置
- 交易确认

### 3. 多链演示 (`MultiChainDemo`)

展示多链支持和切换。

- ChainSwitcher 组件
- 跨链余额显示
- 网络切换动画

### 4. 认证演示 (`AuthDemo`)

展示 SIWE 登录流程。

- 生成 SIWE 消息
- 钱包签名
- 后端验证
- Session 管理

## 核心代码示例

```tsx
// src/main.tsx — 入口点
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinacoinProvider } from '@cinacoin/react'
import { ConnectDemo } from './components/ConnectDemo'
import { SwapDemo } from './components/SwapDemo'
import { MultiChainDemo } from './components/MultiChainDemo'
import { AuthDemo } from './components/AuthDemo'

const config = {
  projectId: import.meta.env.VITE_PROJECT_ID || 'demo-project-id',
  relayUrl: import.meta.env.VITE_RELAY_URL || 'wss://relay.cinacoin.com/v1',
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://rpc.cinacoin.com/eth',
    },
    {
      id: 137,
      name: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrl: 'https://rpc.cinacoin.com/polygon',
    },
    {
      id: 42161,
      name: 'Arbitrum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://rpc.cinacoin.com/arbitrum',
    },
  ],
  metadata: {
    name: 'Cinacoin Demo',
    description: 'Cinacoin Web Example',
    url: window.location.origin,
    icons: [],
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinacoinProvider config={config}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <h1>Cinacoin Web Demo</h1>

        <section>
          <h2>1. Wallet Connection</h2>
          <ConnectDemo />
        </section>

        <section>
          <h2>2. Swap</h2>
          <SwapDemo />
        </section>

        <section>
          <h2>3. Multi-Chain</h2>
          <MultiChainDemo />
        </section>

        <section>
          <h2>4. SIWE Auth</h2>
          <AuthDemo />
        </section>
      </div>
    </CinacoinProvider>
  </React.StrictMode>,
)
```

## 相关文档

- [Core SDK API](/api/core-sdk)
- [UI Components API](/api/ui-components)
- [SIWE API](/api/siwe)
- [快速开始](/guide/quick-start)
