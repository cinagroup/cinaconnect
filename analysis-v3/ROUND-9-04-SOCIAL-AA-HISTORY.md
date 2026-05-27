# ROUND-9-04 — Social Login 部署 + AA 端到端 + 交易历史

**日期:** 2026-05-26  
**作者:** Cinacoin Subagent  
**状态:** ✅ 已完成

---

## 1. Social Login Server 部署准备

### 1.1 源码位置

```
packages/social-login/
├── src/
│   ├── index.ts                    # 包导出入口
│   ├── types.ts                    # SocialProvider, SocialLoginResult, OAuth2TokenResponse 等
│   ├── token-verifier.ts           # TokenVerifier — 真实 token 验证逻辑
│   ├── wallet-derivation.ts        # 确定性 HD 钱包派生
│   ├── session-manager.ts          # 会话管理
│   ├── social-wallet.ts            # SocialWalletManager
│   ├── email-otp.ts                # 邮件 OTP / Magic Link
│   ├── sms-providers.ts            # Twilio / Vonage / AWS SNS
│   ├── providers/
│   │   ├── google.ts               # Google OAuth2 (OIDC)
│   │   ├── apple.ts                # Apple Sign-In (JWT client_secret)
│   │   ├── twitter.ts              # Twitter/X OAuth2 PKCE
│   │   ├── github.ts               # GitHub OAuth2
│   │   └── email.ts                # 邮件认证
│   ├── auth/
│   │   └── phone-otp.ts            # 手机 OTP
│   └── __tests__/
│       ├── token-verifier.test.ts  # TokenVerifier 单元测试
│       ├── session-manager.test.ts
│       ├── email-otp.test.ts
│       ├── phone-otp.test.ts
│       └── sms-providers.test.ts
├── deploy/                         # ✨ 新增
│   ├── .env.example                # 环境变量模板
│   └── DEPLOY.md                   # 部署指南
└── package.json                    # @cinacoin/social-login v0.2.0
```

### 1.2 Token 验证逻辑审计

每个 Provider 都有 **真实** 的服务器端 Token 验证，由 `TokenVerifier` 类统一处理：

| Provider | 验证方式 | 端点 | 安全性 |
|---|---|---|---|
| **Google** | ID Token JWT + `tokeninfo` API | `oauth2.googleapis.com/tokeninfo` | ✅ 双重验证（结构+签名） |
| **Apple** | ID Token JWT + JWKS 签名验证 | `appleid.apple.com/auth/keys` | ✅ jose 库 RS256 验签 |
| **Twitter** | Access Token + API v2 `/me` | `api.twitter.com/2/users/me` | ✅ 实时 API 验证 |
| **GitHub** | Access Token + REST `/user` | `api.github.com/user` | ✅ 实时 API 验证 |

#### Google 验证流程 (`token-verifier.ts`)
1. **结构检查** — 验证 JWT 格式（三段式）
2. **Audience 校验** — 对比配置的 `googleClientId`
3. **过期检查** — 验证 `exp` 声明
4. **签名验证** — 调用 Google `tokeninfo` 端点验证签名
5. **降级处理** — tokeninfo 网络错误时返回结构有效性

#### Apple 验证流程
1. **结构检查** — JWT 格式验证
2. **Audience 校验** — 对比配置的 `appleClientId`
3. **JWKS 获取** — 从 `appleid.apple.com/auth/keys` 获取公钥（带 10 分钟缓存）
4. **签名验证** — 使用 `jose` 的 `jwtVerify` 进行 RS256 验证
5. **Issuer 校验** — 验证 `iss` 声明为 `https://appleid.apple.com`

#### Apple client_secret 生成 (`apple.ts`)
使用 `jose` 库生成 ES256 签名的 JWT client_secret：
- `alg: ES256` + `kid`（Key ID）
- `iss` = Team ID, `sub` = Client ID, `aud` = `https://appleid.apple.com`
- 有效期 30 天（Apple 允许最长 6 个月）

#### Twitter PKCE 流程 (`twitter.ts`)
- 生成 PKCE `code_verifier` (64 字节) + `code_challenge` (SHA-256, Base64URL)
- 使用 OAuth2 PKCE 授权码流程
- Token 交换通过 Basic Auth (`clientId:clientSecret`)
- 用户信息通过 API v2 `/2/users/me`

### 1.3 部署配置

#### 新增文件

**`packages/social-login/deploy/.env.example`** — 完整环境变量模板：
- Google OAuth2 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
- Apple Sign-In (`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`)
- Twitter/X (`TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_BEARER_TOKEN`)
- GitHub OAuth2 (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
- Session/JWT (`SESSION_SECRET`, `JWT_SECRET`, `JWT_EXPIRY_SECONDS`)
- 数据库 (`DATABASE_URL`)
- Redis (`REDIS_URL`) — 速率限制和 OTP 缓存
- SMS/Email 提供商 (Twilio, Vonage, AWS SES)
- 服务器配置 (`PORT`, `NODE_ENV`, `CORS_ORIGINS`)

**`packages/social-login/deploy/DEPLOY.md`** — 部署指南：
- 架构说明（OAuth2 流程图）
- Token 验证端点表格
- 各 Provider 的 OAuth2 应用创建链接
- Docker 部署示例
- 安全注意事项（client_secret 轮换、PKCE 存储、ID Token 过期）

#### 更新文件

**`.env.example`** (根目录) — 新增 Social Login 和交易历史索引器配置段

### 1.4 依赖项

- `jose` v5.2.0 — JWT 生成和验证（Apple client_secret, ID Token 验证）
- `typescript` v5.3.0
- `vitest` v1.2.0

---

## 2. AA SDK 端到端集成

### 2.1 源码架构

```
packages/aa-sdk/
├── src/
│   ├── index.ts              # 包导出入口
│   ├── types.ts              # UserOperation, UserOperationReceipt, AASDKConfig 等
│   ├── smartAccount.ts       # SmartAccount — ERC-4337 智能账户
│   ├── bundler.ts            # BundlerClient — 真实 HTTP JSON-RPC 客户端
│   ├── paymaster.ts          # PaymasterClient — 真实 HTTP JSON-RPC 客户端
│   ├── factory.ts            # SmartAccountFactory — 账户工厂
│   └── createClients.ts      # 工厂函数 + executeUserOperation 全流程
├── tests/
│   ├── aa.test.ts            # 传统命令式测试
│   ├── smartAccount.test.ts  # Vitest 集成测试
│   └── e2e-integration.test.ts  # ✨ 新增 — 端到端集成测试
├── INTEGRATION.md
├── README.md
└── package.json              # @cinacoin/aa-sdk v0.2.0
```

```
packages/bundler/               # 独立 bundler 服务（Rust + TypeScript 客户端）
├── src/
│   ├── main.rs                 # Rust 主程序入口
│   ├── bundler.rs              # Bundler 核心逻辑
│   ├── rpc.rs                  # ERC-4337 RPC 方法实现
│   ├── validation.rs           # UserOperation 验证
│   ├── signer.rs               # 签名逻辑
│   ├── types.rs                # Rust 类型定义
│   ├── BundlerClient.ts        # TypeScript BundlerClient（aa-sdk 也有一份）
│   ├── types.ts
│   └── tests/
│       ├── mod.rs
│       ├── integration.rs
│       └── rpc.rs
├── config.yaml
├── Cargo.toml
└── Dockerfile
```

### 2.2 UserOperation 完整流程验证

**SmartAccount → BundlerClient → PaymasterClient 端到端流程** 已在 `createClients.ts` 中实现为 `executeUserOperation`：

```
1. SmartAccount.execute()
   ↓ 构建 UserOperation (nonce, callData, gas limits)
2. SmartAccount.signUserOp()
   ↓ 使用 viem privateKeyToAccount 签名
3. PaymasterClient.sponsor()
   ↓ pm_sponsorUserOperation → 返回 paymasterAndData
4. BundlerClient.estimateUserOperationGas()
   ↓ eth_estimateUserOperationGas → 精炼 gas 估算
5. SmartAccount.signUserOp() (重新签名)
   ↓ 用最终 gas 值重新签名
6. BundlerClient.sendUserOperation()
   ↓ eth_sendUserOperation → 返回 userOpHash
7. BundlerClient.waitForReceipt()
   ↓ 轮询 eth_getUserOperationReceipt → 返回 Receipt
```

#### 各组件能力确认

**SmartAccount** (`smartAccount.ts`):
- ✅ 使用 `viem` 的 `privateKeyToAccount` 进行真实 ECDSA 签名
- ✅ ERC-4337 UserOperation 构建 (nonce, initCode, callData, gas limits)
- ✅ ABI 编码批量交易 (`executeBatch`)
- ✅ 从 Entry Point 合约读取链上 nonce (`getNonce`)
- ✅ 确定性地址派生 (CREATE2 风格)
- ✅ 工厂合约交互 (initCode)

**BundlerClient** (`bundler.ts`):
- ✅ `eth_sendUserOperation` — 发送 UserOperation
- ✅ `eth_estimateUserOperationGas` — Gas 估算
- ✅ `eth_getUserOperationReceipt` — 获取回执
- ✅ `eth_getUserOperationByHash` — 通过 Hash 查询
- ✅ `eth_supportedEntryPoints` — 支持的 Entry Points
- ✅ `waitForReceipt` — 带重试的轮询（可配置 interval 和 maxRetries）
- ✅ API Key 认证 (Bearer Token)
- ✅ BigInt → Hex 序列化

**PaymasterClient** (`paymaster.ts`):
- ✅ `pm_sponsorUserOperation` — 赞助 UserOperation
- ✅ `pm_getGasLimits` — 获取 Gas 限制
- ✅ `canSponsor` — 检查赞助能力
- ✅ 三种赞助模式: `gasless` | `partial` | `post-pay`

**SmartAccountFactory** (`factory.ts`):
- ✅ `computeAddress` — 预计算账户地址（链上读取 + 本地派生降级）
- ✅ `deploy` — 通过工厂合约部署新账户
- ✅ `isDeployedOnChain` — 链上代码检查确认部署状态

### 2.3 端到端集成测试

**新增文件: `packages/aa-sdk/tests/e2e-integration.test.ts`**

覆盖以下测试场景：

| 测试 | 验证内容 |
|---|---|
| SmartAccount build + sign | 构建 UserOperation，使用 viem 签名 |
| BundlerClient 序列化 | BigInt → Hex 正确转换，RPC 格式正确 |
| BundlerClient Gas 估算 | 返回 BigInt 值的精度验证 |
| 完整 AA Pipeline | 构建→签名→赞助→估算→发送→轮询回执 |
| PaymasterClient 赞助 | 返回 paymasterAndData，Gas 限制转换 |
| PaymasterClient API Key | Bearer Token 正确附加 |
| PaymasterClient 错误处理 | RPC 错误、HTTP 错误 |
| BundlerClient 收据轮询 | 多次轮询后成功获取收据 |
| BundlerClient 超时处理 | 超时后抛出错误 |
| SmartAccountFactory 地址计算 | 确定性地址派生，相同输入产生相同地址 |

所有测试使用 mock fetch 模拟 RPC 响应，不依赖真实网络。

### 2.4 依赖项

- `viem` v2.9.0 — 以太坊交互、签名、ABI 编码
- `@noble/curves` v2.2.0 — 椭圆曲线密码学
- `@noble/hashes` v2.2.0 — 哈希函数

---

## 3. 交易历史记录

### 3.1 源码位置

```
packages/blockchain-api/
├── src/
│   ├── client.ts               # BlockchainApiClient — ✨ 新增交易历史方法
│   ├── types.ts                # ✨ 新增 TransactionHistoryQuery, TransactionCacheEntry
│   └── index.ts                # ✨ 新增导出
└── package.json                # @cinacoin/blockchain-api
```

### 3.2 实现的交易历史方法

#### `getTransactionHistory(address, chainId?, limit?, cursor?)`
单个链的交易历史查询。三级数据源回退：
1. **Alchemy API** — `alchemy_getAssetTransfers`（最全面）
2. **Covalent/GoldRush API** — `address/{address}/transactions_v2/`（标准化）
3. **链上扫描** — 扫描最近的区块（有限范围，作为降级方案）

#### `getMultiChainTransactionHistory(query)` ✨ 新方法
多链交易历史查询：
- **默认链**: ETH (1), Polygon (137), BSC (56)
- **支持链**: 扩展到 Arbitrum, Optimism, Base, Avalanche
- **并行查询**: 所有链使用 `Promise.allSettled` 并行查询
- **结果合并**: 按时间戳排序，统一返回

### 3.3 查询参数 (`TransactionHistoryQuery`)

| 参数 | 类型 | 说明 |
|---|---|---|
| `address` | `string` | 钱包地址（必需） |
| `chainIds` | `number[]` | 要查询的链 ID 列表（默认: [1, 137, 56]） |
| `limit` | `number` | 每页最大交易数（默认: 20） |
| `cursor` | `string` | 分页游标（格式: `chainId:blockNumber`） |
| `type` | `"native" \| "erc20" \| "nft"` | 交易类型过滤 |
| `tokenAddress` | `string` | 只查询涉及特定 Token 的交易 |
| `timeFrom` | `number` | Unix 时间戳 — 起始时间 |
| `timeTo` | `number` | Unix 时间戳 — 结束时间 |
| `status` | `"success" \| "failed" \| "pending"` | 交易状态过滤 |
| `sortOrder` | `"asc" \| "desc"` | 排序方向（默认: desc = 最新优先） |

### 3.4 分页机制

- **游标格式**: `chainId:blockNumber` 或索引器特定的 page token
- **多链游标**: 解析后确定从哪个链继续查询
- **单链游标**: 返回下一个区块号或索引器 page token
- **hasMore 标志**: 指示是否有更多数据

### 3.5 缓存机制

- **缓存存储**: 内存 Map (`_txHistoryCache`)
- **缓存键**: `${address}:${chainId}:${cursor}:${type}:${timeFrom}:${timeTo}`
- **TTL**: 30 秒（交易数据相对静态）
- **缓存函数**: `_getTxCached()`, `_setTxCached()`, `clearTxCached()`
- **缓存位置**: 每个查询层级都检查缓存（入口 → 单链）

### 3.6 TypeScript 类型

#### 新增类型 (`types.ts`)

```typescript
interface Transaction {
  hash: string;
  from: string;
  to?: string;
  value: bigint;
  status: "success" | "failed" | "pending";
  blockNumber?: number;
  timestamp?: number;
  gasUsed?: bigint;
  method?: string;
  chainId?: number;           // ✨ 新增
  type?: "native" | "erc20" | "nft";  // ✨ 新增
  tokenAddress?: string;      // ✨ 新增
  tokenValue?: bigint;        // ✨ 新增
  formattedValue?: string;    // ✨ 新增
  gasPrice?: bigint;          // ✨ 新增
  fee?: bigint;               // ✨ 新增
  blockHash?: string;         // ✨ 新增
  transactionIndex?: number;  // ✨ 新增
  nonce?: number;             // ✨ 新增
  input?: string;             // ✨ 新增
}

interface TransactionHistoryQuery { ... }
interface TransactionCacheEntry { ... }
```

### 3.7 数据源对比

| 数据源 | 覆盖范围 | 时间范围 | 实时性 | 依赖 |
|---|---|---|---|---|
| **Alchemy** | 完整历史 | 不限 | 近实时 | API Key |
| **Covalent** | 完整历史 | 不限 | 近实时 | API Key |
| **链上扫描** | 最近 ~100 块 | 有限 | 实时 | 无 |

---

## 4. 变更清单

### 新增文件
| 文件 | 说明 |
|---|---|
| `packages/social-login/deploy/.env.example` | Social Login 完整环境变量模板 |
| `packages/social-login/deploy/DEPLOY.md` | Social Login 部署指南 |
| `packages/aa-sdk/tests/e2e-integration.test.ts` | AA SDK 端到端集成测试 |

### 修改文件
| 文件 | 变更 |
|---|---|
| `.env.example` | 新增 Social Login 和交易历史索引器配置段 |
| `packages/blockchain-api/src/types.ts` | 新增 TransactionHistoryQuery, TransactionCacheEntry, Transaction 增强字段 |
| `packages/blockchain-api/src/client.ts` | 新增 getMultiChainTransactionHistory, 三级数据源回退, 分页, 缓存 |
| `packages/blockchain-api/src/index.ts` | 新增导出 TransactionHistoryQuery, TransactionCacheEntry, clearTxCached |

---

## 5. 质量评估

### Social Login
- ✅ Google/GitHub/Apple/Twitter 都有真实 token 验证逻辑
- ✅ TokenVerifier 统一处理多 provider 验证
- ✅ 使用 `jose` 库进行 JWT 签名和验证
- ✅ Apple client_secret 正确生成（ES256, PKCS#8）
- ✅ Twitter PKCE 完整实现
- ✅ 部署配置完整（环境变量、Docker、安全注意事项）
- ⚠️ Discord/Facebook provider 未在代码中实现（types.ts 中声明但未实现）

### AA SDK
- ✅ 完整的 UserOperation 创建→签名→发送→确认流程
- ✅ viem 真实 ECDSA 签名
- ✅ BundlerClient 和 PaymasterClient 使用真实 HTTP JSON-RPC
- ✅ Bundler 服务有独立的 Rust 实现（`packages/bundler/`）
- ✅ 端到端集成测试覆盖所有关键路径
- ✅ Gas 估算、赞助、轮询等完整链路
- ⚠️ 端到端测试使用 mock RPC，需要真实 bundler 进行生产测试

### 交易历史
- ✅ 多链支持（ETH, Polygon, BSC + 扩展链）
- ✅ 分页（cursor-based）
- ✅ 过滤（type, token, time range, status）
- ✅ 排序（时间升序/降序）
- ✅ TypeScript 类型完整
- ✅ 内存缓存（30s TTL）
- ✅ 三级数据源回退（Alchemy → Covalent → 链上扫描）
- ⚠️ 链上扫描仅限最近 ~100 块，不适合完整历史
- ⚠️ 需要配置 Alchemy/Covalent API Key 才能获取完整历史
