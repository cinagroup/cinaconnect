# Bundler

> Cinacoin ERC-4337 Bundler — 用户操作打包与提交服务。

## 架构

```
┌──────────┐     HTTP       ┌──────────┐     RPC       ┌─────────────┐
│  Client  │ ────────────▶  │ Bundler  │ ──────────▶  │  EntryPoint │
│ (SDK)    │   eth_sendUO   │          │              │   Contract  │
└──────────┘                └────┬─────┘              └─────────────┘
                                 │
                            ┌────┴────┐
                            │Mempool  │
                            │(local)  │
                            └─────────┘
```

Bundler 是 Cinacoin 的 ERC-4337 基础设施组件。它接收 UserOperations，验证它们，打包成批量交易，并提交到 EntryPoint 合约。

## 技术栈

- **语言**: Rust
- **Web 框架**: Actix-web
- **以太坊库**: Alloy
- **规范**: ERC-4337 (Account Abstraction)

## Mempool 管理

### 操作生命周期

```
Received → Validated → Mempool → Bundled → Submitted → On-chain
```

### 验证规则

1. **签名验证**: 验证 UserOperation 签名
2. **Paymaster 验证**: 检查 Paymaster 余额和有效性
3. **Gas 估算**: 确保 gas 限制足够
4. **Nonce 检查**: 防止重放
5. **优先级费**: 确保 Bundler 获得足够补偿

### Bundling 策略

- 每 bundle 最大操作数: 可配置 (`MAX_OPS_PER_BUNDLE`)
- Bundle 触发条件: 达到最大操作数或超时
- Gas 价格: 动态估算，跟踪链上 gas 价格

## 配置

### 环境变量

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `BUNDLER_HOST` | 监听地址 | `0.0.0.0` | ✅ |
| `BUNDLER_PORT` | 监听端口 | `4337` | ✅ |
| `BUNDLER_METRICS_PORT` | Metrics 端口 | `9090` | |
| `RUST_LOG` | 日志级别 | `info` | |
| `ENTRY_POINT_ADDRESS` | EntryPoint 合约地址 | `0x5FF1...2789` | ✅ |
| `CHAIN_ID` | 链 ID | `1` | ✅ |
| `RPC_URL` | 以太坊 RPC 地址 | | ✅ |
| `BUNDLER_PRIVATE_KEY` | Bundler 签名私钥 | | ✅ |
| `MAX_OPS_PER_BUNDLE` | 每 bundle 最大操作数 | `4` | |
| `BUNDLER_SHUTDOWN_TIMEOUT_SECS` | 优雅关闭超时 | `60` | |

### 配置文件 (config.yaml)

```yaml
bundler:
  entry_point: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
  chain_id: 1
  rpc_url: "https://eth-mainnet.g.alchemy.com/v2/KEY"
  max_ops_per_bundle: 4
  min_balance: "0.01"  # ETH
  gas_buffer_percent: 20
  priority_fee_percentile: 50
```

## Gas 估算

### 验证 Gas

Bundler 通过模拟执行估算验证 gas:

```
preVerificationGas = overhead + (gasPrice * calldataSize)
verificationGasLimit = 模拟执行消耗
callGasLimit = 模拟执行消耗 × 1.2 (安全系数)
```

### 优先级策略

1. 跟踪最近 N 个区块的 gas 价格
2. 使用指定百分位数 (如 P50)
3. 添加缓冲百分比确保及时打包

## API

### 健康检查

```
GET /health
```

### 发送 UserOperation

```
POST /
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "eth_sendUserOperation",
  "params": [
    {
      "sender": "0x...",
      "nonce": "0x1",
      "initCode": "0x",
      "callData": "0x...",
      "callGasLimit": "0x...",
      "verificationGasLimit": "0x...",
      "preVerificationGas": "0x...",
      "maxFeePerGas": "0x...",
      "maxPriorityFeePerGas": "0x...",
      "paymasterAndData": "0x",
      "signature": "0x..."
    },
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
  ],
  "id": 1
}
```

### 获取 UserOperation

```
POST /
{
  "jsonrpc": "2.0",
  "method": "eth_getUserOperationByHash",
  "params": ["0x..."],
  "id": 1
}
```

### 支持的网络

```
POST /
{
  "jsonrpc": "2.0",
  "method": "eth_supportedEntryPoints",
  "params": [],
  "id": 1
}
```

### 指标

```
GET /v1/metrics
```

## 部署

### Docker

```bash
docker build -t cinacoin/bundler:latest .
docker run -p 4337:4337 \
  -e ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 \
  -e CHAIN_ID=1 \
  -e RPC_URL=https://eth-mainnet.g.alchemy.com/v2/KEY \
  -e BUNDLER_PRIVATE_KEY=<private-key> \
  cinacoin/bundler:latest
```

### Kubernetes

```bash
helm install bundler ./deploy/helm/cinacoin \
  --set bundler.replicaCount=2 \
  --set global.imageRegistry=ghcr.io/cinacoin
```

## 安全

- Bundler 私钥存储在 K8s Secrets 中
- UserOperation 严格验证，拒绝无效操作
- Mempool 限制防止内存耗尽
- Gas 估算包含安全缓冲
- 支持 Paymaster 验证防止滥用
