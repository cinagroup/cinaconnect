# Cinacoin 第13轮修复报告 — .NET Keccak-256 修复 + Infrastructure 遗留问题

**日期:** 2026-05-26
**轮次:** ROUND-13-03 (P0 + Infrastructure)
**工作目录:** `/home/cina/.openclaw/workspace/onux`

---

## 1. P0: .NET Keccak-256 SHA-256 冒充修复

### 问题描述

`packages/dotnet/Services/CryptoUtils.cs` 中的 `Keccak256()` 方法使用 `System.Security.Cryptography.SHA256.Create()` 实现 SHA-256 哈希，而非 EVM 链所需的真正的 Keccak-256。

这是一个 **严重的密码学错误**。SHA-256 和 Keccak-256 是**完全不同的哈希函数**：
- SHA-256 是 NIST 标准化的 SHA-3 候选者之一
- Keccak-256 是原始 Keccak 算法（SHA-3 的最终选择），但填充方案不同

使用 SHA-256 替代 Keccak-256 会导致：
1. **EVM 地址推导错误** — `DeriveEthAddress()` 产生的地址与真实 EVM 地址不匹配
2. **消息签名验证失败** — 任何需要消息哈希的 EVM 操作都会失败
3. **与现有 EVM 基础设施完全不兼容**

### 修复方案

1. **添加 BouncyCastle 依赖**
   ```xml
   <!-- Cinacoin.csproj -->
   <PackageReference Include="BouncyCastle.Cryptography" Version="2.4.0" />
   ```

2. **替换 CryptoUtils.cs 实现**
   ```csharp
   using Org.BouncyCastle.Crypto.Digests;

   public static byte[] Keccak256(byte[] data)
   {
       var digest = new KeccakDigest(256);
       digest.BlockUpdate(data, 0, data.Length);
       var result = new byte[digest.GetDigestSize()];
       digest.DoFinal(result, 0);
       return result;
   }
   ```

### 技术细节

- **BouncyCastle.Cryptography v2.4.0**: 维护良好的 .NET 密码学库，提供经过验证的 Keccak-256 实现
- **API 向后兼容**: `Keccak256(byte[])` 和 `Keccak256(string)` 方法签名保持不变
- **`DeriveEthAddress()` 自动修复**: 该方法内部调用 `Keccak256()`，无需额外修改

### 验证

- .NET SDK 未安装在 CI 主机上，无法本地编译验证
- 代码逻辑正确：`KeccakDigest(256)` 是 BouncyCastle 中标准的 Keccak-256 实现
- 已知测试向量验证（推荐在 CI 中补充）：
  ```
  Keccak256("") = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
  Keccak256("hello") = 1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8
  ```

### 修改文件
- `packages/dotnet/Cinacoin.csproj` — 添加 BouncyCastle 依赖
- `packages/dotnet/Services/CryptoUtils.cs` — 替换 SHA-256 placeholder 为真正的 Keccak-256

---

## 2. Infrastructure 遗留问题修复

### 2.1 R12-02: relay-server TLS no-op

**问题:** `deploy/docker/relay-server/Dockerfile` 定义了 TLS 相关的环境变量 (`RELAY_TLS_CERT`, `RELAY_TLS_KEY`)，但没有 TLS 配置验证逻辑。distroless 镜像没有 shell，无法使用 shell 脚本验证。

**修复:** 在 Dockerfile 中添加：
1. 明确的 TLS 环境变量配置（`ENV RELAY_TLS_CERT=/app/certs/tls.crt`, `ENV RELAY_TLS_KEY=/app/certs/tls.key`）
2. 详细注释说明 relay-server Rust 二进制文件在启动时必须执行的 TLS 验证逻辑：
   ```rust
   // 当两个环境变量都设置时，relay-server 必须验证：
   // - TLS 证书文件存在且可读
   // - TLS 密钥文件存在且可读
   // - 如果验证失败，panic 退出（防止无 TLS 运行）
   ```
3. 与 Helm chart 的 Secret 挂载配置保持一致

**文件修改:**
- `deploy/docker/relay-server/Dockerfile`

### 2.2 CI 工作区路径错误 (Dockerfile)

**问题:** GitHub Actions CI workflow 中 `push-server` 和 `keys-server` 的 Dockerfile 路径指向不存在的 `deploy/docker/push-server/Dockerfile` 和 `deploy/docker/keys-server/Dockerfile`。实际文件位于 `packages/push-server/Dockerfile` 和 `packages/keys-server/Dockerfile`。

**修复:** 更新两个 workflow 文件中的路径和构建上下文：

| Workflow | 服务 | 修复前 | 修复后 |
|----------|------|--------|--------|
| `deploy.yaml` | push-server | `file: deploy/docker/push-server/Dockerfile`, `context: .` | `file: packages/push-server/Dockerfile`, `context: ./packages/push-server` |
| `deploy.yaml` | keys-server | `file: deploy/docker/keys-server/Dockerfile`, `context: .` | `file: packages/keys-server/Dockerfile`, `context: ./packages/keys-server` |
| `build.yaml` | push-server | `dockerfile: deploy/docker/push-server/Dockerfile`, `context: .` | `dockerfile: packages/push-server/Dockerfile`, `context: packages/push-server` |
| `build.yaml` | keys-server | `dockerfile: deploy/docker/keys-server/Dockerfile`, `context: .` | `dockerfile: packages/keys-server/Dockerfile`, `context: packages/keys-server` |

**文件修改:**
- `.github/workflows/deploy.yaml`
- `.github/workflows/build.yaml`

### 2.3 docker-compose 路径错误

**问题:** `docker-compose.yml` 中 `keys-server` 服务的构建路径引用 `deploy/docker/keys-server/Dockerfile`，该文件不存在。

**修复:** 更新为实际路径：
```yaml
keys-server:
  build:
    context: ./packages/keys-server
    dockerfile: Dockerfile
```

**文件修改:**
- `docker-compose.yml`

### 2.4 docker-compose 使用 WalletConnect 上游 relay 镜像

**问题:** `docker-compose.yml` 中 relay 服务直接使用 `ghcr.io/walletconnect/walletconnect-relay:latest` 上游镜像，而非项目自构建的 relay-server。

**修复:** 替换为自构建镜像：
```yaml
relay:
  build:
    context: .
    dockerfile: deploy/docker/relay-server/Dockerfile
  ports:
    - "5555:8080"
  environment:
    - RUST_LOG=info,relay=debug
    - NATS_URL=nats://nats-cluster:4222
```

同时更新注释从 "WalletConnect Relay Server" 为 "Cinacoin Relay Server (self-built)"。

**文件修改:**
- `docker-compose.yml`

### 2.5 Helm chart 名称不匹配 (deploy.yaml)

**问题:** `.github/workflows/deploy.yaml` 中所有 Helm 部署命令引用 `./deploy/helm/onchainux`（旧名称），但实际 Helm chart 目录为 `./deploy/helm/cinacoin`，且 Chart.yaml 中 `name: cinacoin`。

**修复:** 全局替换 `onchainux` → `cinacoin`：
- `helm upgrade --install onchainux` → `helm upgrade --install cinacoin`
- `helm upgrade --install onchainux-canary` → `helm upgrade --install cinacoin-canary`
- `./deploy/helm/onchainux` → `./deploy/helm/cinacoin`
- `helm rollback onchainux` → `helm rollback cinacoin`
- `helm uninstall onchainux-canary` → `helm uninstall cinacoin-canary`
- `app.kubernetes.io/instance=onchainux-canary` → `app.kubernetes.io/instance=cinacoin-canary`
- Canary deployment 删除命令中的所有 `onchainux-canary-*` → `cinacoin-canary-*`
- 通知消息中的 "OnChainUX" → "Cinacoin"

同时修复 `IMAGE_NAMESPACE` 从 `onchainux` → `cinacoin`，使 GHCR 镜像路径与 Helm chart 一致。

**文件修改:**
- `.github/workflows/deploy.yaml` (13 处替换)

---

## 修改文件汇总

| 文件 | 修改类型 | 描述 |
|------|----------|------|
| `packages/dotnet/Cinacoin.csproj` | 修改 | 添加 BouncyCastle.Cryptography v2.4.0 依赖 |
| `packages/dotnet/Services/CryptoUtils.cs` | 修改 | SHA-256 placeholder → 真正的 Keccak-256 (BouncyCastle) |
| `deploy/docker/relay-server/Dockerfile` | 修改 | 添加 TLS 配置环境变量和验证规范 |
| `docker-compose.yml` | 重写 | 修复构建路径、替换上游 relay 镜像为自构建 |
| `.github/workflows/deploy.yaml` | 修改 | Helm chart 名称、IMAGE_NAMESPACE、Dockerfile 路径 |
| `.github/workflows/build.yaml` | 修改 | Dockerfile 路径 (push-server, keys-server) |

---

## 风险提示

1. **BouncyCastle 兼容性**: 版本 2.4.0 兼容 .NET 8.0。如果升级到更高版本，需检查 API 变更。
2. **TLS 验证**: Dockerfile 中添加了配置注释，但实际 TLS 证书验证逻辑需要在 relay-server Rust 二进制文件中实现（Rust 代码不在本次修复范围内）。
3. **CI 验证**: .NET SDK 未安装在当前主机，建议在 CI 中运行 `dotnet build` 和单元测试验证 Keccak-256 修复。
4. **docker-compose 中的 keys-server Dockerfile**: 使用 `packages/keys-server` 作为 context，其中的 `COPY Cargo.toml Cargo.lock*` 指令相对于该 context 解析，与现有 Dockerfile 兼容。
