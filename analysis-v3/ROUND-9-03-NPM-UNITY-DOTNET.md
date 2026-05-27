# Round 9 — npm 发布管线 + Unity .asmdef + .NET SDK 完善

**日期:** 2026-05-26  
**状态:** ✅ 完成

---

## 1. npm 发布管线

### 1.1 审计结果

扫描了 `packages/` 目录下 **71 个公开包**（排除 `private: true` 的包）：

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 有 `dist/` 目录 | 68/71 | **71/71** ✅ |
| 有 `build` 脚本 | 71/71 | 71/71 ✅ |
| 有 `main` 字段 | 71/71 | 71/71 ✅ |
| 有 `module` 字段 | 65/71 | 65/71 (6 个不需要 module) |
| 有 `types` 字段 | 71/71 | 71/71 ✅ |
| 有 `exports` 字段 | 56/71 | **71/71** ✅ |
| 有 `files` 字段 | 71/71 | 71/71 ✅ |
| 有 `.npmignore` | 0/71 | 0/71 (用 `files` 替代) |

### 1.2 缺失 `dist/` 的包（已修复）

| 包名 | 原因 | 修复方式 |
|------|------|----------|
| `@cinacoin/i18n-react` | 未构建 | `npx tsup` ✅ |
| `@cinacoin/cinacoin-ui-theme` | 未构建 | `npx tsup` ✅ |
| `@cinacoin/performance-utils` | `tsconfig.json` 的 `lib`/`target` 缺少 ES2021 导致 `WeakRef` 报错 | 升级 `tsconfig.json` → `ES2021`，然后 `npx tsc` ✅ |

### 1.3 缺失 `exports` 的包（已修复）

为以下 **15 个包**添加了标准 `exports` 字段：

| 包 | exports 路径 |
|---|---|
| `@cinacoin/adapter-bitcoin` | `.` → `{import, require, types}` |
| `@cinacoin/adapter-cosmos` | `.` → `{import, require, types}` |
| `@cinacoin/adapter-hedera` | `.` → `{import, require, types}` |
| `@cinacoin/adapter-sui` | `.` → `{import, require, types}` |
| `@cinacoin/adapter-xrpl` | `.` → `{import, require, types}` |
| `@cinacoin/cdn` | `.` → CDN 专用路径 |
| `@cinacoin/codemod` | `.` → `{import, require, types}` |
| `@cinacoin/custom-connectors` | `.` → `{import, require, types}` |
| `@cinacoin/multiwallet` | `.` → `{import, require, types}` |
| `@cinacoin/onramp-sdk` | `.` → `{import, require, types}` |
| `@cinacoin/payment-flow` | `.` → `{import, require, types}` |
| `@cinacoin/session-keys` | `.` → `{import, require, types}` |
| `@cinacoin/swap-sdk` | `.` → `{import, require, types}` |
| `@cinacoin/ui-theme` | `.` → `{import, require, types}` |
| `@cinacoin/dotnet` | `.` → `{import, require, types}` |

### 1.4 发布脚本

**已有脚本：**
- `scripts/publish-all.sh` — Bash 版本（已有，功能完整）
- `scripts/publish-all.js` — Node.js 版本（已有，增强）

**本次改进：**
- `publish-all.js` 新增 `--build-missing` 选项，可在发布前自动构建缺少 dist/ 的包
- `package.json` 已有 `publish:all`、`publish:all:sh`、`publish:dry-run`、`publish:all:force` 等脚本别名

**monorepo 配置：**
- 根 `package.json` 使用 `turbo` 进行多包构建
- 使用 `changesets` 进行版本管理和发布
- `.npmrc` 配置了 `link-workspace-packages=true` 和 `prefer-workspace-packages=true`

### 1.5 `.npmignore` 策略

所有包都使用 `files: ["dist"]` 字段控制发布内容（优于 `.npmignore`），这是现代最佳实践。不需要额外添加 `.npmignore` 文件。

---

## 2. Unity .asmdef 文件

### 2.1 现有文件结构

```
packages/unity-csharp/
├── Runtime/
│   ├── Cinacoin.Runtime.asmdef       ← 已修复
│   ├── Auth/
│   ├── Chain/
│   ├── Push/
│   ├── Types/
│   ├── UI/
│   └── Wallet/
├── Editor/
│   └── Cinacoin.Editor.asmdef        ← 已修复
├── Tests/
│   ├── Runtime/
│   │   └── Cinacoin.Tests.Runtime.asmdef  ← 已修复
│   └── Editor/
│       └── Cinacoin.Tests.Editor.asmdef   ← 新建
└── package.json  (UPM 格式)
```

### 2.2 修复内容

**所有 `.asmdef` 文件的共同改进：**
- ❌ 移除 `"overrideReferences": true` + `"precompiledReferences": ["Newtonsoft.Json.dll"]`
- ✅ 改为 `"overrideReferences": false` + `"references": ["com.unity.nuget.newtonsoft-json"]`
  - 原因：硬编码 `Newtonsoft.Json.dll` 依赖 Unity 安装路径，UPM 分发应使用包引用

**Cinacoin.Runtime.asmdef：**
- 添加 `versionDefines` 检测 `com.unity.modules.unitywebrequest` 模块
- references 改为 `["com.unity.nuget.newtonsoft-json"]`

**Cinacoin.Editor.asmdef：**
- references 保留 `Cinacoin.Runtime` 依赖
- 添加 `com.unity.nuget.newtonsoft-json` 引用

**Cinacoin.Tests.Runtime.asmdef：**
- references 添加 `com.unity.nuget.newtonsoft-json`
- 添加 `defineConstraints: ["UNITY_INCLUDE_TESTS"]`
- 移除 `overrideReferences` + `precompiledReferences`

**Cinacoin.Tests.Editor.asmdef (新建)：**
- 引用 Runtime、Editor、Tests.Runtime 三个程序集
- 包含 `UnityEditor.TestRunner` 和 `UnityEngine.TestRunner`
- 设置 `includePlatforms: ["Editor"]` 和 `defineConstraints: ["UNITY_INCLUDE_TESTS"]`
- `autoReferenced: false` (测试程序集不应自动引用)

### 2.3 UPM 兼容性

`package.json` 使用 UPM 格式：
- `name: "com.cinacoin.unity"` — 正确的 UPM 包名格式
- `dependencies: { "com.unity.nuget.newtonsoft-json": "3.0.2" }`
- `samples` 指向 `Samples~/ConnectDemo`
- `unity: "2021.3"` 最低引擎版本

---

## 3. .NET SDK 完善

### 3.1 当前架构

`packages/dotnet/` 包含：

```
Cinacoin.csproj          — 主库（net8.0）
CinacoinClient.cs        — HTTP API 客户端
Models/                     — 数据模型
Services/
├── CryptoUtils.cs          — 加密工具
├── RelayClient.cs          — WebSocket 中继客户端 ⭐
└── WalletService.cs        — 钱包服务封装
scripts/                    — 构建/发布脚本
Example/                    — 示例项目
dist/                       — JS 包装层（TypeScript 编译输出）
```

### 3.2 WC v2 协议实现状态

**CinacoinClient.cs (HTTP API 客户端)：**
- 基于 `HttpClient` 的 REST API 封装
- 支持账户查询、余额查询、交易签名、消息签名
- 通过中间 API 层间接实现 WC 功能

**Services/RelayClient.cs (WebSocket 中继)：**
- 使用 `System.Net.WebSockets.ClientWebSocket`
- 支持连接到 `wss://relay.cinacoin.com`
- 实现 `irn_subscribe` / `irn_unsubscribe` / `irn_publish` JSON-RPC 方法
- 心跳保持 30s 间隔

**Services/CryptoUtils.cs：**
- 提供 X25519、AES-256-CBC、ChaCha20-Poly1305 等加密原语
- 支持 WC v2 type-0 和 type-1 信封编码/解码

**Unity WCProtocol.cs (Unity C#)：**
- 完整的 WC v2 协议实现（约 1500 行）
- 包含 Curve25519 有限域运算、ChaCha20 核心、Poly1305 MAC
- 实现 PairingManager、SessionManager、RelayClient 全栈
- 支持 PlayerPrefs 会话持久化

### 3.3 限制说明

| 限制 | 详情 |
|------|------|
| .NET SDK 是 HTTP API 客户端 | 不直接实现 WC v2 协议，通过中间 API 层间接实现 |
| `RelayClient.cs` 是独立实现 | 使用 `System.Net.WebSockets` 但未与 `CinacoinClient` 完全集成 |
| Unity 的 `WCCrypto.cs` 有完整 WC v2 实现 | .NET SDK 的 `CryptoUtils.cs` 较简单，未完全对齐 |
| Curve25519 在 Unity 中是托管实现 | 性能较低，生产环境建议用 libsodium |

### 3.4 .csproj 配置

- Target: `net8.0`
- LangVersion: `12.0`
- Nullable: `enable`
- NuGet 元数据完整（作者、许可证、图标、README）
- Source Link 已启用
- 依赖：`System.Text.Json 8.0.5`、`Microsoft.Extensions.Http 8.0.1`、`Microsoft.Extensions.Logging.Abstractions 8.0.2`

---

## 4. 修复清单

### 已修复
- [x] 3 个包缺失 `dist/` → 已构建
- [x] 15 个包缺失 `exports` → 已添加
- [x] Unity .asmdef 使用 `overrideReferences: true` + 硬编码 dll → 改为 UPM 包引用
- [x] 缺失 Editor 测试 .asmdef → 已创建
- [x] 测试程序集缺少 `defineConstraints` → 已添加
- [x] `publish-all.js` 缺少 `--build-missing` → 已添加
- [x] `performance-utils` tsconfig `lib`/`target` 版本过低 → 升级到 ES2021

### 待办（非阻塞）
- [ ] `@cinacoin/i18n` (v2.0.0) 的 TypeScript 源文件有类型错误（`Cannot find module './types'`），需要源文件修复才能重新构建。当前 dist/ 已存在可用
- [ ] .NET SDK 的 `RelayClient` 与 `CinacoinClient` 深度集成（可选增强）
- [ ] Unity `WCCrypto.cs` 的 Curve25519 替换为 libsodium（性能优化）

---

## 5. 一键发布

```bash
# 干运行（检查哪些包需要发布）
pnpm run publish:dry-run

# 实际发布
pnpm run publish:all:force

# 或使用 Bash 脚本
pnpm run publish:all:sh

# 带过滤
./scripts/publish-all.sh --filter=adapter --publish
node scripts/publish-all.js --filter=react,ui --publish --concurrency=8
```
