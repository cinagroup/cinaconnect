# Relay Server

> OnChainUX 中继服务器 — WebSocket 连接桥接，处理 WalletConnect 协议消息。

## 架构

```
┌──────────┐   WebSocket    ┌─────────────┐     NATS      ┌─────────────┐
│  Wallet  │ ◀────────────▶ │ Relay Server│ ◀───────────▶ │ Push Server │
│          │   (WSS)        │             │   pub/sub     │             │
└──────────┘                └──────┬──────┘               └─────────────┘
                                   │
                              NATS Cluster
                              (JetStream)
```

Relay Server 是 OnChainUX 的核心消息路由层。它处理来自钱包和 DApp 的 WebSocket 连接，使用 NATS JetStream 进行可靠的消息路由，并通过 X25519 + ChaCha20-Poly1305 实现端到端加密。

## 技术栈

- **语言**: Rust
- **Web 框架**: Actix-web (WebSocket)
- **消息队列**: NATS JetStream
- **加密**: X25519 (密钥交换) + ChaCha20-Poly1305 (AEAD)
- **协议**: WalletConnect v2

## WalletConnect 协议

Relay Server 实现 WalletConnect 2.0 中继协议：

1. **Pairing**: 通过 pairing URI 建立初始连接
2. **Session**: 建立安全的会话通道
3. **RPC Relay**: 转发 JSON-RPC 请求和响应
4. **Heartbeat**: 保活心跳机制
5. **Reconnection**: 断线重连与消息恢复

### 消息流

```
DApp ──[wss]──▶ Relay ──[nats]──▶ Wallet
     ◀─────────       ◀──────────
     (response)       (response)
```

## 配置

### 环境变量

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `RELAY_SERVER_HOST` | 监听地址 | `0.0.0.0` | ✅ |
| `RELAY_WS_PORT` | WebSocket 端口 | `8080` | ✅ |
| `RELAY_HTTP_PORT` | HTTP 端口 | `8081` | ✅ |
| `RELAY_METRICS_PORT` | Metrics 端口 | `9090` | |
| `RUST_LOG` | 日志级别 | `info` | |
| `NATS_URL` | NATS 集群地址 | | ✅ |
| `RELAY_SHUTDOWN_TIMEOUT_SECS` | 优雅关闭超时 | `60` | |

## 部署

### Docker

```bash
docker build -t onchainux/relay-server:latest .
docker run -p 8080:8080 -p 8081:8081 \
  -e NATS_URL=nats://nats-cluster:4222 \
  onchainux/relay-server:latest
```

### Kubernetes

```bash
helm install relay ./deploy/helm/onchainux \
  --set relay.replicaCount=3 \
  --set relay.autoscaling.enabled=true \
  --set global.imageRegistry=ghcr.io/onchainux
```

### Ingress

Relay Server 通过 Ingress 暴露 WebSocket 端点：

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

## 安全

- 所有连接使用 WSS (WebSocket Secure / TLS 1.3)
- 端到端加密: X25519 + ChaCha20-Poly1305
- 中继服务器无法解密消息内容
- 速率限制防止 DoS 攻击
- NATS 集群认证
