# 快速开始 — 图文指南 / Quick Start Visual Guide

> 🎯 本文档提供 Cinacoin 的快速上手指南，包含分步截图说明和常见问题排查。

## 📸 连接流程概览

### Step 1: 安装 Cinacoin

```bash
npm install @cinacoin/core @cinacoin/react
# 或
pnpm add @cinacoin/core @cinacoin/react
```

### Step 2: 配置 Provider

在你的 React 应用中包裹 `CinacoinProvider`：

```tsx
import { CinacoinProvider } from '@cinacoin/react'

function App() {
  const config = {
    projectId: 'your-walletconnect-project-id', // ← 在 cloud.walletconnect.com 获取
    chains: [
      {
        id: 1,
        name: 'Ethereum',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrl: 'https://eth.llamarpc.com',
      },
    ],
    metadata: {
      name: 'My dApp',
      description: 'My Cinacoin powered dApp',
      url: 'https://mydapp.com',
      icons: [],
    },
  }

  return (
    <CinacoinProvider config={config}>
      <YourApp />
    </CinacoinProvider>
  )
}
```

### Step 3: 添加连接按钮

```tsx
import { ConnectButton, useCinacoin } from '@cinacoin/react'

function MyComponent() {
  const { account, status } = useCinacoin()

  return (
    <div>
      <ConnectButton variant="primary" size="lg" showBalance />
      {account && <p>已连接: {account}</p>}
    </div>
  )
}
```

---

## 🔗 连接流程详解

### 流程图

```
用户点击 ConnectButton
        ↓
弹出 ConnectModal
        ↓
用户选择钱包 (MetaMask / WalletConnect / Rabby...)
        ↓
┌─────────────────────┐
│  Injected Wallet?    │──是──→ 直接请求签名 (window.ethereum)
│  WalletConnect?      │──是──→ 生成 QR 码 / Deep Link
│  WalletConnect?      │──是──→ 生成 QR 码 / Deep Link
└─────────────────────┘
        ↓
用户确认连接 (钱包弹窗)
        ↓
获取账户地址 + 余额
        ↓
onConnected 事件触发
```

### 钱包连接方式

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| **Injected** | 桌面浏览器 + 钱包插件 | 检测 `window.ethereum`，EIP-6963 自动发现 |
| **WalletConnect QR** | 移动端钱包扫描 | 生成 WC v2 URI，用户用钱包 App 扫描 |
| **WalletConnect Deep Link** | 移动端 | 自动跳转钱包 App (iOS/Android) |
| **WalletConnect 弹窗** | 桌面端扫码 | 在网页上显示 QR 码，用户用手机钱包扫描 |

---

## 🖥️ 功能模块演示

### 1. 钱包连接 (ConnectDemo)

- **ConnectButton**: 一键连接/断开，显示余额和网络
- **ConnectModal**: 弹窗选择钱包，支持 QR 码和 WalletConnect
- **EIP-6963**: 自动发现所有已安装的浏览器钱包插件

```
┌─────────────────────────────┐
│  🔗 连接钱包          🔷 3.5 │
│       ETH           主网     │
└─────────────────────────────┘
```

### 2. Swap 交易 (SwapDemo)

- 通过 `@cinacoin/swap-sdk` 获取真实报价
- 支持 Uniswap / 1inch / 0x 多源聚合
- 实时签名并提交链上交易

```
┌─────────────────────────────┐
│  From: 1.0 WETH             │
│        ⬇️                    │
│  To:   3000.00 USDC         │
│                             │
│  Provider: Uniswap V3       │
│  Price Impact: 0.12%        │
│  Gas: ~0.003 ETH            │
│                             │
│  [ Swap 1.0 WETH ]          │
└─────────────────────────────┘
```

### 3. 多链切换 (MultiChainDemo)

- 跨链余额实时查询 (通过 JSON-RPC)
- 一键切换网络 (通过钱包的 `wallet_switchEthereumChain`)
- 多链资产总览

### 4. SIWE 认证 (AuthDemo)

- 标准 EIP-4361 SIWE 消息生成
- 钱包签名验证
- 后端 JWT Session 管理

---

## ❓ 常见问题排查

### Q1: 连接钱包没有反应

**原因**: 未检测到 `window.ethereum`

**解决方案**:
1. 确认已安装 MetaMask 或其他 Web3 钱包插件
2. 检查浏览器控制台是否有错误
3. 尝试使用 WalletConnect QR 码连接

### Q2: WalletConnect 连接失败

**原因**: Project ID 无效或网络问题

**解决方案**:
1. 前往 [WalletConnect Cloud](https://cloud.walletconnect.com) 创建项目并获取 Project ID
2. 在配置中设置正确的 `projectId`:
   ```tsx
   const config = {
     projectId: 'YOUR_REAL_PROJECT_ID', // ← 不要使用 demo 值
     // ...
   }
   ```
3. 检查网络防火墙是否阻塞了 `wss://relay.walletconnect.com`

### Q3: Swap 报价获取失败

**原因**: 未配置 DEX API Key 或网络不可达

**解决方案**:
1. 设置环境变量:
   ```bash
   VITE_ONEINCH_API_KEY=your-key
   VITE_ZEROX_API_KEY=your-key
   ```
2. 未配置 API Key 时，SDK 会自动回退到 Uniswap 单源报价
3. 确认当前连接的钱包在正确的网络上 (Mainnet 用于 ETH 代币)

### Q4: SIWE 签名失败

**原因**: 用户拒绝了签名请求或消息格式有误

**解决方案**:
1. 确保 SIWE 消息符合 EIP-4361 规范
2. 使用 `siwe` 包生成消息:
   ```tsx
   import { SiweMessage } from 'siwe'
   const message = new SiweMessage({ domain, address, ... })
   const prepared = message.prepareMessage()
   ```
3. 确保后端使用相同方式验证签名

### Q5: 多链余额显示错误

**原因**: RPC 节点不可达或账户在该链上无余额

**解决方案**:
1. 检查 RPC 端点是否可用:
   ```bash
   curl -X POST https://eth.llamarpc.com -d '{"method":"eth_chainId","params":[],"id":1}'
   ```
2. 使用备用 RPC:
   ```tsx
   const rpcUrl = 'https://cloudflare-eth.com' // 备用
   ```
3. 余额为 0 是正常的，确保账户在对应链上有资金

---

## 🚀 快速部署

### Vercel

```bash
cd examples/web
vercel deploy
```

### GitHub Pages

```bash
# 在 .github/workflows/docs.yaml 中已配置
# 推送到 main 分支自动部署
git push origin main
```

### Docker

```bash
docker build -f deploy/docker/core-ui/Dockerfile -t cinacoin:demo .
docker run -p 3000:80 cinacoin:demo
```

---

## 📞 获取帮助

- 📖 完整文档: [docs.cinacoin.com](https://cinacoin.github.io/cinacoin/)
- 💬 社区讨论: [GitHub Discussions](https://github.com/cinacoin/cinacoin/discussions)
- 🐛 报告 Bug: [GitHub Issues](https://github.com/cinacoin/cinacoin/issues)
- 📧 联系团队: <support@cinacoin.com>
