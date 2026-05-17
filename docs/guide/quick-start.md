# 快速开始

> 5 分钟从零到钱包连接。

## 前置条件

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x / **pnpm** ≥ 8.x / **yarn** ≥ 1.22.x
- 已部署的 **Relay Server** 地址（或使用公共测试节点）

## 第一步：安装

```bash
# 创建项目（如已有则跳过）
npm create vite@latest my-dapp -- --template react-ts
cd my-dapp

# 安装 CinaConnect
npm install @cinaconnect/core @cinaconnect/react
```

## 第二步：初始化

在应用入口创建 `CinaConnect` 实例：

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinaConnectProvider } from '@cinaconnect/react'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinaConnectProvider
      config={{
        // 项目标识（用于 analytics 和会话管理）
        projectId: 'your-project-id',
        // 自建 Relay 地址
        relayUrl: 'wss://relay.yourdomain.com/v1',
        // 支持的链
        chains: [
          {
            id: 1,
            name: 'Ethereum',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrl: 'https://rpc.yourdomain.com/eth',
          },
          {
            id: 137,
            name: 'Polygon',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrl: 'https://rpc.yourdomain.com/polygon',
          },
        ],
        // 应用元数据
        metadata: {
          name: 'My dApp',
          description: 'My awesome decentralized application',
          url: 'https://mydapp.com',
          icons: ['https://mydapp.com/icon.png'],
        },
      }}
    >
      <App />
    </CinaConnectProvider>
  </React.StrictMode>,
)
```

## 第三步：添加连接按钮

```tsx
// src/App.tsx
import { ConnectButton } from '@cinaconnect/react'

function App() {
  return (
    <div>
      <h1>My dApp</h1>
      <ConnectButton />
    </div>
  )
}

export default App
```

## 第四步：运行

```bash
npm run dev
```

打开浏览器，点击 **Connect Wallet** 按钮，选择钱包即可完成连接。

## 使用 Hook 获取状态

```tsx
import { useCinaConnect } from '@cinaconnect/react'

function WalletInfo() {
  const { account, chainId, status, connectors, connect, disconnect } = useCinaConnect()

  if (status === 'disconnected') {
    return <p>未连接</p>
  }

  return (
    <div>
      <p>账户: {account}</p>
      <p>链 ID: {chainId}</p>
      <button onClick={() => disconnect()}>断开连接</button>
    </div>
  )
}
```

## 下一步

- [安装指南](/guide/installation) — 各框架详细安装说明
- [配置选项](/guide/configuration) — 完整配置参考
- [Web 示例](/examples/web) — 包含 Swap、多链、认证的完整示例
