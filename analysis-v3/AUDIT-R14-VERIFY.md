# Cinacoin R14 聚焦审计报告 — R13修复验证 + 剩余问题扫描

**日期**: 2026-05-26  
**审计范围**: R13修复效果验证 + R12遗留问题扫描  
**依据**: 实际文件读取，无推测

---

## Part 1: R13 修复验证

### 1.1 Rust 服务器 Cargo.toml 依赖补全 ✅ 3/5 PASS, ❌ 2 FAIL

| 服务器 | 状态 | 详情 |
|--------|------|------|
| **relay-server** | ✅ PASS | 完整依赖：actix-web, tokio, redis (with tokio-comp/connection-manager/aio), sqlx (postgres/chrono/json/uuid), chacha20poly1305, x25519-dalek, sha2, prometheus, uuid, chrono 等 |
| **push-server** | ✅ PASS | 完整依赖：axum, tokio, tower-http (cors/trace), redis (tokio-comp/aio), reqwest (json), jsonwebtoken, ring, moka |
| **notify-server** | ✅ PASS | 完整依赖：axum, tokio, sqlx (postgres/chrono/json/uuid), redis (tokio-comp), reqwest (json) |
| **rpc-proxy** | ❌ FAIL | **只有 `[package]` 段落，完全没有 `[dependencies]` 段落。** 空壳 Cargo.toml，无法编译 |
| **keys-server** | ✅ PASS | 非常完整：chacha20poly1305, hkdf, sha2, sha3, x25519-dalek, ed25519-dalek, k256, zeroize, bs58, thiserror, anyhow 等 |

**rpc-proxy 是严重遗漏** — 这个服务声称是 "RPC proxy server"，但没有任何依赖，连基本的 web 框架都没有。

### 1.2 keys-server XOR → ChaCha20-Poly1305 替换 ✅ PASS

**文件**: `packages/keys-server/src/handlers/wallet_keys.rs`

验证结果：**已完全替换**。使用 ChaCha20-Poly1305 AEAD + HKDF-SHA256 派生密钥：

```rust
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Nonce,
};
use hkdf::Hkdf;
use sha2::Sha256;
```

关键安全特性确认：
- HKDF-SHA256 从 master secret 派生 256-bit 加密密钥
- ChaCha20-Poly1305 (IETF variant) 加密，12-byte nonce
- 输出格式: `base64(nonce(12) || ciphertext || tag(16))`
- `encryption_key.zeroize()` 使用后立即清零
- 解密端同样实现 zeroize

**评级**: 生产级实现，无明显安全缺陷。

### 1.3 Vue Mock Connect → 真实 WalletConnect ✅ PARTIAL

**文件**: `packages/vue/src/CinacoinProvider.vue`, `packages/vue/src/connectorManager.ts`

**验证**: Vue provider 不再使用 mock 连接。`CinacoinProvider.vue` 使用 `ConnectorManager` 类，该类从 `@cinacoin/core-sdk` 导入真实 `InjectedProvider`、`EvmAdapter`、`EventEmitter`：

```typescript
import {
  Connector,
  InjectedProvider,
  EvmAdapter,
  EventEmitter,
} from '@cinacoin/core-sdk';
```

**但是**，WalletConnect 本身仍是 placeholder：

```typescript
createWalletConnectConnector(): void {
    console.warn(
      '[Cinacoin] WalletConnect relay connector requires @cinacoin/core-sdk ' +
        'RelayTransport configuration...',
    );
}
```

**结论**: Injected providers (MetaMask, Rabby) 已真实实现。WalletConnect 连接本身仍是空壳 — 仅有元数据注册，无实际 WC v2 relay/session 实现。

### 1.4 Vue 事件泄漏修复 ✅ PASS

**文件**: `packages/vue/src/components.ts`

三个组件 (OcxConnectButton, OcxConnectModal, OcxChainSwitcher) 均使用**存储的引用函数**作为事件处理器：

```typescript
const onClickHandler = (): void => { ... };
const onDisconnectHandler = (): void => { ... };

onMounted(() => {
    el.addEventListener('ocx-click', onClickHandler);
    el.addEventListener('ocx-disconnect', onDisconnectHandler);
});

onBeforeUnmount(() => {
    el.removeEventListener('ocx-click', onClickHandler);
    el.removeEventListener('ocx-disconnect', onDisconnectHandler);
});
```

`addEventListener` 和 `removeEventListener` 使用**同一函数引用** ✅。

注意：`.js` 编译文件 (`components.js`) 仍然有旧的匿名函数泄漏模式，但那是编译产物，`.ts` 源码已修复。

### 1.5 .NET Keccak-256 真实性 ✅ PASS

**文件**: `packages/dotnet/Services/CryptoUtils.cs`

使用 **BouncyCastle.Cryptography** 的 `KeccakDigest(256)`，这是正确的 Keccak-256 实现：

```csharp
public static byte[] Keccak256(byte[] data)
{
    var digest = new KeccakDigest(256);
    digest.BlockUpdate(data, 0, data.Length);
    var result = new byte[digest.GetDigestSize()];
    digest.DoFinal(result, 0);
    return result;
}
```

文档注释正确指出 Keccak-256 ≠ SHA-256 ≠ NIST SHA-3-256（padding scheme 不同）。`DeriveEthAddress` 方法也正确使用 Keccak-256 做地址派生。

---

## Part 2: 剩余问题扫描 (R12 遗留)

### 2.1 relay-server TLS no-op ❌ 仍然存在

**文件**: `packages/relay-server/src/main.rs`

```rust
if config.tls_enabled() {
    // TLS setup would go here in production
    // For now, we just start without TLS since the TLS deps are complex
    server.run().await
} else {
    server.run().await
}
```

**两个分支完全相同**。TLS 启用与否不影响实际行为。`config.rs` 有 `tls_cert_path` / `tls_key_path` 字段和 `tls_enabled()` 方法，但 `main.rs` 中 TLS 分支是纯注释 + no-op。

**风险**: 生产部署中即使配置了 TLS 证书，流量仍然是明文。

### 2.2 check_nats no-op ❌ 仍然存在

**文件**: `packages/relay-server/src/health.rs`

```rust
async fn check_nats(nats_url: &str) -> DependencyHealth {
    let start = std::time::Instant::now();
    let _ = nats_url;
    let latency = start.elapsed().as_secs_f64() * 1000.0;

    DependencyHealth {
        status: "healthy".to_string(),
        latency_ms: Some(latency),
        details: None,
    }
}
```

`let _ = nats_url;` 明确 suppresses unused warning。**从不连接 NATS，从不 PING，永远返回 "healthy"**。报告的健康状态是假的。

### 2.3 Android build.gradle.kts — 缺少 Compose 和测试依赖 ⚠️

**文件**: `packages/android-kotlin/build.gradle.kts`

```kotlin
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.cinacoin.android"
    compileSdk = 34
    defaultConfig {
        minSdk = 24
    }
}

dependencies {
    implementation("com.walletconnect:android-core:1.15.0")
    implementation("com.walletconnect:sign:1.15.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

**缺失项**:
- ❌ 无 Compose 依赖 (无 UI 组件)
- ❌ 无测试依赖 (无 junit, no test runner)
- ❌ 无 Compose Compiler
- ❌ 无 material/material3

仅包含 WalletConnect SDK 和 coroutines。作为一个 "library" module 可以接受，但如果目标是完整 Android SDK 则缺失严重。

### 2.4 Polkadot SCALE 未经测试 ⚠️ 部分通过

**文件**: 
- `packages/core-sdk/src/adapters/polkadot.ts` — 存在 Polkadot 适配器
- `packages/core-sdk/tests/adapters/polkadot.test.ts` — **存在测试文件**

Polkadot 适配器存在于 core-sdk 且**有测试文件**。但 Polkadot 适配器在 cross-chain-sync 中**没有对应的 adapter 文件**（只有 evm, solana, bitcoin）。`ChainFamily` 类型声明了 "polkadot"，但 `StateSync.registerAdapter` 需要手动注册，目前没有内置的 polkadot sync adapter。

**结论**: Polkadot SCALE 编码/解码在 core-sdk 层级有测试覆盖 ✅，但在 cross-chain-sync 层级没有集成 ❌。

### 2.5 bitcoin/xrpl 未注册到 createAdapter() ❌ 仍然存在

**文件**: `packages/cross-chain-sync/src/sync.ts`

cross-chain-sync 的 `StateSync` 只有 `registerAdapter()` 方法（手动注册），**没有内置的 `createAdapter()` 函数**来自动创建适配器。

cross-chain-sync 中导出的适配器只有:
- `syncEvmState` (evm)
- `syncSolanaState` (solana)
- `syncBitcoinState` (bitcoin)

**没有 xrpl, polkadot, ton, tron 的 sync 适配器**。

core-sdk 中有 `adapter-bitcoin` 和 `adapter-xrpl` 包，但它们**没有自动注册到任何工厂函数**。它们是独立导出的，需要消费者手动集成。

**影响**: 消费者需要手动 wire 这些适配器 — 不是一键可用的。

### 2.6 solana.ts / bitcoin.ts 零 try/catch ❌ 确认

**文件**: 
- `packages/core-sdk/src/adapters/solana.ts` — **0 个 try/catch**
- `packages/core-sdk/src/adapters/bitcoin.ts` — **0 个 try/catch**

所有异步操作 (`fetch`, `provider.connect()`, `provider.signMessage()` 等) 都没有 try/catch 包装。错误直接 throw 到调用方。

这不算"bug"（调用方可以 catch），但对于 SDK 级别的代码来说，缺少防御性错误处理（网络超时、无效响应、空值）意味着**调用方必须非常仔细地处理所有边缘情况**，否则会有未捕获的 Promise rejection。

### 2.7 docker-compose 默认 DB 凭据 ❌ 确认

**文件**: `docker-compose.yml`

```yaml
db:
  image: postgres:15-alpine
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_USER=user
    - POSTGRES_PASSWORD=pass
    - POSTGRES_DB=cinacoin
```

**硬编码凭据**: `user:pass` — 任何人复制 docker-compose.yml 并运行都会使用默认凭据暴露 PostgreSQL 到 5432 端口。

keys-server 也引用了 `DATABASE_URL=postgresql://user:pass@db:5432/cinacoin`。

**风险等级**: 低（仅影响本地开发），但如果有人不经修改就部署到可访问的网络，这是中等风险。

---

## Part 3: 快速验证

### 3.1 Rust cargo check

rpc-proxy 的 Cargo.toml 没有 `[dependencies]` 段，cargo check 会报 warning 但不会失败（空 crate）。对其他服务器建议执行 cargo check 确认编译。

### 3.2 Vue 测试

Vue 测试文件存在 (`OnChainUXProvider.test.ts`, `eventListenerLeak.test.ts`, `components.test.ts`, `composables.test.ts`)，但由于项目使用 TypeScript 且需要 `@cinacoin/core-sdk` 作为依赖，测试需要正确配置后运行。

---

## 总结

### R13 修复状态

| 修复项 | 状态 | 评级 |
|--------|------|------|
| Rust 服务器依赖补全 | ⚠️ 4/5 | rpc-proxy 完全缺失 deps |
| keys-server XOR 替换 | ✅ | 生产级 ChaCha20-Poly1305 |
| Vue mock connect | ⚠️ | Injected providers 真实，WalletConnect 仍为空壳 |
| Vue 事件泄漏 | ✅ | 全部使用存储引用 |
| .NET Keccak-256 | ✅ | BouncyCastle 正确实现 |

### R12 遗留问题状态

| 问题 | 状态 | 严重程度 |
|------|------|----------|
| relay-server TLS no-op | ❌ 未修复 | 🟡 中 (生产部署明文) |
| check_nats no-op | ❌ 未修复 | 🟡 中 (假健康报告) |
| Android Compose/测试缺失 | ⚠️ 部分 | 🟢 低 (library 可能够用) |
| Polkadot SCALE 测试 | ⚠️ 部分 | 🟢 低 (core-sdk 有测试) |
| bitcoin/xrpl 未自动注册 | ❌ 未修复 | 🟢 低 (手动 wire 可行) |
| solana/bitcoin 零 try/catch | ❌ 未修复 | 🟡 中 (调用方负担) |
| docker-compose 默认凭据 | ❌ 未修复 | 🟡 中 (仅开发环境) |

### 建议优先级

1. **P0**: rpc-proxy Cargo.toml 补全 `[dependencies]`（否则服务无法编译/运行）
2. **P1**: relay-server TLS 实际实现（两个分支相同是明显的未完成工作）
3. **P1**: check_nats 实现真实 NATS 连接检查（假健康报告误导运维）
4. **P2**: docker-compose 凭据改为环境变量默认值 + 警告注释
5. **P2**: solana/bitcoin 适配器添加基础 try/catch 错误处理
6. **P3**: Vue WalletConnect 真实 relay 实现（目前仅 placeholder）
7. **P3**: Android 添加 Compose 和测试依赖（如果需要完整 SDK）
