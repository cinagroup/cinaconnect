# ROUND-15-01-RUST-ERRORS — 补完报告

**日期:** 2026-05-26
**范围:** relay-server TLS + solana adapter + docker-compose 凭据

---

## 1. relay-server TLS 验证和配置检查

**文件:** `packages/relay-server/src/main.rs`, `packages/relay-server/src/config.rs`

**状态: ✅ 已实现（无需改动）**

TLS 分支已经包含完整的配置验证逻辑：

- `config.rs`: `tls_enabled()` 返回 `cert_path.is_some() && key_path.is_some()`，仅在两者都设置时启用 TLS
- `main.rs` TLS 分支（line ~110-127）:
  1. **文件存在性检查** — `std::path::Path::new(cert_path).exists()` 和 `key_path` 同理，缺失则 `panic!`
  2. **OpenSSL acceptor 构建** — 使用 `mozilla_intermediate` 安全配置
  3. **私钥匹配验证** — `builder.check_private_key()` 确保证书和私钥配对
  4. **明文日志** — 非 TLS 分支明确打印 `"relay server listening (plaintext)"`

**结论:** TLS 验证逻辑已经到位，不需要补充。

---

## 2. Solana adapter try/catch 补全

**文件:** `packages/core-sdk/src/adapters/solana.ts`

**状态: ✅ 已实现（无需改动）**

以下关键函数均已包含 try/catch 和统一错误格式：

| 函数 | try/catch | 错误前缀 |
|---|---|---|
| `getBalance()` (直接 RPC) | ✅ | `Solana getBalance failed:` |
| `getBalance()` (connection fallback) | ✅ | `Solana connection getBalance failed:` |
| `sendTransaction()` (直接 RPC) | ✅ | `Solana sendTransaction failed:` |
| `sendTransaction()` (connection fallback) | ✅ | `Solana connection sendRawTransaction failed:` |
| `_getLatestBlockhash()` | ✅ | `Solana _getLatestBlockhash failed:` |
| `_getAccountInfo()` | ✅ | `Solana _getAccountInfo failed:` |
| `request()` (dispatch) | ✅ | `Unsupported Solana method:` |

所有 catch 块统一使用：
```typescript
if (err instanceof Error && err.message.startsWith('Solana RPC error')) throw err;
throw new Error(`Solana <fn> failed: ${err instanceof Error ? err.message : String(err)}`);
```

**结论:** try/catch 已经全面覆盖，错误格式统一。无需改动。

---

## 3. docker-compose 默认凭据检查

**文件:** `docker-compose.yml`, `.env.example` (新建)

**状态: ✅ 已修复**

### 问题
`docker-compose.yml` 中 PostgreSQL 和 keys-server 使用了硬编码默认值 `cinacoin`：
- `POSTGRES_PASSWORD:-cinacoin` — 如果未设环境变量，使用弱密码
- `POSTGRES_USER:-cinacoin` / `POSTGRES_DB:-cinacoin` — 同样

### 修复
- 移除所有 `:-default` 回退值，改为**强制环境变量** `${POSTGRES_USER}` / `${POSTGRES_PASSWORD}` / `${POSTGRES_DB}`
- 现在如果 `.env` 中未定义这些变量，docker-compose 会报错提示，避免使用弱默认密码

### 配套
- 创建 `.env.example` 模板，说明所有必要环境变量
- 标注 `<CHANGE_ME>` 位置需要修改

### 变更行
```diff
- POSTGRES_USER=${POSTGRES_USER:-cinacoin}
- POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-cinacoin}
- POSTGRES_DB=${POSTGRES_DB:-cinacoin}
+ POSTGRES_USER=${POSTGRES_USER}
+ POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
+ POSTGRES_DB=${POSTGRES_DB}

- DATABASE_URL=postgresql://${POSTGRES_USER:-cinacoin}:${POSTGRES_PASSWORD:-cinacoin}@db:5432/${POSTGRES_DB:-cinacoin}
+ DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

---

## 总结

| 修复项 | 状态 | 改动 |
|---|---|---|
| relay-server TLS 验证 | ✅ 已存在 | 无代码改动 |
| solana adapter try/catch | ✅ 已存在 | 无代码改动 |
| docker-compose 默认凭据 | ✅ 已修复 | 移除 4 处硬编码默认值 + 新建 .env.example |

**总代码改动:** `docker-compose.yml` 2 处 edit + `.env.example` 新建文件
