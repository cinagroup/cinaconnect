# Push Server

> OnChainUX 推送通知服务 — 通过 APNs 和 FCM 向移动端用户推送链上事件。

## 架构

```
┌─────────────┐     NATS      ┌─────────────┐
│ Relay Server│ ────────────▶ │ Push Server │
│ (events)    │   pub/sub     │             │
└─────────────┘               └──────┬──────┘
                                     │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌───────────┐    ┌───────────┐    ┌───────────┐
              │   APNs    │    │   FCM     │    │  WebPush  │
              │  (Apple)  │    │ (Google)  │    │ (future)  │
              └───────────┘    └───────────┘    └───────────┘
```

Push Server 订阅 NATS 上的链上事件主题，将相关通知通过 APNs (iOS) 或 FCM (Android) 推送给用户设备。

## 技术栈

- **语言**: Rust
- **Web 框架**: Actix-web
- **消息队列**: NATS JetStream
- **推送服务**: APNs (Apple Push Notification service), FCM (Firebase Cloud Messaging)
- **缓存**: Redis (推送令牌缓存、去重)

## 配置

### 环境变量

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `PUSH_SERVER_HOST` | 监听地址 | `0.0.0.0` | ✅ |
| `PUSH_SERVER_PORT` | 监听端口 | `3000` | ✅ |
| `RUST_LOG` | 日志级别 | `info` | |
| `NATS_URL` | NATS 集群地址 | | ✅ |
| `REDIS_URL` | Redis 连接字符串 | | ✅ |
| `APNS_KEY_ID` | APNs Key ID | | ✅ (iOS) |
| `APNS_TEAM_ID` | APNs Team ID | | ✅ (iOS) |
| `APNS_KEY_P8` | APNs .p8 私钥内容 | | ✅ (iOS) |
| `APNS_ENVIRONMENT` | APNs 环境 | `production` | |
| `FCM_PROJECT_ID` | FCM 项目 ID | | ✅ (Android) |
| `FCM_CREDENTIALS_JSON` | FCM 服务账号 JSON | | ✅ (Android) |
| `PUSH_SHUTDOWN_TIMEOUT_SECS` | 优雅关闭超时 | `30` | |

## 部署

### Docker

```bash
docker build -t onchainux/push-server:latest .
docker run -p 3000:3000 \
  -e NATS_URL=nats://nats-cluster:4222 \
  -e REDIS_URL=redis://redis-cluster:6379 \
  onchainux/push-server:latest
```

### Kubernetes

```bash
helm install push-server ./deploy/helm/onchainux \
  --set pushServer.replicaCount=2 \
  --set global.imageRegistry=ghcr.io/onchainux
```

## API

### 健康检查

```
GET /v1/health
```

### 注册设备令牌

```
POST /v1/devices
{
  "platform": "ios" | "android",
  "token": "<device_push_token>",
  "wallet_address": "0x..."
}
```

### 推送指标

```
GET /v1/metrics
```
返回 Prometheus 格式的指标。

## 安全

- APNs 密钥使用 `.p8` 格式，存储在 K8s Secrets 中
- FCM 服务账号凭证以 JSON 形式存储在 Secrets 中
- 所有推送令牌与钱包地址绑定，防止滥用
- 消息去重通过 Redis 实现
