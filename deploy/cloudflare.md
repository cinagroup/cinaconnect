# Cloudflare Workers Deployment — All 5 Services

## 🚀 Services

| 服务 | 描述 | Worker 名称 | 端口 | 协议 |
|------|------|-----------|------|------|
| **RPC Proxy** | 链路由、缓存、限流 | `cinacoin-rpc-proxy` | 443 | HTTPS |
| **Keys Server** | 密钥管理、加密、会话 | `cinacoin-keys-server` | 443 | HTTPS |
| **Relay Server** | WebSocket 中继、会话管理 | `cinacoin-relay-server` | 443 | WebSocket |
| **Notify Server** | 推送、邮件、Webhook 通知 | `cinacoin-notify-server` | 443 | HTTPS |
| **Push Server** | APNs、FCM 推送发送 | `cinacoin-push-server` | 443 | HTTPS |

---

## 📋 部署前准备

### 1. 安装 wrangler CLI

```bash
pnpm add -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建 KV 命名空间（可选）

```bash
# Relay Server KV
wrangler kv:namespace create "RELAY_CACHE" --preview

# Notify Server KV
wrangler kv:namespace create "SUBSCRIPTION_CACHE" --preview

# Push Server KV
wrangler kv:namespace create "DEVICE_TOKENS" --preview
```

创建后，将返回的 `id` 替换到对应 `wrangler.toml` 文件中的 `PLACEHOLDER_REPLACE_AFTER_CREATE`。

### 4. 创建 D1 数据库（可选）

```bash
# Keys Server D1
wrangler d1 create cinacoin-keys --preview

# Notify Server D1
wrangler d1 create cinacoin-notifications --preview

# Push Server D1
wrangler d1 create cinacoin-push --preview
```

创建后，将返回的 `database_id` 替换到对应 `wrangler.toml` 文件中。

### 5. 配置 Secrets（敏感信息）

```bash
# Keys Server
cd packages/keys-server
wrangler secret put ENCRYPTION_KEY
wrangler secret put ADMIN_API_KEY
wrangler secret put JWT_SECRET

# Notify Server
cd ../notify-server
wrangler secret put DATABASE_URL
wrangler secret put WEBHOOK_SECRET
wrangler secret put FCM_API_KEY

# Push Server
cd ../push-server
wrangler secret put FCM_API_KEY
wrangler secret put FCM_PROJECT_ID
wrangler secret put APNS_KEY_ID
wrangler secret put APNS_TEAM_ID
wrangler secret put APNS_P8_KEY
wrangler secret put APNS_PRODUCTION
```

---

## 🚀 部署命令

### 部署所有服务（生产）

```bash
./deploy/deploy-all.sh
```

### 部署所有服务（Staging）

```bash
./deploy/deploy-all.sh -e staging
```

### 部署单个服务

```bash
# 仅部署 Relay Server
./deploy/deploy-all.sh -s relay

# 仅部署 Notify Server
./deploy/deploy-all.sh -s notify

# 仅部署 Push Server
./deploy/deploy-all.sh -s push
```

### Dry run（验证配置，不实际部署）

```bash
./deploy/deploy-all.sh --dry-run
```

---

## 🔍 健康检查

部署后运行健康检查：

```bash
./scripts/check-cloudflare-workers.sh
```

检查以下端点：

| 服务 | 健康检查端点 |
|------|-------------|
| RPC Proxy | `https://rpc-proxy.cinacoin.com/health` |
| Keys Server | `https://keys-server.cinacoin.com/health` |
| Relay Server | `wss://relay.cinacoin.com/health` |
| Notify Server | `https://notify.cinacoin.com/health` |
| Push Server | `https://push.cinacoin.com/health` |

---

## 📊 API 端点

### Notify Server

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/send` | 发送通知 |
| POST | `/subscribe` | 订阅通知 |
| POST | `/unsubscribe` | 取消订阅 |
| GET | `/subscriptions?address=...` | 获取订阅列表 |
| GET | `/metrics` | 获取指标 |

### Push Server

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/send` | 发送单条推送 |
| POST | `/send-batch` | 批量发送推送 |
| POST | `/register` | 注册设备 Token |
| POST | `/unregister` | 注销设备 Token |
| GET | `/log` | 获取投递日志 |

---

## 🔧 故障排除

### 部署失败

1. 检查 wrangler 登录状态：`wrangler whoami`
2. 检查 wrangler.toml 配置是否正确
3. 检查 KV/D1 命名空间是否已创建
4. 检查 Secrets 是否已设置

### 健康检查失败

1. 检查 Worker 是否正在运行：`wrangler status`
2. 检查日志：`wrangler tail`
3. 检查域名配置（需要绑定到 Cinacoin 域名）

### WebSocket 连接失败

1. 检查 Relay Server Durable Objects 配置
2. 检查域名是否支持 WebSocket
3. 检查防火墙规则

---

## 📝 注意事项

- **Durable Objects**：Relay Server 使用 Durable Objects，需要启用 Durable Objects 配额
- **内存存储**：Notify/Push Server 默认使用内存存储，重启后数据丢失（生产环境应使用 KV/D1）
- **Secrets**：所有敏感信息都通过 `wrangler secret put` 设置，不要提交到代码库
- **域名绑定**：部署后需要在 Cloudflare Dashboard 中配置域名绑定

---

## 🎯 下一步

1. 运行部署脚本部署所有服务
2. 配置域名绑定（Cloudflare Dashboard）
3. 设置环境特定的 Secrets
4. 运行健康检查验证部署
5. 配置监控和告警

---

*最后更新：2026-05-18*