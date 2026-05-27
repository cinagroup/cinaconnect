# RPC Proxy

> Cinacoin RPC 代理 — 多提供者智能路由与缓存层。

## 架构

```
┌──────────┐                    ┌─────────────┐
│  Client  │ ── JSON-RPC ──▶   │  RPC Proxy  │
│ (SDK)    │                    │             │
└──────────┘                    └──┬──┬──┬───┬┘
                                   │  │  │   │
                            ┌──────┘  │  │   └──────┐
                            ▼         ▼  ▼          ▼
                       ┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐
                       │Alchemy │ │Infura│ │  ANKR  │ │  Node  │
                       └────────┘ └──────┘ └────────┘ └────────┘
                                          ▲
                                          │
                                   ┌─────────────┐
                                   │    Redis    │
                                   │   (Cache)   │
                                   └─────────────┘
```

RPC Proxy 是 Cinacoin 的 RPC 请求路由层。它智能地将请求分发到多个区块链 RPC 提供者，使用 Redis 缓存常见响应，并通过去重机制减少上游调用。

## 技术栈

- **语言**: Go
- **Web 框架**: 标准库 net/http (高性能)
- **缓存**: Redis
- **配置**: YAML 提供者配置

## 路由逻辑

### 请求分类

1. **只读调用** (`eth_call`, `eth_getBalance`, `eth_blockNumber`, etc.)
   - 优先从 Redis 缓存读取
   - 缓存未命中时按优先级路由到提供者
   - 失败自动故障切换到备用提供者

2. **写调用** (`eth_sendRawTransaction`, `eth_sendTransaction`)
   - 直接路由到主提供者
   - 不缓存

3. **调试调用** (`debug_*`, `trace_*`)
   - 路由到专用调试节点
   - 需要特殊提供者配置

### 故障切换策略

```
Primary (Alchemy) ──timeout──▶ Secondary (Infura) ──timeout──▶ Fallback (ANKR)
```

### 去重机制

相同参数的只读请求在短时间窗口内只发送一次到上游，后续请求等待首次结果。

## 配置

### 环境变量

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `RPC_PROXY_HOST` | 监听地址 | `0.0.0.0` | ✅ |
| `RPC_PROXY_PORT` | 监听端口 | `8545` | ✅ |
| `RPC_PROXY_METRICS_PORT` | Metrics 端口 | `9090` | |
| `REDIS_URL` | Redis 连接字符串 | | ✅ |
| `PROVIDERS_FILE` | 提供者配置文件路径 | `/config/providers.yaml` | ✅ |
| `RPC_PROXY_SHUTDOWN_TIMEOUT_SECS` | 优雅关闭超时 | `30` | |

### 提供者配置 (providers.yaml)

```yaml
providers:
  - name: alchemy
    url: https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
    chain_id: 1
    priority: 1
    max_rps: 300
    timeout_ms: 3000
  - name: infura
    url: https://mainnet.infura.io/v3/${INFURA_KEY}
    chain_id: 1
    priority: 2
    max_rps: 200
    timeout_ms: 3000
  - name: ankr
    url: https://rpc.ankr.com/eth/${ANKR_KEY}
    chain_id: 1
    priority: 3
    max_rps: 100
    timeout_ms: 5000
```

## 缓存配置

### 缓存策略

| 方法 | 缓存 | TTL |
|------|------|-----|
| `eth_blockNumber` | ✅ | 5s |
| `eth_getBalance` | ✅ | 30s |
| `eth_call` | ✅ | 60s |
| `eth_getLogs` | ✅ | 300s |
| `eth_sendRawTransaction` | ❌ | N/A |
| `debug_*` | ❌ | N/A |

### Redis 键格式

```
rpc:{chain_id}:{method}:{params_hash}
```

## 部署

### Docker

```bash
docker build -t cinacoin/rpc-proxy:latest .
docker run -p 8545:8545 \
  -e REDIS_URL=redis://redis-cluster:6379 \
  -e PROVIDERS_FILE=/config/providers.yaml \
  -v ./providers.yaml:/config/providers.yaml \
  cinacoin/rpc-proxy:latest
```

### Kubernetes

```bash
helm install rpc-proxy ./deploy/helm/cinacoin \
  --set rpcProxy.replicaCount=3 \
  --set global.imageRegistry=ghcr.io/cinacoin
```

## 监控

```
GET /health          — 健康检查
GET /metrics         — Prometheus 指标
GET /v1/status       — 详细状态 (提供者延迟、缓存命中率)
```

## 安全

- 提供者 API 密钥通过 K8s Secrets 注入
- 速率限制防止单个消费者耗尽配额
- 静态编译二进制 (CGO_ENABLED=0)
- scratch 容器运行 (无 shell，最小攻击面)
