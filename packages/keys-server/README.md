# Keys Server

> Cinacoin 密钥管理服务 — 安全存储和管理用户加密密钥。

## 架构

```
┌────────────┐     HTTPS      ┌─────────────┐     PostgreSQL     ┌────────────┐
│   Client   │ ◀────────────▶ │ Keys Server │ ◀───────────────▶ │ PostgreSQL │
│  (SDK/App) │                │             │                    │  Database  │
└────────────┘                └─────────────┘                    └────────────┘
                                   │
                              migrations/
                              (schema mgmt)
```

Keys Server 提供安全的密钥存储、轮换和检索服务。所有数据在静态和传输中均加密。

## 技术栈

- **语言**: Rust
- **Web 框架**: Actix-web
- **数据库**: PostgreSQL (via SQLx)
- **加密**: ring, zeroize
- **迁移**: SQLx migrations

## 配置

### 环境变量

| 变量 | 说明 | 默认值 | 必需 |
|------|------|--------|------|
| `KEYS_SERVER_HOST` | 监听地址 | `0.0.0.0` | ✅ |
| `KEYS_SERVER_PORT` | 监听端口 | `3001` | ✅ |
| `RUST_LOG` | 日志级别 | `info` | |
| `DATABASE_URL` | PostgreSQL 连接字符串 | | ✅ |
| `DATABASE_MAX_CONNECTIONS` | 最大连接数 | `10` | |
| `MASTER_ENCRYPTION_KEY` | 主加密密钥 (HKDF seed) | | ✅ |
| `KEYS_SHUTDOWN_TIMEOUT_SECS` | 优雅关闭超时 | `30` | |

### 数据库

运行迁移：

```bash
sqlx migrate run --database-url "$DATABASE_URL"
```

## API

### 健康检查

```
GET /v1/health
```

### 存储密钥

```
POST /v1/keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "key_type": "session" | "signing" | "encryption",
  "public_key": "<hex>",
  "metadata": {}
}
```

### 检索密钥

```
GET /v1/keys/:key_id
Authorization: Bearer <token>
```

### 轮换密钥

```
POST /v1/keys/:key_id/rotate
Authorization: Bearer <token>
```

### 撤销密钥

```
DELETE /v1/keys/:key_id
Authorization: Bearer <token>
```

### 指标

```
GET /v1/metrics
```

## 部署

### Docker

```bash
docker build -t cinacoin/keys-server:latest .
docker run -p 3001:3001 \
  -e DATABASE_URL=postgres://user:pass@localhost:5432/keys \
  -e MASTER_ENCRYPTION_KEY=<key> \
  cinacoin/keys-server:latest
```

### Kubernetes

```bash
helm install keys-server ./deploy/helm/cinacoin \
  --set keysServer.replicaCount=2 \
  --set global.imageRegistry=ghcr.io/cinacoin
```

## 安全

- 所有密钥在存储前通过主密钥加密
- 使用 HKDF 派生加密密钥
- 内存中的密钥数据在使用后清零 (zeroize)
- 数据库连接使用 TLS
- API 通过 Bearer Token 认证
- 审计日志记录所有密钥操作
