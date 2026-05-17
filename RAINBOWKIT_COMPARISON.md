# RainbowKit vs CinaConnect — 详细对比

## 📊 核心数据对比

| 指标 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **GitHub** | [rainbow-me/rainbowkit](https://github.com/rainbow-me/rainbowkit) | [cinagroup/cinaconnect](https://github.com/cinagroup/cinaconnect) |
| **核心包数** | **3** (rainbowkit, rainbow-button, create-rainbowkit) | **64** (完整全栈) |
| **源码文件** | ~248 个 TS/TSX 文件 | ~700+ 个 TS/TSX/JS/Dart 文件 |
| **框架支持** | **React 独占** (wagmi 生态) | **11 框架**: React, Vue, Svelte, Angular, Next, Nuxt, React Native, Flutter, Android, iOS, Unity |
| **依赖链** | wagmi → viem → 强耦合 | 自研 core-sdk → 零外部依赖 |

---

## 🔗 链支持对比

| 指标 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **链数量** | ~35 条 (EVM only) | **16 条 (跨链协议)** |
| **EVM 链** | ✅ 全部 (ETH, Polygon, Arbitrum, Base, Optimism, BSC, Avalanche, zkSync, Linea, Scroll, Blast, etc.) | ✅ 全部 (ETH, Polygon, Arbitrum, Base, Optimism, BSC) |
| **Solana** | ❌ | ✅ Phantom, Solflare, Backpack |
| **Bitcoin** | ❌ | ✅ Unisat, Leather, Xverse, OKX |
| **TON** | ❌ | ✅ Tonkeeper, OpenMask |
| **TRON** | ❌ | ✅ TronLink, TronPay |
| **Cosmos** | ❌ | ✅ Keplr, Leap |
| **Sui** | ❌ | ✅ Sui Wallet, Ethos, Suiet |
| **Starknet** | ❌ | ✅ Argent X, Braavos |
| **NEAR** | ❌ | ✅ NEAR Wallet, Here Wallet |
| **Hedera** | ❌ | ✅ HashPack, Blade |
| **XRPL** | ❌ | ✅ Xaman |
| **跨链桥** | ❌ 无 | ✅ 内置 Bridge |

**关键差异**: RainbowKit **仅支持 EVM 链**（约 35 条），CinaConnect 支持 **16 条跨链协议**（EVM + Solana + Bitcoin + L2s）。

---

## 💰 钱包支持对比

| 指标 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **钱包数量** | **75+** | **30+** |
| **内置钱包连接器** | MetaMask, WalletConnect, Coinbase, Rainbow, Safe, Phantom, Ledger, Trust, OKX, Brave, Frame, Zerion 等 75+ | MetaMask, WalletConnect, Coinbase, Rainbow, Phantom, Trust, Ledger, Xverse, Tonkeeper, TronLink, Keplr, Argent X 等 30+ |
| **EIP-6963** | ✅ | ✅ |
| **Bitcoin 钱包** | ❌ | ✅ 6 个原生连接器 |
| **Solana 钱包** | ❌ (仅 EVM) | ✅ 4 个原生连接器 |
| **TON 钱包** | ❌ | ✅ |
| **移动端 Deep Link** | ⚠️ 仅 WalletConnect | ✅ 8 钱包深度链接 |

**关键差异**: RainbowKit 钱包数量多但**仅限 EVM**。CinaConnect 钱包数量较少但**跨所有链协议**。

---

## 🏗️ 架构对比

| 维度 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **定位** | React 钱包连接 UI 组件库 | **全栈钱包连接基础设施** |
| **核心依赖** | wagmi + viem + react-query | 自研 core-sdk (零外部依赖) |
| **自托管** | ❌ 依赖 Rainbow 增强 RPC | ✅ **完全自托管** |
| **RPC** | 使用 enhanced-provider.rainbow.me | ✅ 自建 RPC Proxy |
| **后端服务** | ❌ 无后端 | ✅ Relay Server + Keys Server + Notify Server |
| **数据库** | ❌ | ✅ D1 / PostgreSQL |
| **CDN 分发** | npm only | npm + CDN bundle |
| **部署方式** | npm 包 → 前端引入 | Cloudflare Workers + Pages + Docker |

**关键差异**: RainbowKit 只是一个 **前端 UI 组件库**，依赖 wagmi + viem + Rainbow RPC。CinaConnect 是**完整基础设施栈**，包括 RPC 代理、密钥管理、通知系统、CDN 分发。

---

## 🔐 认证系统对比

| 功能 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **SIWE (Sign-In with Ethereum)** | ✅ 需要 rainbowkit-siwe-next-auth 包 | ✅ 内置 SIWE 模块 |
| **SIWX (多链认证)** | ❌ | ✅ 支持 16 条链 |
| **社交登录** | ❌ | ✅ Google, Apple, X, GitHub, Discord, Facebook, Email |
| **Passkey 认证** | ❌ | ✅ WebAuthn |
| **邮箱钱包** | ❌ | ✅ 邮箱登录 → 自动创建钱包 |
| **认证流程** | 4 步引导 | ✅ 4 步引导 + 社交登录 |

---

## 📦 功能对比

| 功能 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **钱包连接 UI** | ✅ 精美 Modal | ✅ 精美 Modal |
| **钱包按钮组件** | ✅ ConnectButton | ✅ + WalletButtons 独立包 |
| **链切换** | ✅ | ✅ |
| **余额显示** | ✅ | ✅ |
| **Swap (DEX)** | ❌ | ✅ 内置 Swap SDK + DEX 聚合 |
| **Onramp (法币入金)** | ❌ | ✅ 内置 Onramp SDK |
| **跨链桥** | ❌ | ✅ |
| **智能账户 (AA)** | ❌ | ✅ ERC-4337, Bundler, Paymaster |
| **Gas 赞助** | ❌ | ✅ Gas Sponsorship 包 |
| **KYC/AML** | ❌ | ✅ KYC 合规筛查 |
| **多钱包管理** | ❌ | ✅ Multiwallet 包 |
| **区块链浏览器** | ❌ | ✅ Explorer 包 |
| **Blockchain API** | ❌ | ✅ REST API |
| **CLI 工具** | ✅ create-rainbowkit | ✅ cinaconnect CLI |
| **迁移工具** | ❌ | ✅ codemod (从 RainbowKit/ConnectKit/Privy 迁移) |
| **Gas 估算器** | ❌ | ✅ |
| **Token 列表** | ❌ | ✅ |
| **推荐引擎** | ❌ | ✅ 钱包推荐 |
| **分析** | ❌ | ✅ GDPR 合规分析 |
| **社交通知** | ❌ | ✅ Notify + Push Server |

---

## 💻 开发体验对比

| 维度 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **快速上手** | `npm init @rainbow-me/rainbowkit@latest` | `npx cinaconnect init` |
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

| 维度 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **核心库** | ✅ 免费 (MIT) | ✅ 免费 (MIT) |
| **RPC 服务** | ⚠️ 依赖 Rainbow RPC (有速率限制) | ✅ 自建无限制 |
| **高级功能** | ❌ 无高级功能 | ✅ 全部免费 |
| **自托管** | ❌ 不可自托管 | ✅ 完全自托管 |
| **云服务费用** | 无 (纯前端) | **$0/月** (Cloudflare 免费额度) |
| **商业使用** | ✅ MIT | ✅ MIT |
| **定价页面** | 无 | ✅ Pricing Plans 文档 |

---

## 🚀 部署对比

| 维度 | RainbowKit | CinaConnect |
|------|-----------|-------------|
| **部署方式** | npm → 前端构建 | Cloudflare Workers + Pages |
| **后端依赖** | 无 | ✅ 可选后端 (可自托管) |
| **全球 CDN** | npm CDN | ✅ Cloudflare 300+ PoPs |
| **DDoS 防护** | 无 | ✅ Cloudflare 内置 |
| **SSL/TLS** | 由部署方负责 | ✅ 自动 |
| **Docker 支持** | ❌ | ✅ docker-compose.yml |

---

## 📈 总结

### RainbowKit 优势

- 🌈 **更成熟的钱包 UI 组件**（更精美的设计）
- 🦊 **钱包数量更多**（75+ vs 30+）
- 📚 **社区更大**（Rainbow 生态，wagmi/viem 生态）
- 🔧 **与 wagmi 深度集成**（类型安全更好）
- 🎨 **主题定制更精细**（vanilla-extract CSS）

### CinaConnect 优势

- 🔗 **跨链协议支持**（EVM + Solana + Bitcoin + TON + TRON + Cosmos + Sui + Starknet + NEAR + Hedera + XRPL）
- 🏗️ **完整基础设施栈**（RPC Proxy + Relay + Keys + Notify + CDN）
- 📱 **11 个框架支持**（React/Vue/Svelte/Angular/Next/Nuxt/RN/Flutter/Android/iOS/Unity）
- 🔐 **认证系统更强**（SIWX + Social Login + Passkey + Email）
- 🧩 **功能更全面**（Swap + Onramp + Bridge + AA + Gas + KYC + Explorer + Analytics）
- 🏠 **完全自托管**（无供应商锁定，$0 成本运行）
- 🔄 **迁移工具**（从 RainbowKit/ConnectKit/Privy 一键迁移）
- 🚀 **CI/CD + Storybook + E2E**（企业级开发流程）
- 🌐 **Cloudflare 全球部署**（300+ PoPs，DDoS 防护）

### 选择建议

| 场景 | 推荐 |
|------|------|
| 纯 React/EVM dApp，追求精美 UI | RainbowKit |
| 多链应用（非 EVM） | **CinaConnect** |
| 需要社交登录/Passkey | **CinaConnect** |
| 需要自托管基础设施 | **CinaConnect** |
| 企业级全栈方案 | **CinaConnect** |
| 追求最小依赖/最快上手 | RainbowKit |
| 成本敏感（需要 $0 运行） | **CinaConnect** |
| 从其他钱包 SDK 迁移 | **CinaConnect** |
