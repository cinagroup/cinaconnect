# BRAND-UPDATE-03: Cloudflare Workers/Pages 名称更新

**日期:** 2026-05-26
**状态:** wrangler.toml 已更新，待手动执行部署

---

## 概览

将 Cloudflare 上所有服务名称从 `cinacoin-*` 统一更新为 `cinacoin-*`。

### 更新清单

| # | 旧名称 | 新名称 | 类型 | 状态 |
|---|--------|--------|------|------|
| 1 | cinacoin-rpc-proxy | **cinacoin-rpc-proxy** | Worker | ✅ wrangler.toml 已更新 |
| 2 | cinacoin-keys-server | **cinacoin-keys-server** | Worker | ✅ wrangler.toml 已更新 |
| 3 | cinacoin-relay-server | **cinacoin-relay-server** | Worker | ✅ wrangler.toml 已更新 |
| 4 | cinacoin-notify-server | **cinacoin-notify-server** | Worker | ✅ wrangler.toml 已更新 |
| 5 | cinacoin-push-server | **cinacoin-push-server** | Worker | ✅ wrangler.toml 已更新 |
| 6 | cinacoin-demo | **cinacoin-demo** | Pages | ✅ wrangler.toml 已更新 |
| 7 | cinacoin-health-status | **cinacoin-health-status** | Pages | ✅ wrangler.toml 已更新 |
| 8 | cinacoin-docs | **cinacoin-docs** | Pages | ✅ wrangler.toml 已更新 |

### 配套更新

| 项目 | 旧值 | 新值 |
|------|------|------|
| Keys D1 数据库 | cinacoin-keys | cinacoin-keys |
| Notifications D1 数据库 | cinacoin-notifications | cinacoin-notifications |
| Push D1 数据库 | cinacoin-push | cinacoin-push |
| Push Queue | cinacoin-push-queue | cinacoin-push-queue |
| RPC Proxy Staging | cinacoin-rpc-proxy-staging | cinacoin-rpc-proxy-staging |
| Keys Server Staging | cinacoin-keys-server-staging | cinacoin-keys-server-staging |

---

## 已更新的文件

所有以下文件中的 `name = "..."` 字段已更新：

```
packages/rpc-proxy/wrangler.toml                → cinacoin-rpc-proxy
packages/rpc-proxy/cloudflare/wrangler.toml     → cinacoin-rpc-proxy (+ staging)
packages/keys-server/wrangler.toml              → cinacoin-keys-server
packages/keys-server/cloudflare/wrangler.toml   → cinacoin-keys-server (+ staging)
packages/relay-server/wrangler.toml             → cinacoin-relay-server
packages/relay-server/cloudflare/wrangler.toml  → cinacoin-relay-server
packages/notify-server/wrangler.toml            → cinacoin-notify-server
packages/notify-server/cloudflare/wrangler.toml → cinacoin-notify-server
packages/push-server/wrangler.toml              → cinacoin-push-server
packages/push-server/cloudflare/wrangler.toml   → cinacoin-push-server
apps/demo/wrangler.toml                         → cinacoin-demo
apps/health-status/wrangler.toml                → cinacoin-health-status
docs-site/wrangler.toml                         → cinacoin-docs
```

---

## Cloudflare Dashboard 操作步骤

### 重要提示：Cloudflare Workers 改名需要删除旧 Worker

Cloudflare 不支持直接重命名已部署的 Worker。改名流程：

### 步骤 1：导出旧 Worker 代码（可选，但推荐）

```bash
# 下载当前部署的代码作为备份
wrangler worker download cinacoin-rpc-proxy --output-dir backups/rpc-proxy
wrangler worker download cinacoin-keys-server --output-dir backups/keys-server
wrangler worker download cinacoin-relay-server --output-dir backups/relay-server
wrangler worker download cinacoin-notify-server --output-dir backups/notify-server
wrangler worker download cinacoin-push-server --output-dir backups/push-server
```

### 步骤 2：删除旧 Workers

在 Cloudflare Dashboard → Workers & Pages 中删除：

1. `cinacoin-rpc-proxy`
2. `cinacoin-keys-server`
3. `cinacoin-relay-server`
4. `cinacoin-notify-server`
5. `cinacoin-push-server`

⚠️ **注意：** 删除前确保自定义域名已解绑，否则删除会失败。

### 步骤 3：重命名 Pages 项目

在 Cloudflare Dashboard → Workers & Pages 中：

1. 点击 `cinacoin-demo` → Settings → Change project name → 改为 `cinacoin-demo`
2. 点击 `cinacoin-health-status` → Settings → Change project name → 改为 `cinacoin-health-status`
3. 点击 `cinacoin-docs` → Settings → Change project name → 改为 `cinacoin-docs`

> Pages 改名后，`*.pages.dev` 子域名会自动更新，但**已配置的自定义域名需要重新关联**。

### 步骤 4：重新部署 Workers

```bash
cd /home/cina/.openclaw/workspace/onux

# RPC Proxy
cd packages/rpc-proxy && wrangler deploy
cd ../..

# Keys Server
cd packages/keys-server && wrangler deploy
cd ../..

# Relay Server
cd packages/relay-server && wrangler deploy
cd ../..

# Notify Server
cd packages/notify-server && wrangler deploy
cd ../..

# Push Server
cd packages/push-server && wrangler deploy
cd ../..
```

### 步骤 5：重新设置 Secrets

每个 Worker 的 Secrets 需要在新 Worker 上重新设置：

```bash
# RPC Proxy
wrangler secret put RPC_API_KEYS --name cinacoin-rpc-proxy
wrangler secret put RATE_LIMIT_TOKEN --name cinacoin-rpc-proxy
wrangler secret put WEBHOOK_SECRET --name cinacoin-rpc-proxy

# Keys Server
wrangler secret put ENCRYPTION_KEY --name cinacoin-keys-server
wrangler secret put ADMIN_API_KEY --name cinacoin-keys-server
wrangler secret put JWT_SECRET --name cinacoin-keys-server
wrangler secret put WEBHOOK_SECRET --name cinacoin-keys-server

# Notify Server (根据需要)
wrangler secret put DATABASE_URL --name cinacoin-notify-server
wrangler secret put WEBHOOK_SECRET --name cinacoin-notify-server
wrangler secret put FCM_API_KEY --name cinacoin-notify-server
wrangler secret put EMAIL_API_KEY --name cinacoin-notify-server

# Push Server (根据需要)
wrangler secret put FCM_API_KEY --name cinacoin-push-server
wrangler secret put FCM_PROJECT_ID --name cinacoin-push-server
wrangler secret put APNS_KEY_ID --name cinacoin-push-server
wrangler secret put APNS_TEAM_ID --name cinacoin-push-server
wrangler secret put APNS_P8_KEY --name cinacoin-push-server
wrangler secret put APNS_PRODUCTION --name cinacoin-push-server
```

### 步骤 6：重新部署 Pages

```bash
# Demo Pages
cd apps/demo && wrangler pages deploy
cd ../..

# Health Status Pages
cd apps/health-status && wrangler pages deploy
cd ../..

# Docs Pages
cd docs-site && wrangler pages deploy
cd ../..
```

### 步骤 7：自定义域名重新关联

如果使用了自定义域名（如 `rpc.cinacoin.com`），需要：

1. 删除旧 Worker 上的域名绑定
2. 在新 Worker 上重新绑定：

```bash
# RPC Proxy
wrangler routes create --name cinacoin-rpc-proxy --pattern "rpc.cinacoin.com" --type custom_domain

# Keys Server
wrangler routes create --name cinacoin-keys-server --pattern "keys.cinacoin.com" --type custom_domain

# Relay Server
wrangler routes create --name cinacoin-relay-server --pattern "relay.cinacoin.com" --type custom_domain

# Notify Server
wrangler routes create --name cinacoin-notify-server --pattern "notify.cinacoin.com" --type custom_domain

# Push Server
wrangler routes create --name cinacoin-push-server --pattern "push.cinacoin.com" --type custom_domain
```

### 步骤 8：KV 命名空间绑定验证

确认以下 KV 命名空间已绑定到新 Worker：

| Worker | KV Binding | KV Namespace ID |
|--------|-----------|-----------------|
| cinacoin-rpc-proxy | RPC_CACHE | f91dde2603b44c2f830d42330be9778a |
| cinacoin-keys-server | SESSIONS | b60edcfb4052452780701cbf7a06aeb9 |
| cinacoin-relay-server | RELAY_CACHE | 1a8dc90cb91c423695be43ce74028c88 |
| cinacoin-notify-server | SUBSCRIPTION_CACHE | ab72802bc80c49e3955a710820ce4506 |
| cinacoin-push-server | DEVICE_TOKENS | 9ab61f92afc3485da73fef3b2e730260 |

### 步骤 9：D1 数据库绑定验证

| Worker | D1 Binding | Database ID |
|--------|-----------|-------------|
| cinacoin-keys-server | DB / KEYS_DB | 1f24922a-19d9-451f-9125-11736d54ec3c |
| cinacoin-notify-server | SUBSCRIPTION_DB | a2c95321-9d64-45f2-94ce-1e3c2c64e085 |

---

## 新的 Workers URL

部署完成后，可通过以下 URL 访问：

| Worker | URL |
|--------|-----|
| cinacoin-rpc-proxy | `https://cinacoin-rpc-proxy.cinagroup.workers.dev` |
| cinacoin-keys-server | `https://cinacoin-keys-server.cinagroup.workers.dev` |
| cinacoin-relay-server | `https://cinacoin-relay-server.cinagroup.workers.dev` |
| cinacoin-notify-server | `https://cinacoin-notify-server.cinagroup.workers.dev` |
| cinacoin-push-server | `https://cinacoin-push-server.cinagroup.workers.dev` |

## Pages URL

| Pages 项目 | URL |
|------------|-----|
| cinacoin-demo | `https://cinacoin-demo.pages.dev` |
| cinacoin-health-status | `https://cinacoin-health-status.pages.dev` |
| cinacoin-docs | `https://cinacoin-docs.pages.dev` |

---

## 域名说明

自定义域名（`rpc.cinacoin.com`, `keys.cinacoin.com` 等）保持不变。
只需在 Workers/Pages 重命名后重新绑定即可。

---

## 风险与注意事项

1. **停机时间：** 删除旧 Worker → 部署新 Worker 之间会有短暂停机。建议先部署新 Worker，验证后再删除旧的（如果域名允许并行部署）。
2. **KV 数据保留：** KV namespace ID 不变，数据保留在 KV 存储中，只需重新绑定到新 Worker。
3. **D1 数据保留：** 数据库 ID 不变，数据保留，只需更新绑定。
4. **Secrets 需要重新设置：** 每个 Worker 的 Secrets 不会自动迁移，必须手动 `wrangler secret put`。
5. **Queue 名称更新：** Push Server 使用的 Queue `cinacoin-push-queue` 需要确认是否也需要重命名为 `cinacoin-push-queue`（wrangler.toml 已更新，但 Queue 本身需在 Dashboard 创建）。
