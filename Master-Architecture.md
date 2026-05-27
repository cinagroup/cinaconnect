# 自有品牌链上 UX 工具包 — 总体架构设计

> **项目代号**: Cinacoin  
> **目标**: 完全独立于 Reown/WalletConnect 基础设施，构建自有品牌的链上连接与交互工具包  
> **日期**: 2026-05-16  
> **版本**: v1.0

---

## 1. 项目背景

### 1.1 问题陈述

Reown AppKit（原 WalletConnect/Web3Modal）是当前最主流的 Web3 连接工具包，但其 Community License 存在以下约束：

| 约束项 | 限制值 | 商业影响 |
|--------|--------|---------|
| 月活用户 (MAU) | ≤ 500 | 无法支撑商业产品 |
| 月 RPC 调用 | ≤ 2,500,000 | 高活跃 dApp 必然超限 |
| 强制连接 Reown Relay | 不可绕过 | 存在单点依赖和停服风险 |
| 修改 IP 归属 Reown | §1(c) | 无法拥有自有代码 IP |

### 1.2 设计原则

1. **法律合规**：仅使用公开标准（EIP 系列）和 MIT/Apache 开源组件
2. **完全自主**：不依赖 Reown 任何专有基础设施
3. **多链优先**：架构从第一天起支持多链
4. **渐进迁移**：允许从 AppKit 平滑迁移，而非一刀切
5. **成本可控**：自建基础设施成本远低于商业授权费用

---

## 2. 总体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        自有品牌 dApp 前端                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 连接弹窗  │ │ 钱包列表  │ │ 链切换器  │ │ 状态管理  │            │
│  │ (UI)     │ │ (UI)     │ │ (UI)     │ │ (Store)  │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       └────────────┴────────────┴────────────┘                   │
│                          │                                       │
├──────────────────────────┼───────────────────────────────────────┤
│                    核心 SDK 层 (自有)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 连接器    │ │ 会话管理  │ │ 多链适配  │ │ 签名引擎  │            │
│  │ Connector │ │ Session  │ │ Adapter  │ │ Signer   │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       └────────────┴────────────┴────────────┘                   │
│                          │                                       │
├──────────────────────────┼───────────────────────────────────────┤
│                    传输与代理层 (自建)                              │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  自有 Relay 网关   │  │  自有 RPC 代理    │                     │
│  │  (WebSocket)     │  │  (HTTP/JSON-RPC) │                     │
│  └────────┬─────────┘  └────────┬─────────┘                     │
│           │                     │                                │
├───────────┼─────────────────────┼───────────────────────────────┤
│           │                     │                                │
│  ┌────────┴─────────┐  ┌───────┴────────┐                       │
│  │ 区块链全节点集群    │  │ 公共 RPC 提供商  │                       │
│  │ Geth / Erigon    │  │ Alchemy/Infura │                       │
│  │ Geth / Erigon    │  │ Ankr/QuickNode │                       │
│  └──────────────────┘  └────────────────┘                       │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  钱包客户端        │  │ 智能账户层        │                     │
│  │ MetaMask/Rabby  │  │ ERC-4337 Bundler │                       │
│  │ WalletConnect   │  │ Paymaster        │                       │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 技术栈选型

| 层级 | 组件 | 选型 | 许可证 |
|------|------|------|--------|
| 前端 SDK | 核心框架 | TypeScript + Vite | MIT |
| 状态管理 | Store | Zustand | MIT |
| 链交互 | EVM | viem | MIT |
| 链交互 | React Hooks | wagmi | MIT |
| 连接协议 | WC v2 兼容 | 开源 @walletconnect/* (MIT) | MIT |
| UI 框架 | Web 组件 | Lit / React | MIT |
| 多语言 SDK | iOS | Swift (SPM) | MIT |
| 多语言 SDK | Android | Kotlin (Maven) | MIT |
| 多语言 SDK | Flutter | Dart (pub.dev) | MIT |
| 多语言 SDK | Rust | Rust (crates.io) | MIT |
| Relay 后端 | 消息路由 | Rust (Actix-web) | MIT |
| Relay 后端 | 消息队列 | Redis + NATS | BSD-3 / Apache |
| RPC 代理 | 反向代理 | Envoy Proxy | Apache |
| RPC 代理 | 缓存层 | Redis Cluster | BSD-3 |
| 基础设施 | 容器编排 | Kubernetes | Apache |
| 基础设施 | CI/CD | GitHub Actions | MIT |
| 监控 | 指标采集 | Prometheus + Grafana | Apache |

---

## 4. Phase 路线图

| Phase | 时间 | 核心目标 | 产出物 |
|-------|------|---------|--------|
| **Phase 1** | M1-M2 | 自建 Relay + RPC 代理 | relay-server, rpc-proxy, 基础 SDK |
| **Phase 2** | M2-M4 | 自有品牌 UI 组件库 | @cinacoin/ui 组件库 + 示例 |
| **Phase 3** | M4-M5 | 智能账户 + 支付集成 | Bundler, Paymaster, Swap/OnRamp |
| **Phase 4** | M5-M6 | 生产部署与监控 | K8s manifests, Runbook, SLA 报告 |
| **Phase 5** | M6+ | 成本优化与链扩展 | 性能调优报告, 新链适配器 |

---

## 5. 核心协议与标准

### 5.1 EIP 标准依赖

| EIP | 名称 | 用途 |
|-----|------|------|
| EIP-1193 | Ethereum Provider API | 钱包 Provider 接口标准 |
| EIP-6963 | Multi Injected Provider Discovery | 多钱包自动发现 |
| EIP-4361 | Sign-In with Ethereum (SIWE) | 身份认证 |
| EIP-4337 | Account Abstraction | 智能账户 |
| EIP-712 | Typed Structured Data Hashing | 签名格式化 |
| EIP-155 | Replay-Protected Transactions | 链 ID 标准 |

### 5.2 WalletConnect v2 协议理解

WalletConnect v2 核心协议是**开放的**，其关键组件：

| 组件 | 开放性 | 说明 |
|------|--------|------|
| Pairing Protocol | ✅ 开放 | 基于 BIP-341 的密钥协商 |
| Relay Protocol | ⚠️ 受控 | 协议公开，但官方 Relay 由 Reown 运营 |
| JSON-RPC Methods | ✅ 开放 | eth_sendTransaction 等标准方法 |
| Crypto Primitives | ✅ 开放 | X25519 密钥交换、ChaCha20-Poly1305 加密 |

**关键洞察**：我们可以使用开源的密码学模块和协议实现，仅替换 Relay 端点为自建服务。

---

## 6. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Reown 法律行动 | 高 | 低 | 完全独立实现，不使用任何 Reown 专有代码 |
| 自建 Relay 延迟 | 中 | 中 | 多 Region 部署 + WebSocket 优化 |
| RPC 成本超预算 | 中 | 中 | 缓存层 + 自建节点 + 免费额度优化 |
| 钱包兼容性问题 | 高 | 中 | 全面 EIP-1193 兼容测试 + 降级策略 |
| 智能账户安全 | 高 | 低 | 审计 + 多签名 + 限额 |

---

## 7. 文档索引

| 文档 | 说明 |
|------|------|
| `phase-1-relay-rpc.md` | 自建 Relay + RPC 代理详细设计 |
| `phase-2-ui-components.md` | 自有品牌 UI 组件库详细设计 |
| `phase-3-smart-account.md` | 智能账户 + 支付集成详细设计 |
| `phase-4-production.md` | 生产部署与监控详细设计 |
| `phase-5-optimization.md` | 成本优化与链扩展详细设计 |

---

*Cinacoin Architecture v1.0 — 2026-05-16*
