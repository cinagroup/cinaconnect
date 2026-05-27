# Openfort vs Cinacoin — 详细对比

## 📊 核心数据对比

| 指标 | Openfort | Cinacoin |
|------|----------|-------------|
| **GitHub** | [openfort-xyz/openfort-react](https://github.com/openfort-xyz/openfort-react) | [cinagroup/cinacoin](https://github.com/cinagroup/cinacoin) |
| **Stars** | 12 | N/A (新) |
| **核心包数** | **2** (@openfort/react, create-openfort) | **64** (完整生态) |
| **源码文件** | ~315 个 TS/TSX | ~2000+ 个 TS/TSX/JS/Dart/C# |
| **版本** | v1.0.15 (npm published) | v0.1.0 (未发布 npm) |
| **许可证** | BSD-2-Clause | MIT |

---

## 🎯 定位差异

| 维度 | Openfort | Cinacoin |
|------|----------|-------------|
| **定位** | **嵌入式钱包 SDK** (React) | **全栈钱包连接基础设施** |
| **核心能力** | 嵌入式钱包 + 认证 + 支付 | 钱包连接 + 多链 + 认证 + Swap + AA |
| **后端依赖** | ✅ **必须使用 Openfort 云端服务** | ✅ **完全自托管可选** |
| **商业模式** | SaaS（需 Openfort 账号） | 开源（零成本自托管） |

---

## 🔐 认证系统对比

| 功能 | Openfort | Cinacoin |
|------|----------|-------------|
| **Email 登录** | ✅ Email + OTP | ✅ Email (SDK 层) |
| **Phone OTP** | ✅ Phone OTP Auth | ❌ 无 |
| **OAuth 社交** | ✅ Google, Apple, X, Discord, etc. | ✅ Google, Apple, X, GitHub, Discord, Facebook |
| **Guest 用户** | ✅ CreateGuestUserPage | ❌ 无 |
| **钱包恢复** | ✅ Recover + LinkedProviders | ❌ 无 |
| **密码管理** | ✅ ForgotPassword + PasswordStrength | ❌ 无 |
| **SIWE** | ✅ createSiweMessage (viem/siwe) | ✅ 内置 SIWE 模块 |
| **SIWX** | ❌ | ✅ 支持 16 条链 |
| **Passkey** | ❌ | ✅ WebAuthn |
| **钱包链接管理** | ✅ LinkEmail, LinkedProviders, RemoveLinkedProvider | ❌ 无 |

**关键差异**: Openfort 的认证系统更成熟完整，有完整的钱包恢复、链接管理、密码管理流程。Cinacoin 认证种类更多（Passkey），但流程不完整。

---

## 🔗 钱包支持对比

| 维度 | Openfort | Cinacoin |
|------|----------|-------------|
| **嵌入式钱包** | ✅ **核心功能** (Openfort managed) | ❌ 无嵌入式钱包 |
| **外部钱包连接** | ✅ ConnectWithInjector (MetaMask 等) | ✅ 30+ 钱包（MetaMask, Phantom, Xverse...） |
| **WalletConnect** | ✅ useWalletConnectModal | ✅ WalletConnect v2 SDK |
| **QR 码连接** | ✅ ConnectWithQRCode | ❌ 需要 projectId 配置 |
| **链支持** | **EVM + Solana** (Bridge + Embedded) | **16 条链** (EVM + Solana + Bitcoin + TON + TRON + Cosmos + Sui + Starknet + NEAR + Hedera + XRPL) |
| **桥接钱包** | ✅ EthereumBridgeStrategy | ❌ 无桥接钱包 |

**关键差异**: Openfort 核心是**嵌入式钱包**（用户不需要外部钱包），Cinacoin 是**外部钱包连接**（连接已有钱包）。Openfort 只支持 EVM + Solana，Cinacoin 支持 16 条跨链协议。

---

## 🏗️ 架构对比

| 维度 | Openfort | Cinacoin |
|------|----------|-------------|
| **框架支持** | **React 独占** | **11 框架**: React, Vue, Svelte, Angular, Next, Nuxt, RN, Flutter, Android, iOS, Unity |
| **核心依赖** | @openfort/openfort-js + wagmi + viem | 自研 core-sdk（零外部依赖） |
| **后端服务** | ✅ **Openfort 云服务（必需）** | ✅ 自托管可选 (Workers + D1 + KV) |
| **状态管理** | zustand | zustand |
| **样式系统** | styled-components + framer-motion | Tailwind CSS |
| **主题** | 6 主题 (minimal, rounded, retro, nouns, midnight, default) | 自定义主题 |
| **本地化** | ✅ 多语言支持 (locales/) | ❌ 无 |

---

## 💰 支付与 Swap

| 功能 | Openfort | Cinacoin |
|------|----------|-------------|
| **购买 (Onramp)** | ✅ Buy, BuyComplete, BuyProcessing, BuyProviderSelect, BuySelectProvider, SelectToken | ✅ SDK 层 (需 API Key) |
| **发送 (Send)** | ✅ Send, SendConfirmation | ❌ 无 |
| **接收 (Receive)** | ✅ Receive | ❌ 无 |
| **Swap** | ❌ | ✅ SDK 层 (DEX 聚合) |
| **资产管理** | ✅ AssetInventory, NoAssetsAvailable | ❌ 无 |
| **Gas 赞助** | ✅ 内置 (Openfort 服务) | ✅ Gas Sponsorship 包 |
| **AA (智能账户)** | ✅ 嵌入式钱包天然 AA | ✅ aa-sdk, bundler, paymaster |
| **ERC-6492** | ❌ | ✅ erc6492 包 |

**关键差异**: Openfort 有完整的**支付流程**（购买、发送、接收），包括 Token 选择、确认页面。Cinacoin 只有 SDK 层封装，无完整支付 UI。

---

## 📦 功能对比

| 功能 | Openfort | Cinacoin |
|------|----------|-------------|
| **嵌入式钱包** | ✅ **核心** | ❌ |
| **外部钱包连接** | ✅ 基础 | ✅ 30+ |
| **链支持** | EVM + Solana | 16 条跨链 |
| **SIWE 认证** | ✅ | ✅ |
| **社交登录** | ✅ OAuth | ✅ OAuth |
| **Email 认证** | ✅ + OTP | ✅ |
| **Phone OTP** | ✅ | ❌ |
| **Passkey** | ❌ | ✅ |
| **Guest 用户** | ✅ | ❌ |
| **钱包恢复** | ✅ | ❌ |
| **链接管理** | ✅ | ❌ |
| **密码管理** | ✅ | ❌ |
| **购买 (Onramp)** | ✅ 完整 UI | ⚠️ SDK 层 |
| **发送/接收** | ✅ 完整 UI | ❌ |
| **Swap** | ❌ | ⚠️ SDK 层 |
| **Gas 赞助** | ✅ 内置 | ✅ |
| **AA 智能账户** | ✅ 嵌入式 | ✅ |
| **多框架** | React only | 11 框架 |
| **自托管** | ❌ | ✅ |
| **本地化** | ✅ | ❌ |
| **主题系统** | 6 主题 | 自定义 |
| **CLI 工具** | ✅ create-openfort | ✅ cinacoin CLI |
| **移动端 SDK** | ❌ | ✅ RN/Flutter/Android/iOS/Unity |
| **CI/CD** | ✅ 5 workflows | ✅ 11+ workflows |
| **测试** | 16 test files | 108 test files |
| **npm 发布** | ✅ @openfort/react v1.0.15 | ❌ 未发布 |

---

## 🏷️ 定价与商业模式

| 维度 | Openfort | Cinacoin |
|------|----------|-------------|
| **核心库** | ✅ 免费 (BSD-2) | ✅ 免费 (MIT) |
| **后端服务** | ⚠️ **必须用 Openfort 云端**（付费） | ✅ **完全自托管**（$0） |
| **嵌入式钱包** | 需 Openfort 账号 | 无 |
| **自托管** | ❌ 不可自托管 | ✅ 完全自托管 |
| **商业使用** | ✅ BSD-2 | ✅ MIT |
| **云服务费用** | 按用量付费 | **$0/月** (Cloudflare) |

---

## 📈 总结

### Openfort 优势

- 🎯 **嵌入式钱包** — 用户不需要外部钱包，邮箱/社交即可创建
- 💰 **完整支付流程** — 购买、发送、接收、Token 选择、确认页面
- 🔐 **认证系统更成熟** — 钱包恢复、链接管理、密码管理、Phone OTP
- 🎨 **UI/UX 更精美** — framer-motion 动画、6 主题、本地化
- 📦 **npm 已发布** — @openfort/react v1.0.15，可直接使用
- 🏢 **公司运营** — openfort.io，有商业支持

### Cinacoin 优势

- 🔗 **跨链支持** — 16 条链 vs 2 条（EVM + Solana）
- 📱 **11 框架支持** — React/Vue/Svelte/Angular/Next/Nuxt/RN/Flutter/Android/iOS/Unity
- 🏠 **完全自托管** — 无供应商锁定，$0 成本
- 🧩 **功能更全面** — Swap、AA、KYC、Explorer、Analytics
- 🧪 **测试覆盖更广** — 108 vs 16 测试文件
- 🌐 **Cloudflare 全球部署** — 300+ PoPs

### 选择建议

| 场景 | 推荐 |
|------|------|
| 需要嵌入式钱包（用户无外部钱包） | **Openfort** |
| 需要完整支付流程（购买/发送/接收） | **Openfort** |
| React dApp，追求开箱即用 | **Openfort** |
| 多链应用（非 EVM/Solana） | **Cinacoin** |
| 需要多框架支持（Vue/Svelte/Angular） | **Cinacoin** |
| 需要自托管/零成本 | **Cinacoin** |
| 需要移动端 SDK（RN/Flutter/Android/iOS） | **Cinacoin** |
| 企业级全栈方案 | **Cinacoin** |

### 一句话

**Openfort** = 精美的嵌入式钱包 React SDK（需云服务）  
**Cinacoin** = 全栈钱包连接基础设施（16 链、11 框架、完全自托管）
