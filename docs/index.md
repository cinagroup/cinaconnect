# Cinacoin — 自有品牌链上 UX 工具包

> **完全独立于 Reown/WalletConnect**，构建自有品牌的链上连接与交互工具包。

## 为什么选择 Cinacoin？

| 痛点 | Cinacoin 解决方案 |
|------|-------------------|
| Reown 商业授权费 $500-5,000/月 | 零授权费，完全自建 |
| MAU 500 上限 | 无限制 |
| 品牌露出不可控 | 白标输出，零第三方痕迹 |
| 单点故障风险 | 多 Region 部署，99.95% SLA |

## 核心能力

### 🔗 钱包连接
- **自建 Relay Server**（Rust + NATS）— WebSocket 消息中继，端到端加密
- **自建 RPC Proxy**（Go/Rust）— 多 Provider 智能路由 + 缓存 + 去重
- **EIP-6963 多钱包发现** — 自动检测已安装钱包
- **QR 码 / 注入 Provider / Push 通知** 多种连接方式

### 🎨 UI 组件库
- **Web Components** (Lit) 核心，框架无关
- **React / Vue / Svelte** 专属适配层
- **React Native** 原生实现
- **Design Token 系统** — 一键换肤，白标定制
- **WCAG 2.1 AA** 无障碍合规 + **i18n** 多语言

### 🔐 智能账户 (ERC-4337)
- **自建 Bundler** — Rust 实现，UserOp 池 + 智能打包
- **Paymaster** — Gas 赞助，多种商业模式
- **会话密钥** — 临时签名密钥，限额控制
- **社交恢复** — Guardian 机制

### 💰 支付集成
- **Swap 聚合器** — 1inch + Uniswap + 0x 最优价格
- **On-Ramp 聚合** — MoonPay / Ramp / Transak / Stripe
- **批量交易** — 一次签名，多步原子操作

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户 dApp                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ @cinacoin/  │  │ @cinacoin/  │  │ @cinacoin/  │  │
│  │   react      │  │   vue        │  │ react-native │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └─────────────────┼─────────────────┘           │
│                           │                             │
│              ┌────────────┴────────────┐                │
│              │  @cinacoin/core-sdk    │                │
│              │  @cinacoin/core-ui     │                │
│              │  @cinacoin/siwe        │                │
│              │  @cinacoin/swap-sdk    │                │
│              │  @cinacoin/paymaster   │                │
│              └──────┬──────────┬──────┘                │
│                     │          │                        │
└─────────────────────┼──────────┼────────────────────────┘
                      │          │
              ┌───────┴───┐  ┌───┴────────┐
              │ Relay     │  │ RPC Proxy  │
              │ Server    │  │ (Go/Rust)  │
              │ (Rust)    │  │            │
              └─────┬─────┘  └─────┬──────┘
                    │              │
              ┌─────┴──────────────┴──────┐
              │  NATS + Redis + 自建节点   │
              └───────────────────────────┘
```

## 快速开始

```bash
# 安装 Core SDK
npm install @cinacoin/core

# 安装 React 适配器
npm install @cinacoin/react
```

```tsx
import { Cinacoin } from '@cinacoin/core';
import { CinacoinProvider, ConnectButton } from '@cinacoin/react';

function App() {
  return (
    <CinacoinProvider
      config={{
        projectId: 'your-project-id',
        chains: [mainnet, polygon],
        relayUrl: 'wss://relay.yourdomain.com/v1',
      }}
    >
      <ConnectButton />
    </CinacoinProvider>
  );
}
```

## 路线图

```
2026 Q3 (M1-M3)          2026 Q4 (M4-M6)           2027 Q1+
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Phase 1          │     │ Phase 3          │     │ Phase 5          │
│ Relay + RPC Proxy│     │ Smart Account    │     │ 成本优化         │
│ Core SDK         │────→│ Swap + OnRamp    │────→│ 链扩展           │
│                  │     │                  │     │ 去中心化演进     │
│ Phase 2          │     │ Phase 4          │     │                  │
│ UI 组件库        │     │ 生产部署         │     │                  │
│ 多框架适配       │     │ 监控告警         │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## 文档导航

| 文档 | 说明 |
|------|------|
| [📖 快速开始](/guide/quick-start) | 5 分钟上手指南 |
| [📦 安装](/guide/installation) | 各框架安装说明 |
| [⚙️ 配置](/guide/configuration) | 完整配置选项 |
| [🔌 Core SDK API](/api/core-sdk) | 核心 SDK 参考 |
| [🎨 UI 组件 API](/api/ui-components) | 组件参考 |
| [🔐 SIWE API](/api/siwe) | 签名认证参考 |
| [📱 Mobile SDK](/api/mobile) | 移动端参考 |
| [💻 Web 示例](/examples/web) | 完整 Web 示例 |
| [📲 React Native 示例](/examples/react-native) | 移动端示例 |
| [🍎 iOS 示例](/examples/ios) | iOS 原生示例 |
| [🤖 Android 示例](/examples/android) | Android 原生示例 |
| [🛡️ 安全最佳实践](/security/best-practices) | 安全指南 |
| [❓ FAQ](/faq) | 常见问题 |
