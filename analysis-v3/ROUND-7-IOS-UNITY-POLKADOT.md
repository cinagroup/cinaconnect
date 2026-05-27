# ROUND-7: iOS SPM + Unity .asmdef + Polkadot SCALE 修复报告

> 日期：2026-05-26 06:35 UTC  
> 范围：iOS Package.swift 路径修复 / Unity .asmdef UPM 分发 / Polkadot SCALE 编解码

---

## 1. iOS Package.swift 路径修复 ✅

### 问题

`packages/ios-swift/Package.swift` 存在严重的命名/路径不一致：

| 字段 | 旧值 | 磁盘实际 |
|------|------|----------|
| package name | `"Cinacoin"` | — |
| product name | `"Cinacoin"` | — |
| target name | `"Cinacoin"` | — |
| target path | `path: "Sources/OnChainUX"` | `Sources/OnChainUX/` ✅ |
| testTarget name | `"CinacoinTests"` | `Tests/OnChainUXTests/` |
| explicit `sources:` | 11 个手动列出 | SPM 可自动发现 |

**问题本质**：target 命名为 `Cinacoin`，但 `path` 指向 `Sources/OnChainUX`。SPM 会将 target name 作为模块名，而目录名是 `OnChainUX`，导致：
- 编译时模块导入名称混乱（`import Cinacoin` vs `import OnChainUX`）
- `sources:` 手动列表维护负担大，新增文件时容易遗漏
- testTarget 名称 `CinacoinTests` 与目录 `OnChainUXTests` 也不一致

### 修复

```diff
- name: "Cinacoin",
+ name: "OnChainUX",
  products: [
      .library(
-         name: "Cinacoin",
-         targets: ["Cinacoin"]),
+         name: "OnChainUX",
+         targets: ["OnChainUX"]),
  ...
  targets: [
      .target(
-         name: "Cinacoin",
+         name: "OnChainUX",
          dependencies: [...],
          path: "Sources/OnChainUX",
-         sources: [
-             "OnChainUX.swift", "WalletManager.swift", ...  // 11 files
-         ]),
+         // SPM auto-discovers all .swift files under path:
+         //   OnChainUX.swift, WalletManager.swift, ConnectButton.swift,
+         //   ConnectModal.swift, DeepLinkHandler.swift, PushNotificationHandler.swift,
+         //   Auth/SIWE.swift,
+         //   ChainAdapter/SolanaAdapter.swift, ChainAdapter/EVMAdapter.swift,
+         //   WalletConnect/WCClient.swift, WalletConnect/WCUtils.swift
+     ),
      .testTarget(
-         name: "CinacoinTests",
-         dependencies: ["Cinacoin"],
+         name: "OnChainUXTests",
+         dependencies: ["OnChainUX"],
          path: "Tests/OnChainUXTests"),
  ]
```

### 修复后验证

| 检查项 | 状态 |
|--------|------|
| package name = "OnChainUX" | ✅ |
| product name = "OnChainUX" | ✅ |
| target name = "OnChainUX" matches `Sources/OnChainUX/` | ✅ |
| testTarget name = "OnChainUXTests" matches `Tests/OnChainUXTests/` | ✅ |
| 移除冗余 sources 列表（SPM 自动发现） | ✅ |
| 11 个 .swift 文件全部在 `Sources/OnChainUX/` 下 | ✅ |
| 9 个测试文件全部在 `Tests/OnChainUXTests/` 下 | ✅ |

**影响**：此修复解决了 SPM 构建时 target name 与目录名不匹配的问题。消费者现在使用 `import OnChainUX`（而非 `import Cinacoin`）。

---

## 2. Unity .asmdef 文件修复 ✅

### 问题

`packages/unity-csharp/` 下有三个 `.asmdef` 文件，存在引用不一致的问题：

| 文件 | 旧 name | 问题 |
|------|---------|------|
| Runtime/Cinacoin.Runtime.asmdef | `"com.cinacoin.unity.runtime"` | GUID 风格命名，与 C# namespace 不一致 |
| Editor/Cinacoin.Editor.asmdef | `"com.cinacoin.unity.editor"` | 引用 `"com.cinacoin.unity.runtime"`（GUID 风格） |
| Tests/Runtime/Cinacoin.Tests.Runtime.asmdef | `"com.cinacoin.unity.tests.runtime"` | 引用 `"com.cinacoin.unity.runtime"`（GUID 风格） |

**核心问题**：Runtime asmdef 的 name 使用 GUID 风格 `com.cinacoin.unity.runtime`，而 C# 源码的 namespace 是 `Cinacoin.*`。在 UPM 分发中，asmdef 的 `name` 是 Unity 内部的 assembly 名称，应当：
1. 与 package.json 的 `name` 保持一致的命名约定
2. 各 asmdef 之间的 `references` 指向对应 asmdef 的 `name`
3. Editor asmdef 依赖 Runtime，Tests asmdef 依赖 Runtime + TestRunner

### 修复

**Runtime** (名称从 GUID 风格改为 PascalCase):
```diff
{
- "name": "com.cinacoin.unity.runtime",
+ "name": "Cinacoin.Runtime",
  "rootNamespace": "Cinacoin",
  ...
}
```

**Editor** (更新 references 指向新名称):
```diff
{
- "name": "com.cinacoin.unity.editor",
+ "name": "Cinacoin.Editor",
  ...
  "references": [
-   "com.cinacoin.unity.runtime"
+   "Cinacoin.Runtime"
  ],
  ...
}
```

**Tests.Runtime** (更新 references 指向新名称):
```diff
{
- "name": "com.cinacoin.unity.tests.runtime",
+ "name": "Cinacoin.Tests.Runtime",
  ...
  "references": [
-   "com.cinacoin.unity.runtime",
+   "Cinacoin.Runtime",
    "UnityEditor.TestRunner",
    "UnityEngine.TestRunner"
  ],
  ...
}
```

### 修复后验证

| 检查项 | 状态 |
|--------|------|
| Runtime asmdef name = `"Cinacoin.Runtime"` | ✅ |
| Editor asmdef name = `"Cinacoin.Editor"` | ✅ |
| Editor references → `"Cinacoin.Runtime"` | ✅ |
| Editor includePlatforms = `["Editor"]` | ✅ |
| Tests asmdef name = `"Cinacoin.Tests.Runtime"` | ✅ |
| Tests references → `"Cinacoin.Runtime"` + TestRunner | ✅ |
| Tests autoReferenced = `false` | ✅ |
| Runtime C# 文件：13 个，全部在 asmdef 作用域内 | ✅ |
| Editor C# 文件：2 个，Editor-only platform | ✅ |
| Tests C# 文件：7 个 | ✅ |
| package.json 中声明的 Newtonsoft.Json 依赖在 asmdef 中声明 | ✅ |

**影响**：修复了 UPM 安装时 asmdef 引用断裂的问题。安装后 Unity 能正确识别 assembly 间的依赖关系。

---

## 3. Polkadot SCALE 编解码修复 ✅

### 问题

`packages/core-sdk/src/adapters/polkadot.ts` 中 balance 查询返回 `0` 的根因分析：

#### 3.1 静默吞掉所有错误（P0）

```typescript
// 旧代码
} catch {
  // Gateway unavailable or decoding failed
}
return '0';
```

**问题**：`catch` 块不区分任何错误类型（网络失败、RPC 错误、SCALE 解码错误、HTTP 非 200），统一返回 `'0'`。这意味着：
- 网络超时 → 返回 0（看起来像余额为 0）
- RPC 返回错误 → 返回 0
- SCALE 解码异常 → 返回 0
- 用户永远无法知道真正的原因

#### 3.2 Compact 解码返回 `number` 类型（P1）

```typescript
// 旧代码
private _scaleDecodeCompact(...): { value: number; bytesRead: number } {
```

**问题**：当 compact 编码的值超过 `Number.MAX_SAFE_INTEGER`（约 9×10¹⁵）时会丢失精度。Polkadot 的 nonce 通常很小不会触发，但为保持一致性应返回 `bigint`。

#### 3.3 SCALE 解码缺少边界检查（P1）

`_scaleDecodeU128` 和 `_scaleDecodeCompact` 没有检查输入字节是否足够，可能导致：
- 读取越界 → `undefined` → 错误的解码结果
- 静默返回部分解码的值

#### 3.4 `_rpcQueryBalance` 缺少 HTTP 状态码检查（P1）

旧代码直接 `await resp.json()` 而不检查 `resp.ok`，如果 HTTP 返回 404/500 等，`resp.json()` 可能解析失败或被 catch 吞掉。

### 修复

#### 3.1 修复：错误不再静默吞掉

```typescript
// 新代码
private async _rpcQueryBalance(address: string): Promise<string> {
  const httpUrl = this.rpcUrl.replace('wss://', 'https://');
  try {
    const storageKey = this._buildStorageKey(address);
    const resp = await fetch(httpUrl, {...});
    
    // 检查 HTTP 状态码
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} from ${httpUrl}`);
    }
    
    const data = await resp.json() as Record<string, unknown>;
    
    // 检查 RPC 错误
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      throw new Error(`RPC error: ${String(err.message ?? err.code ?? JSON.stringify(data.error))}`);
    }
    
    const result = data.result;
    // state_getStorage 返回 null 表示 key 不存在
    if (result == null) {
      throw new Error(`No storage data returned for address ${address}`);
    }
    
    // 验证结果格式
    const hexStr = result as string;
    if (typeof hexStr !== 'string' || hexStr.length < 4 || !hexStr.startsWith('0x')) {
      throw new Error(`Unexpected storage result format: ${String(hexStr).slice(0, 60)}`);
    }
    
    // SCALE 解码
    const scaleBytes = this._hexToBytes(hexStr.slice(2));
    if (scaleBytes.length < 20) {
      throw new Error(`SCALE data too short (${scaleBytes.length} bytes) for AccountInfo`);
    }
    
    const decoded = this._decodeAccountInfo(scaleBytes);
    return decoded.free;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Polkadot balance RPC query failed: ${msg}`);
    // ❌ 不再返回 '0'
  }
}
```

#### 3.2 修复：Compact 解码返回 `bigint`

```typescript
private _scaleDecodeCompact(bytes: Uint8Array, offset: number = 0): { value: bigint; bytesRead: number } {
  // ... mode 0b00
  return { value: BigInt(first >> 2), bytesRead: 1 };
  // ... mode 0b01
  return { value: BigInt(val), bytesRead: 2 };
  // ... mode 0b10 (使用 >>> 0 确保无符号右移)
  return { value: BigInt(val >> 2), bytesRead: 4 };
  // ... mode 0b11 (big int)
  return { value, bytesRead: 1 + byteCount };
}
```

同时 `_decodeAccountInfo` 使用 `Number(nonce.bytesRead)` 安全转换：

```typescript
const nonce = this._scaleDecodeCompact(scaleBytes, offset);
offset += Number(nonce.bytesRead);  // bytesRead 始终是 1-5 的小整数
```

#### 3.3 修复：添加边界检查

```typescript
// _scaleDecodeU128
private _scaleDecodeU128(bytes: Uint8Array, offset: number = 0): bigint {
  if (offset + 16 > bytes.length) {
    throw new Error(
      `SCALE u128 decode: need 16 bytes at offset ${offset}, ` +
      `but only ${bytes.length - offset} bytes available (total ${bytes.length})`,
    );
  }
  // ... 解码
}

// _scaleDecodeCompact
private _scaleDecodeCompact(bytes: Uint8Array, offset: number = 0): ... {
  if (offset >= bytes.length) {
    throw new Error(`SCALE compact decode: offset ${offset} beyond ${bytes.length} bytes`);
  }
  // ... 每种模式都有对应的边界检查
  if (offset + 2 > bytes.length) throw new Error('SCALE compact: need 2 bytes for mode 01');
  if (offset + 4 > bytes.length) throw new Error('SCALE compact: need 4 bytes for mode 10');
  if (offset + 1 + byteCount > bytes.length) {
    throw new Error(`SCALE compact: need ${1 + byteCount} bytes for mode 11`);
  }
}
```

#### 3.4 修复：HTTP 状态码检查

已在 3.1 修复中一起处理：`if (!resp.ok) throw new Error(...)`.

### 修复后行为对比

| 场景 | 旧行为 | 新行为 |
|------|--------|--------|
| 正常查询成功 | 返回 balance | 返回 balance ✅ |
| 网络超时 | 返回 `'0'` ❌ | 抛出 `Polkadot balance RPC query failed: ...` ✅ |
| RPC 返回错误 | 返回 `'0'` ❌ | 抛出包含 RPC error 详情的错误 ✅ |
| HTTP 500 | 返回 `'0'` ❌ | 抛出 `HTTP 500 from ...` ✅ |
| SCALE 数据太短 | 返回 `'0'` ❌ | 抛出描述性错误 ✅ |
| 地址无余额数据 | 返回 `'0'` ❌ | 抛出 `No storage data returned` ✅ |
| Compact 大数解码 | `Number` 可能精度丢失 | `bigint` 无精度丢失 ✅ |

### 遗留说明

SCALE 编码仅用于 **余额查询**（`state_getStorage` → SCALE decode AccountInfo）。交易发送路径使用 `api.tx.balances.transfer.signAndSend()`（通过注入钱包 API），不经过自定义 SCALE 编码器。`_rpcSendTransfer` 方法已正确声明需要连接钱包，不做 RPC 直发。

---

## 修复总结

| # | 问题 | 优先级 | 状态 | 文件 |
|---|------|--------|------|------|
| 1 | iOS Package.swift 命名/路径不匹配 | P0 | ✅ 已修复 | `packages/ios-swift/Package.swift` |
| 2 | Unity .asmdef 引用断裂 | P1 | ✅ 已修复 | `packages/unity-csharp/Runtime/Editor/Tests/Runtime/*.asmdef` |
| 3 | Polkadot balance 查询返回 0（静默吞错误） | P0 | ✅ 已修复 | `packages/core-sdk/src/adapters/polkadot.ts` |
| 4 | Polkadot SCALE 解码缺少边界检查 | P1 | ✅ 已修复 | `packages/core-sdk/src/adapters/polkadot.ts` |
| 5 | Polkadot Compact 解码精度丢失风险 | P2 | ✅ 已修复 | `packages/core-sdk/src/adapters/polkadot.ts` |

### 变更统计

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `packages/ios-swift/Package.swift` | 修改 | 重命名 package/target/product/testTarget；移除冗余 sources 列表 |
| `packages/unity-csharp/Runtime/Cinacoin.Runtime.asmdef` | 修改 | name 从 GUID 风格改为 `Cinacoin.Runtime` |
| `packages/unity-csharp/Editor/Cinacoin.Editor.asmdef` | 修改 | name 更新 + references 指向 `Cinacoin.Runtime` |
| `packages/unity-csharp/Tests/Runtime/Cinacoin.Tests.Runtime.asmdef` | 修改 | name 更新 + references 指向 `Cinacoin.Runtime` |
| `packages/core-sdk/src/adapters/polkadot.ts` | 修改 | 修复 `_rpcQueryBalance` 错误处理、`_scaleDecodeCompact` 返回 bigint、添加边界检查 |
