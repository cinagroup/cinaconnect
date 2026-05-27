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

# 安装 Cinacoin
npm install @cinacoin/core @cinacoin/react
```

## 第二步：初始化

在应用入口创建 `Cinacoin` 实例：

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { CinacoinProvider } from '@cinacoin/react'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CinacoinProvider
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
    </CinacoinProvider>
  </React.StrictMode>,
)
```

## 第三步：添加连接按钮

```tsx
// src/App.tsx
import { ConnectButton } from '@cinacoin/react'

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
import { useCinacoin } from '@cinacoin/react'

function WalletInfo() {
  const { account, chainId, status, connectors, connect, disconnect } = useCinacoin()

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

## 真实钱包连接示例

### 连接 MetaMask

```tsx
import { useConnect, useAccount } from '@cinacoin/react'

function MetaMaskConnect() {
  const { connect, status } = useConnect()
  const account = useAccount()

  if (account.address) {
    return (
      <div>
        <p>✅ Connected: <code>{account.address}</code></p>
        <p>Balance: {account.balance} {account.chainSymbol}</p>
      </div>
    )
  }

  return (
    <button
      onClick={() => connect('metamask')}
      disabled={status === 'connecting'}
    >
      {status === 'connecting' ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  )
}
```

### 连接 WalletConnect (扫码)

```tsx
import { useConnect } from '@cinacoin/react'

function WalletConnectButton() {
  const { connect } = useConnect()

  return (
    <button onClick={() => connect('walletconnect')}>
      📱 WalletConnect (QR Code)
    </button>
  )
}
```

### 连接 Coinbase Wallet

```tsx
import { useConnect } from '@cinacoin/react'

function CoinbaseButton() {
  const { connect } = useConnect()

  return (
    <button onClick={() => connect('coinbase')}>
      🪙 Coinbase Wallet
    </button>
  )
}
```

### EIP-6963 自动发现钱包

```tsx
import { useEffect, useState } from 'react'
import { discoverWallets, watchWallets } from '@cinacoin/core-sdk'
import { useConnect } from '@cinacoin/react'

function AutoDetectWallets() {
  const { connect } = useConnect()
  const [wallets, setWallets] = useState<any[]>([])

  useEffect(() => {
    // Discover existing wallets
    discoverWallets().then(setWallets)

    // Watch for new wallets appearing
    const unwatch = watchWallets((detail) => {
      if (detail.type === 'announce') {
        setWallets(prev => [...prev, detail])
      }
    })

    return unwatch
  }, [])

  return (
    <div>
      <h3>Detected Wallets</h3>
      {wallets.map((w, i) => (
        <button key={i} onClick={() => connect(w.info.rdns)}>
          {w.info.name}
        </button>
      ))}
    </div>
  )
}
```

### 低层级 SDK 直连（无 React）

```ts
import { Connector, InjectedProvider, EvmAdapter } from '@cinacoin/core-sdk'

async function connectWallet() {
  const connector = new Connector({
    projectId: 'your-project-id',
    relayUrl: 'wss://relay.cinacoin.com/v1',
  })

  // 通过注入提供商连接（MetaMask）
  const provider = new InjectedProvider()
  const result = await connector.connect({
    provider,
    chainId: 1,
  })

  console.log('Connected:', result.accounts[0])
  console.log('Chain ID:', result.chainId)
  console.log('Session:', result.sessionId)

  // 签名消息
  const signature = await connector.request({
    method: 'personal_sign',
    params: ['Hello Cinacoin!', result.accounts[0]],
  })

  console.log('Signature:', signature)
  return result
}
```

## 完整示例文档

- [Ethereum 连接](/examples/ethereum) — MetaMask、WalletConnect、Coinbase 完整示例
- [Solana 连接](/examples/solana) — Phantom、Solflare 钱包连接
- [Bitcoin 连接](/examples/bitcoin) — Unisat、Xverse、Leather 钱包连接
- [多链切换](/examples/multi-chain) — EVM / Solana / Bitcoin 多链支持
- [SIWE 认证](/examples/siwe-auth) — Sign-In With Ethereum (EIP-4361)
- [EIP-5792 批量交易](/examples/eip5792-batch) — 原子批量交易
- [React Hooks 集成](/examples/react-integration) — 全部 React Hooks 详解
- [Next.js App Router](/examples/nextjs) — Next.js 集成指南
- [.NET SDK](/examples/dotnet) — C# 客户端使用示例
- [Web 示例](/examples/web) — 包含 Swap、多链、认证的完整示例

## 下一步

- [安装指南](/guide/installation) — 各框架详细安装说明
- [配置选项](/guide/configuration) — 完整配置参考
- [故障排除](/guide/troubleshooting) — 常见问题解决方案
