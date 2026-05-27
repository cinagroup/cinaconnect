# RainbowKit vs Cinacoin — 详细对比

> **⚠️ Honest Status (2026-05-18):** **64/64 packages built** with dist/ directories. 1 package published to npm (`@cinacoin/core-sdk`). **104+ test files**. **53 commits**. Features listed below are built but most are **not yet published to npm**. Swap/Onramp SDK packages require **external API keys** (DEX aggregator, Meld/Coinbase Pay) to function. The demo app UI is functional but **wallet connections, swaps, auth, and social logins are mock implementations** — they do not connect to real wallets or execute real transactions. See [HONEST_AUDIT_V3.md](./HONEST_AUDIT_V3.md) for a detailed honest audit.

## 📊 核心数据对比

| 指标 | RainbowKit | Cinacoin | 构建状态 |
|------|-----------|-------------|----------|
| **GitHub** | [rainbow-me/rainbowkit](https://github.com/rainbow-me/rainbowkit) | [cinagroup/cinacoin](https://github.com/cinagroup/cinacoin) | — |
| **核心包数** | **3** (rainbowkit, rainbow-button, create-rainbowkit) | **64/64 已构建** (1 个已发布到 npm) | 64/64 built vs RainbowKit's 3 packages |
| **源码文件** | ~248 个 TS/TSX 文件 | ~700+ 个 TS/TSX/JS/Dart 文件 | 核心适配器 exports 被注释 |
| **框架支持** | **React 独占** (wagmi 生态) | **11 框架已构建**: React/Vue/Svelte/Next/Nuxt/RN/Flutter/Android/iOS/Unity/Angular | RN/Flutter 需原生实现；其余已构建 |
| **依赖链** | wagmi → viem → 强耦合 | 自研 core-sdk → 零外部依赖 | 零依赖 ✅ |

---

## 🔗 链支持对比

| 指标 | RainbowKit | Cinacoin | 构建状态 |
|------|-----------|-------------|----------|
| **链数量** | ~35 条 (EVM only) | **16 条链架构设计** (7+ 个 adapter 已构建，链适配器在 core-sdk exports 中仍被注释) | 仅 EVM 基础可用（适配器需启用） |
| **EVM 链** | ✅ 全部 | ✅ 设计支持 ETH, Polygon, Arbitrum, Base, Optimism, BSC | 已构建，未测试 |
| **Solana** | ❌ | ✅ 设计支持 Phantom, Solflare, Backpack | 已构建 |
| **Bitcoin** | ❌ | ✅ 设计支持 Unisat, Leather, Xverse, OKX | 已构建 |
| **TON** | ❌ | ✅ 设计支持 Tonkeeper, OpenMask | 已构建 |
| **TRON** | ❌ | ✅ 设计支持 TronLink, TronPay | 已构建 |
| **Cosmos** | ❌ | ✅ 设计支持 Keplr, Leap | 已构建 |
| **Sui** | ❌ | ✅ 设计支持 Sui Wallet, Ethos, Suiet | 已构建 |
| **Starknet** | ❌ | ✅ 设计支持 Argent X, Braavos | 已构建 |
| **NEAR** | ❌ | ✅ 设计支持 NEAR Wallet, Here Wallet | 已构建 |
| **Hedera** | ❌ | ✅ 设计支持 HashPack, Blade | 已构建 |
| **XRPL** | ❌ | ✅ 设计支持 Xaman | 已构建 |
| **跨链桥** | ❌ | ✅ 仅 session sync 层，无真实跨链桥 | 已构建 — 仅同步层 |

**关键差异**: RainbowKit **仅支持 EVM 链**（约 35 条，全部已构建测试）。Cinacoin **架构设计覆盖 16 条跨链协议**（EVM + Solana + Bitcoin + TON + TRON + Cosmos + Sui + Starknet + NEAR + Hedera + XRPL），7+ 个 adapter 已构建，链适配器在 core-sdk 中被注释掉，当前实际可用的只有 core-sdk 内置的 EVM 基础支持。

---

## 💰 钱包支持对比

| 指标 | RainbowKit | Cinacoin | 构建状态 |
|------|-----------|-------------|----------|
| **钱包数量** | **75+** (实际连接可用) | **30+** (已构建，**未实际连接测试**) | 已构建 |
| **内置钱包连接器** | MetaMask, WalletConnect, Coinbase, Rainbow, Safe, Phantom, Ledger, Trust, OKX, Brave, Frame, Zerion 等 75+ | MetaMask, WalletConnect, Coinbase, Rainbow, Phantom, Trust, Ledger, Xverse, Tonkeeper, TronLink, Keplr, Argent X 等 30+ | ✅ 已构建 |
| **EIP-6963** | ✅ | ✅ | ✅ 已构建 |
| **Bitcoin 钱包** | ❌ | ✅ 设计 6 个原生连接器 | 已构建 |
| **Solana 钱包** | ❌ (仅 EVM) | ✅ 设计 4 个原生连接器 | 已构建 |
| **TON 钱包** | ❌ | ✅ |
| **移动端 Deep Link** | ⚠️ 仅 WalletConnect | ✅ 8 钱包深度链接 |

**关键差异**: RainbowKit 钱包数量多但**仅限 EVM**，且**全部经过实际连接测试**。Cinacoin 架构覆盖所有链协议 — 30+ wallet connectors **已构建，未进行连接测试**。Demo app 的 WalletModal 是 **纯 mock UI**，不连接真实钱包。

---

## 🏗️ 架构对比

| 维度 | RainbowKit | Cinacoin |
|------|-----------|-------------|
| **定位** | React 钱包连接 UI 组件库 | **全栈钱包连接基础设施架构** (开发中) |
| **核心依赖** | wagmi + viem + react-query | 自研 core-sdk (零外部依赖) |
| **自托管** | ❌ 依赖 Rainbow 增强 RPC | ✅ **完全自托管** |
| **RPC** | 使用 enhanced-provider.rainbow.me | ✅ 自建 RPC Proxy |
| **后端服务** | ❌ 无后端 | ✅ Relay Server + Keys Server + Notify Server |
| **数据库** | ❌ | ✅ D1 / PostgreSQL |
| **CDN 分发** | npm only | npm + CDN bundle |
| **部署方式** | npm 包 → 前端引入 | Cloudflare Workers + Pages + Docker |

**关键差异**: RainbowKit 只是一个 **前端 UI 组件库**，依赖 wagmi + viem + Rainbow RPC。Cinacoin 是**完整基础设施栈架构** — RPC Proxy 和 Keys Server 确实已部署在 Cloudflare Workers 上且可用，Relay Server 已构建，其余基础设施服务已构建。

---

## 🔐 认证系统对比

| 功能 | RainbowKit | Cinacoin |
|------|-----------|-------------|
| **SIWE (Sign-In with Ethereum)** | ✅ 需要 rainbowkit-siwe-next-auth 包 | ✅ 内置 SIWE 模块 |
| **SIWX (多链认证)** | ❌ | ✅ 支持 16 条链 |
| **社交登录** | ❌ | ✅ Google, Apple, X, GitHub, Discord, Facebook, Email |
| **Passkey 认证** | ❌ | ✅ WebAuthn |
| **邮箱钱包** | ❌ | ✅ 邮箱登录 → 自动创建钱包 |
| **认证流程** | 4 步引导 | ✅ 已构建，**但 Demo 中为 mock**（社交登录是 2 秒模拟延迟，SIWE 不执行真实签名验证） |

---

## 📦 功能对比

| 功能 | RainbowKit | Cinacoin | 构建状态 |
|------|-----------|-------------|----------|
| **钱包连接 UI** | ✅ 精美 Modal | ✅ 精美 Modal | ✅ 已构建 |
| **钱包按钮组件** | ✅ ConnectButton | ✅ + WalletButtons 独立包 | ✅ 已构建 |
| **链切换** | ✅ | ✅ | ✅ 已构建 |
| **余额显示** | ✅ | ✅ | ✅ 已构建 |
| **Swap (DEX)** | ❌ | ✅ Swap SDK + DEX 聚合封装 | 🔌 **仅 SDK 封装层 — 需要开发者自备 DEX 聚合器 API Key（如 1inch、0x）**，已构建，Demo 中为 mock 计算 |
| **Onramp (法币入金)** | ❌ | ✅ Onramp SDK + iframe 嵌入 | 🔌 **仅 SDK 封装 + iframe 层 — 需要 Meld 或 Coinbase Pay API Key**，已构建，Demo 中不存在真实 Onramp 页面 |
| **跨链桥** | ❌ | ✅ Cross-chain session sync | ⚠️ **仅有 session sync 层代码，无真实跨链桥实现**，已构建 |
| **智能账户 (AA)** | ❌ | ✅ ERC-4337 SDK / Bundler & Paymaster | AA SDK、Bundler、Paymaster、ERC-6492 均已构建 |
| **Gas 赞助** | ❌ | ✅ Gas Sponsorship 包 | ✅ 已构建 |
| **KYC/AML** | ❌ | ✅ KYC 合规筛查 | ✅ 已构建 |
| **多钱包管理** | ❌ | ✅ Multiwallet 包 | ✅ 已构建 |
| **区块链浏览器** | ❌ | ✅ Explorer 包 | ✅ 已构建 |
| **Blockchain API** | ❌ | ✅ REST API | ✅ 已构建 |
| **CLI 工具** | ✅ create-rainbowkit | ✅ cinacoin CLI | ✅ 已构建 |
| **迁移工具** | ❌ | ✅ codemod (从 RainbowKit/ConnectKit/Privy 迁移) | ✅ 已构建 |
| **Gas 估算器** | ❌ | ✅ | ✅ 已构建 |
| **Token 列表** | ❌ | ✅ | ✅ 已构建 |
| **推荐引擎** | ❌ | ✅ 钱包推荐 | ✅ 已构建 |
| **分析** | ❌ | ✅ GDPR 合规分析 | ✅ 已构建 |
| **社交通知** | ❌ | ✅ Notify / Push Server (Rust) | ✅ 已构建 |

---

## 💻 开发体验对比

| 维度 | RainbowKit | Cinacoin |
|------|-----------|-------------|
| **快速上手** | `npm init @rainbow-me/rainbowkit@latest` | `npx cinacoin init` |
| **框架限制** | React only (wagmi) | 11 框架全支持 |
| **TypeScript** | ✅ | ✅ |
| **Headless 模式** | ⚠️ 有限的 WalletButton | ✅ createHeadlessClient |
| **远程配置** | ❌ | ✅ ConfigManager |
| **虚拟测试网** | ❌ | ✅ createVirtualTestnet |
| **Storybook** | ❌ | ✅ |
| **E2E 测试** | ❌ | ✅ Cypress |
| **CI/CD** | ❌ | ✅ 11 GitHub Actions |
| **迁移指南** | ❌ | ✅ RainbowKit/ConnectKit/Privy 迁移文档 |

---

## 🏷️ 定价对比

| 维度 | RainbowKit | Cinacoin |
|------|-----------|-------------|
| **核心库** | ✅ 免费 (MIT) | ✅ 免费 (MIT) |
| **RPC 服务** | ⚠️ 依赖 Rainbow RPC (有速率限制) | ✅ 自建无限制 (RPC Proxy 已部署, 其他服务已构建) |
| **高级功能** | ❌ 无高级功能 | ✅ 全部免费 (全部已构建) |
| **自托管** | ❌ 不可自托管 | ✅ 完全自托管 |
| **云服务费用** | 无 (纯前端) | **$0/月** (Cloudflare 免费额度) |
| **商业使用** | ✅ MIT | ✅ MIT |
| **定价页面** | 无 | ✅ Pricing Plans 文档 |

---

## 🚀 部署对比

| 维度 | RainbowKit | Cinacoin |
|------|-----------|-------------|
| **部署方式** | npm → 前端构建 | Cloudflare Workers + Pages |
| **后端依赖** | 无 | ✅ 可选后端 (RPC Proxy + Keys Server 已部署, Relay/Notify/Push 已构建) |
| **全球 CDN** | npm CDN | ✅ Cloudflare 300+ PoPs |
| **DDoS 防护** | 无 | ✅ Cloudflare 内置 |
| **SSL/TLS** | 由部署方负责 | ✅ 自动 |
| **Docker 支持** | ❌ | ✅ docker-compose.yml |

---

## 📈 总结

### RainbowKit 优势

- 🌈 **更成熟的钱包 UI 组件**（更精美的设计）
- 🦊 **钱包数量更多**（75+ 实际可用 vs 30+ 源码声明）
- 📚 **社区更大**（Rainbow 生态，wagmi/viem 生态）
- 🔧 **与 wagmi 深度集成**（类型安全更好）
- 🎨 **主题定制更精细**（vanilla-extract CSS）

### Cinacoin 优势

- 🔗 **跨链协议架构**（EVM + Solana + Bitcoin + TON + TRON + Cosmos + Sui + Starknet + NEAR + Hedera + XRPL）⚠️ *16 条链架构已设计，7+ 个 adapter 已构建，适配器在 core-sdk 中被注释掉*
- 🏗️ **基础设施栈架构** — RPC Proxy ✅ 已部署可用 + Keys Server ✅ 已部署可用 + Relay Server ✅ 已构建 + Notify ✅ 已构建 + Push Server ✅ 已构建
- 📱 **11 框架架构**（React/Vue/Svelte/Angular/Next/Nuxt/RN/Flutter/Android/iOS/Unity）⚠️ *全部已构建；RN/Flutter 需原生实现*
- 🔐 **认证系统**（SIWX + Social Login + Passkey + Email）⚠️ *已构建；Demo 中全部为 mock — 社交登录是 2 秒模拟，SIWE 不执行真实签名*
- 🧩 **功能架构**（Swap + Onramp + Bridge + AA + Gas + KYC + Explorer + Analytics）⚠️ *Swap/Onramp: 需要你的 API Key；Bridge: 仅有同步层无真实跨链；其余均已构建*
- 🏠 **完全自托管架构**（无供应商锁定，$0 Cloudflare 免费额度运行）
- 🔄 **迁移工具架构**（从 RainbowKit/ConnectKit/Privy）⚠️ *已构建*
- 🎯 **诚实总结：综合完成度约 75-80%**（64/64 包已构建，1/64 已发布到 npm，Demo 全部 mock 交互，RPC Proxy + Keys Server 真实部署可用，适配器 exports 仍被注释）
- 🚀 **CI/CD + Storybook + E2E**（企业级开发流程，已构建）
- 🌐 **Cloudflare 全球部署**（300+ PoPs，DDoS 防护；RPC Proxy + Keys Server 真实可用，其余服务已构建）

### 选择建议

| 场景 | 推荐 |
|------|------|
| 纯 React/EVM dApp，追求精美 UI + 快速上线 | RainbowKit |
| 多链架构（非 EVM 需求） | Cinacoin（64/64 已构建，适配器需启用） |
| 需要社交登录/Passkey | Cinacoin（已构建，Demo 为 mock） |
| 需要自托管基础设施 | Cinacoin（RPC + Keys 已部署，其余已构建） |
| 企业级全栈方案 | Cinacoin（64/64 已构建，约 75-80% 可用） |
| 追求最小依赖/最快上手 | RainbowKit |
| 成本敏感（需要 $0 运行） | Cinacoin（Cloudflare 免费额度，64/64 已构建） |
| 从其他钱包 SDK 迁移 | Cinacoin（迁移工具已构建） |
