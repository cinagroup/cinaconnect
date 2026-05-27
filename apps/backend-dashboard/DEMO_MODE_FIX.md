# Cinacoin 后端仪表板配置

## 问题说明

后端仪表板当前显示 "Demo Mode"，这是因为：

1. **静态导出限制**：Next.js 使用 `output: "export"` 进行静态导出，导致页面在 Cloudflare Pages 上以纯静态文件形式运行
2. **客户端健康检查**：仪表板使用客户端 JavaScript 进行健康检查，但 Workers 需要正确的 CORS 配置
3. **CORS 策略**：Workers 已配置允许跨域请求（`Access-Control-Allow-Origin: *`），但静态页面可能需要等待几秒才能完成健康检查

## 解决方案

### 方案 1：等待健康检查完成（推荐）

仪表板会在页面加载后自动进行健康检查。如果所有服务正常，"Demo Mode" 会自动切换到真实数据。

**访问地址**：https://backend-dashboard.pages.dev/

等待 5-10 秒后，健康检查完成，Demo Mode 会自动关闭。

### 方案 2：手动配置服务端点

在仪表板的 Settings 页面（https://backend-dashboard.pages.dev/settings）中，可以手动配置每个服务的端点 URL。

**默认配置**：
- RPC Proxy: `https://cinacoin-rpc-proxy.cinagroup.workers.dev`
- Keys Server: `https://cinacoin-keys-server.cinagroup.workers.dev`
- Relay Server: `https://cinacoin-relay-server.cinagroup.workers.dev`
- Notify Server: `https://cinacoin-notify-server.cinagroup.workers.dev`
- Push Server: `https://cinacoin-push-server.cinagroup.workers.dev`

### 方案 3：环境变量配置

通过环境变量配置服务端点：

```bash
# .env.local
NEXT_PUBLIC_RPC_PROXY_URL=https://cinacoin-rpc-proxy.cinagroup.workers.dev
NEXT_PUBLIC_KEYS_SERVER_URL=https://cinacoin-keys-server.cinagroup.workers.dev
NEXT_PUBLIC_RELAY_SERVER_URL=https://cinacoin-relay-server.cinagroup.workers.dev
NEXT_PUBLIC_NOTIFY_SERVER_URL=https://cinacoin-notify-server.cinagroup.workers.dev
NEXT_PUBLIC_PUSH_SERVER_URL=https://cinacoin-push-server.cinagroup.workers.dev
```

## Workers CORS 配置

所有 Workers 已配置 CORS 允许所有来源：

```typescript
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
```

## 健康检查端点

每个 Workers 提供以下端点：

- `/health` — 健康检查
- `/metrics` — 运行指标

**示例**：
```bash
# 健康检查
curl https://cinacoin-rpc-proxy.cinagroup.workers.dev/health

# 指标
curl https://cinacoin-rpc-proxy.cinagroup.workers.dev/metrics
```

## 部署更新

最新更新已部署，配置了正确的生产 Workers URL。

- **部署时间**: 2026-05-18 12:35 UTC
- **版本**: v0.1.1
- **访问地址**: https://backend-dashboard.pages.dev/

---

**注意**：如果 Demo Mode 持续显示超过 30 秒，请检查浏览器的开发者工具控制台查看错误信息。