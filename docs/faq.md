# FAQ

> 关于 Cinacoin 的常见问题。

## 入门

### Cinacoin 和 Reown/WalletConnect 有什么区别？

Cinacoin 是**完全自建**的链上 UX 工具包，不依赖 Reown/WalletConnect 的任何基础设施。核心区别：

| | Reown/WalletConnect | Cinacoin |
|--|---------------------|-----------|
| 基础设施 | 第三方托管 | 自建 Relay + RPC Proxy |
| 品牌 | Reown 品牌露出 | 白标，零第三方痕迹 |
| 费用 | $500-5,000/月 | 仅基础设施成本 |
| MAU 限制 | 500 (免费层) | 无限制 |
| 可控性 | 依赖第三方 | 完全自主 |

### 支持哪些链？

Cinacoin 采用**链适配器架构**，理论上支持任何区块链。目前已实现/计划支持：

- ✅ **EVM 链**：Ethereum, Polygon, Arbitrum, Optimism, BSC 等
- 🔜 **Solana**
- 🔜 **Bitcoin** (通过 BRC-20/Ordinals)
- 🔜 **Tron**

### 是否需要 Rust 开发经验？

不需要。对于 dApp 开发者，只需使用 TypeScript SDK (`@cinacoin/core`)。Rust 仅用于自建 Relay Server 和 RPC Proxy，如果你使用公共 Relay 则不需要。

## 安装

### 可以在 Next.js 项目中使用吗？

可以。Cinacoin 完全兼容 Next.js (App Router 和 Pages Router)：

```tsx
// app/providers.tsx
'use client'
import { CinacoinProvider } from '@cinacoin/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <CinacoinProvider config={config}>{children}</CinacoinProvider>
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 支持 React 19 吗？

支持。`@cinacoin/react` 兼容 React 18+ 和 React 19。

### Vue 3 支持吗？

支持。安装 `@cinacoin/vue` 即可：

```bash
npm install @cinacoin/core @cinacoin/vue
```

## 功能

### 是否支持 WalletConnect 协议？

Cinacoin 实现了与 WalletConnect v2 协议**兼容**的 WebSocket 中继和加密协议，但使用自建基础设施。这意味着：

- ✅ 兼容现有钱包 App 的连接协议
- ❌ 不依赖 Reown 的 Relay 服务

### 社交登录怎么工作？

Phase 2 使用 **Web3Auth** 作为过渡方案，Phase 3 开始自研 MPC 模块：

1. 用户点击 "Google 登录"
2. OAuth 2.0 认证获取 Google 身份
3. 通过阈值签名派生钱包地址
4. 首次登录创建智能账户 (ERC-4337)
5. 后续登录自动恢复

### Gas 赞助怎么运作？

通过自建 **Paymaster** 合约实现多种赞助模式：

- **免费额度**：每用户每日 N 次免费交易
- **Token 支付**：用任意 ERC-20 Token 支付 Gas
- **赞助商模式**：dApp 为用户支付 Gas
- **分层订阅**：付费会员享受免费 Gas

## 部署

### 如何自建 Relay Server？

Relay Server 使用 Rust + Actix-web + NATS 构建：

```bash
git clone https://github.com/cinacoin/cinacoin
cd packages/relay-server
cargo build --release
cargo run -- --config config.toml
```

或使用 Docker：

```bash
docker run -p 8080:8080 ghcr.io/cinacoin/relay-server:latest
```

### 可以用公共 Relay 吗？

可以。使用我们提供的公共测试节点：

```typescript
const config = {
  relayUrl: 'wss://relay.cinacoin.com/v1',
  projectId: 'your-project-id',
  // ...
}
```

**注意**：公共节点仅供测试，生产环境建议自建。

## 安全

### Relay 能看到我的私钥吗？

**不能**。Relay 仅做消息路由，**不解密**消息内容。加密在 dApp 和钱包之间端到端完成（X25519 + ChaCha20-Poly1305）。

### 是否经过安全审计？

Cinacoin 各组件在生产部署前会经过独立第三方安全审计。审计报告模板见 [审计报告](/security/audit-report)。

### 如果 Relay 被攻击怎么办？

1. Relay 不持有用户密钥或资金
2. 即使 Relay 被攻陷，攻击者只能看到加密消息（无法解密）
3. 多 Region 部署 + 故障切换保证可用性

## 其他

### 开源协议是什么？

MIT License。完全开源，可商用。

### 如何贡献？

见 [CONTRIBUTING.md](https://github.com/cinacoin/cinacoin/blob/main/CONTRIBUTING.md)。

### 有 Roadmap 吗？

有的，见 [README.md](https://github.com/cinacoin/cinacoin) 中的路线图总览。

### 如何联系团队？

- GitHub Issues: [cinacoin/cinacoin](https://github.com/cinacoin/cinacoin/issues)
- 邮件: `team@cinacoin.com`
