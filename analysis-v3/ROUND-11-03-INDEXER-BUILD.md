# Round 11 — 交易历史索引器 + 构建验证

**日期:** 2026-05-26  
**范围:** `packages/tx-indexer` 创建/完善 + 构建验证 + npm publish 准备

---

## 1. 交易历史索引器 (tx-indexer)

### 1.1 概况

`@cinacoin/tx-indexer@0.1.0` 是一个轻量级交易历史索引器，已存在但有缺失的入口文件。

### 1.2 修复内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/index.ts` | **新建** | 包入口文件，导出 `TxIndexer`、`EventStore`、`IndexerServer`、`createIndexerServer` 及所有类型和 ABI 常量 |
| `README.md` | **新建** | 完整文档：安装、库用法、REST API 用法、端点表、查询参数、支持链列表 |
| `package.json` | **编辑** | `files` 字段添加 `README.md` |
| `tsconfig.json` | **编辑** | `exclude` 添加 `src/**/*.test.ts`，避免测试文件进入 dist |

### 1.3 已有架构 (审查确认)

**类型系统** (`src/types.ts`):
- `IndexedEvent` — 标准化事件结构，含 `chainId`、`eventType`、`blockNumber`、`timestamp`、`amount` (bigint)、`formattedAmount` 等
- `EventQuery` — 支持地址、链、事件类型、token、时间范围、分页、排序
- `PaginatedEvents` — 分页响应含 `total`、`limit`、`offset`、`hasMore`
- `IndexerConfig` / `ChainConfig` — 多链配置
- `RestApiConfig` / `ApiHealthStatus` — REST 配置与健康状态
- 预定义 ABI: ERC20 Transfer、Uniswap V2 Swap、Bridge Deposit/Withdrawal

**存储层** (`src/storage.ts`):
- SQLite (better-sqlite3)，WAL 模式，64MB 缓存
- `chain_state` 表记录各链最新索引块
- `indexed_events` 表含 8 个索引 (chain、type、block、time、from、to、token、复合地址)
- `EventStore` 类：批量写入、upsert by id、链状态管理、分页查询

**索引器** (`src/indexer.ts`):
- 支持链: ETH(1)、Polygon(137)、BSC(56)、Arbitrum(42161)、Optimism(10)、Base(8453)
- 事件签名: Transfer、Swap、Deposit、Withdrawal (4 种 topic)
- 批量扫描：按 batch size 分块处理区块范围
- 轮询机制：每链独立定时器，可配置间隔（默认 12s）
- viem 直接 RPC 请求 (`eth_getLogs`) 获取日志

**REST API** (`src/server.ts`):
- 纯 Node.js `http` 模块，无框架依赖
- 端点:
  - `GET /api/v1/health` — 健康检查 + 各链同步状态
  - `GET /api/v1/events` — 分页查询事件
  - `GET /api/v1/events/{id}` — 按 ID 查询单个事件
  - `GET /api/v1/chains` — 链同步状态列表
- 支持 CORS

### 1.4 测试

```
✓ src/indexer.test.ts (14 tests) — 全部通过

测试覆盖:
  - 表创建初始化
  - 事件保存/查询
  - 链状态更新
  - 批量保存 (10 条)
  - Upsert by ID (无重复)
  - 空数组保存
  - 分页 (limit/offset/hasMore)
  - 按 chainId 过滤
  - 按 eventType 过滤 (transfer/swap/deposit/withdrawal)
  - 按地址过滤 (from OR to)
  - 时间排序 (asc/desc)
  - 多链状态管理
```

### 1.5 dist/ 输出验证

```
index.js, index.d.ts          — 入口
indexer.js, indexer.d.ts      — 索引器核心
server.js, server.d.ts        — REST 服务器
storage.js, storage.d.ts      — SQLite 存储层
types.js, types.d.ts          — 类型定义
(+ 对应 .js.map / .d.ts.map source maps)
```

---

## 2. 构建验证

### 2.1 tx-indexer

```
pnpm build → tsc → ✅ 通过 (0 errors)
pnpm test  → vitest → ✅ 14/14 passed
```

### 2.2 多包构建 (turbo)

| 包 | 状态 | 备注 |
|----|------|------|
| `@cinacoin/tx-indexer` | ✅ 通过 | 本轮新增入口文件 |
| `@cinacoin/core-sdk` | ✅ 通过 | 依赖 siwe，均通过 |
| `@cinacoin/swap-sdk` | ⚠️ 修复后通过 | 见 2.3 |
| `@cinacoin/react` | ✅ 通过 | 缓存命中 |
| `@cinacoin/batch-transaction` | ✅ 通过 | 缓存命中 |
| `@cinacoin/gas-estimator` | ✅ 通过 | 缓存命中 |
| `@cinacoin/core-ui` | ❌ 失败 | **预先存在的错误**，与本轮无关 |

### 2.3 swap-sdk 修复

**问题:** `src/executors/uniswap.ts:343` — TypeScript 类型错误
```
TS2367: This comparison appears to be unintentional because 
the types `0x${string}` and "native" have no overlap.
```

**原因:** `route.toToken` 的类型是 `Address | "native"` (即 ``0x${string}` | "native"`)，代码先将其 as-cast 为 ``0x${string}`` 后再与 `"native"` 比较，TS 判定为不可能。

**修复:** 在 as-cast 之前进行 `"native"` 判断：
```typescript
// 修复前 (错误)
(route.toToken as `0x${string}`) === "native"  // TS2367

// 修复后 (正确)
route.toToken === "native" ? zeroAddress : (route.toToken as `0x${string}`)
```

修复后 `@cinacoin/swap-sdk` 构建通过，DTS 生成正常。

### 2.4 core-ui 预先存在错误

`@cinacoin/core-ui` 有大量预先存在的 TS 错误（i18n 模块缺少导出成员、未使用变量、泛型约束问题），与本轮无关，需单独修复。

---

## 3. npm publish 准备

### 3.1 核心包检查

| 包 | version | files 字段 | README | dist/ | publishConfig |
|----|---------|-----------|--------|-------|---------------|
| `@cinacoin/tx-indexer` | 0.1.0 | ✅ dist + README.md | ✅ 新建 | ✅ 完整 | access: public |
| `@cinacoin/core-sdk` | 0.2.0 | ✅ dist | ✅ 已有 | ✅ 完整 (174 files) | — |
| `@cinacoin/swap-sdk` | 0.2.0 | ✅ dist | ✅ 已有 | ✅ 完整 (6 files) | — |

### 3.2 npm pack --dry-run 结果

| 包 | 包大小 | 解包大小 | 文件数 |
|----|--------|---------|--------|
| `@cinacoin/tx-indexer@0.1.0` | 18.2 kB | 77.6 kB | 22 |
| `@cinacoin/core-sdk@0.2.0` | 247.7 kB | 1.3 MB | 174 |
| `@cinacoin/swap-sdk@0.2.0` | 28.9 kB | 163.1 kB | 6 |

所有包 dry-run 打包成功，无警告。

### 3.3 建议的 publish 前检查清单

- [x] TypeScript 编译通过
- [x] 测试全部通过 (14/14)
- [x] dist/ 输出完整 (js + d.ts + source maps)
- [x] README.md 存在
- [x] files 字段正确
- [x] publishConfig.access 设置 (tx-indexer: public)
- [x] npm pack --dry-run 成功
- [ ] ⚠️ 确认 npm token 已配置
- [ ] ⚠️ 确认包名在 npm 上未被占用
- [ ] ⚠️ core-sdk 和 swap-sdk 建议也添加 `publishConfig: { access: "public" }`

---

## 4. 变更摘要

### 新建文件
1. `packages/tx-indexer/src/index.ts` — 包入口
2. `packages/tx-indexer/README.md` — 文档

### 修改文件
1. `packages/tx-indexer/package.json` — `files` 添加 README.md
2. `packages/tx-indexer/tsconfig.json` — `exclude` 添加测试文件
3. `packages/swap-sdk/src/executors/uniswap.ts` — 修复 TS2367 类型错误

### 构建状态
- **tx-indexer**: ✅ 干净构建，14/14 测试通过
- **swap-sdk**: ✅ 修复后构建通过
- **core-sdk**: ✅ 构建通过

---

**结论:** `@cinacoin/tx-indexer` 已就绪，可发布。交易历史索引器支持 ETH/Polygon/BSC + Arbitrum/Optimism/Base，含完整的 REST API、SQLite 持久化、14 项单元测试通过。构建验证中发现并修复了 `swap-sdk` 的 TS 类型错误。`core-ui` 的预先存在错误不在本轮范围内。
