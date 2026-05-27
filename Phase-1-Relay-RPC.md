# Phase 1: 自建 Relay + RPC 代理 — 详细技术设计

> **目标**: 构建完全自主的消息中继和 RPC 代理层，消除对 Reown 专有基础设施的依赖  
> **时间**: M1-M2  
> **产出物**: `relay-server`, `rpc-proxy`, `core-sdk` 三个核心组件

---

## 1. 自建 Relay Server

### 1.1 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                      Relay Server 集群                        │
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │  Gateway    │   │  Gateway    │   │  Gateway    │        │
│  │  (ws://)    │   │  (ws://)    │   │  (wss://)   │        │
│  │  :8080      │   │  :8080      │   │  :443       │        │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                  ┌────────┴────────┐                         │
│                  │   Pub/Sub Bus   │  ← NATS 或 Redis        │
│                  └────────┬────────┘                         │
│                           │                                  │
│                  ┌────────┴────────┐                         │
│                  │   Session Store │  ← Redis (持久化)       │
│                  └────────┬────────┘                         │
│                           │                                  │
│                  ┌────────┴────────┐                         │
│                  │   Health/Stats  │  ← 健康检查 + 指标      │
│                  └─────────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 语言 | Rust | 高性能、内存安全、WebSocket 生态成熟 |
| Web 框架 | Actix-web 4.x | 高并发 WebSocket 支持最佳 |
| Pub/Sub | NATS JetStream | 低延迟、持久化、集群原生支持 |
| 会话存储 | Redis Cluster | 高可用、TTL 自动过期 |
| 序列化 | MessagePack + Protobuf | 比 JSON 小 30-50% |
| 部署 | Docker + K8s | 标准容器化 |

### 1.3 核心协议实现

#### 1.3.1 WebSocket 消息格式

```rust
// Relay 消息结构
#[derive(Serialize, Deserialize)]
struct RelayMessage {
    /// 消息类型
    #[serde(rename = "type")]
    msg_type: MessageType,
    /// 目标 topic (session ID 或 pairing URI)
    topic: String,
    /// 加密载荷 (X25519 + ChaCha20-Poly1305)
    payload: String, // base64
    /// 可选的标签
    tag: Option<u32>,
    /// 消息 ID (防重放)
    id: Option<String>,
    /// 时间戳 (ms)
    timestamp: u64,
}

#[derive(Serialize, Deserialize)]
enum MessageType {
    #[serde(rename = "publish")]
    Publish,          // 发送消息
    #[serde(rename = "subscribe")]
    Subscribe,        // 订阅 topic
    #[serde(rename = "unsubscribe")]
    Unsubscribe,      // 取消订阅
    #[serde(rename = "message")]
    Message,          // 收到消息
    #[serde(rename = "ping")]
    Ping,             // 心跳
    #[serde(rename = "pong")]
    Pong,             // 心跳响应
    #[serde(rename = "error")]
    Error,            // 错误响应
}
```

#### 1.3.2 加密流程（兼容 WalletConnect v2）

```
dApp                          Relay                          钱包
 │                              │                              │
 │  ① 生成 X25519 密钥对         │                              │
 │  ② 建立 Pairing URI          │                              │
 │  │  (含公钥 + relay URL)      │                              │
 │  ├─────────────────────────►│                              │
 │  │  POST /pairing           │  ③ 转发给钱包 (push/QR)       │
 │  │                          ├─────────────────────────────►│
 │                              │                              │
 │  ④ 钱包生成共享密钥           │                              │
 │     (dApp 公钥 + 钱包私钥)    │                              │
 │  ⑤ 后续消息使用共享密钥加密    │                              │
 │     ChaCha20-Poly1305        │                              │
 │  │                         │                              │
 │  ├── [加密消息] ──────────►│────── [加密消息] ──────────►│
 │                              │                              │
```

**关键**: Relay **不解密**消息内容，仅做 Topic 路由。加密在端点对端点完成。

#### 1.3.3 Topic 路由逻辑

```rust
impl RelayServer {
    async fn handle_subscribe(&self, ws: &mut WebSocket, topic: &str) -> Result<()> {
        // 1. 验证 topic 格式 (32 字节 hex)
        validate_topic(topic)?;
        
        // 2. 注册订阅关系到 NATS
        self.nats.subscribe(format!("topic.{}", topic)).await?;
        
        // 3. 记录到 Redis (带 TTL)
        self.redis.set(
            format!("session:{}", topic),
            json!({ "connected_at": now_ms(), "client_id": ws.id() }),
            Duration::from_secs(30 * 24 * 3600), // 30 天
        ).await?;
        
        // 4. 响应确认
        ws.send(json!({ "type": "ack", "topic": topic })).await
    }

    async fn handle_publish(&self, topic: &str, payload: &str) -> Result<()> {
        // 1. 查找 topic 订阅者
        let subscribers = self.redis.smembers(format!("topic:{}:subs", topic)).await?;
        
        // 2. 通过 NATS 发布到所有订阅者
        for sub_id in subscribers {
            if let Some(ws) = self.connections.get(&sub_id) {
                ws.send(json!({
                    "type": "message",
                    "topic": topic,
                    "payload": payload,
                    "timestamp": now_ms(),
                })).await?;
            }
        }
        
        Ok(())
    }
}
```

### 1.4 API 端点设计

```yaml
# WebSocket 端点
ws://relay.cinacoin.com/v1

# HTTP 端点
POST /v1/pairing          # 创建 pairing (返回 URI)
GET  /v1/health           # 健康检查
GET  /v1/metrics          # Prometheus 指标
POST /v1/push             # Push 通知触发 (APNs/FCM)
GET  /v1/session/{id}     # 会话状态查询

# 管理端点 (内部)
POST /admin/relay/flush   # 清理过期会话
GET  /admin/relay/stats   # 实时统计
```

### 1.5 Push 通知集成

当钱包不在线时，通过原生 Push 唤醒：

```rust
// Push 通知服务
struct PushService {
    apns_client: ApnsClient,   // Apple Push Notification
    fcm_client: FcmClient,     // Firebase Cloud Messaging
}

impl PushService {
    async fn notify_wallet(&self, wallet_id: &str, topic: &str) -> Result<()> {
        let token = self.redis.get(format!("wallet:{}:push_token", wallet_id)).await?;
        
        // 根据 token 类型选择推送通道
        match token.as_str() {
            Some(t) if t.starts_with("apns:") => {
                self.apns_client.send(SilentPush {
                    device_token: t.trim_start_matches("apns:"),
                    topic: topic.to_string(),
                }).await
            }
            Some(t) if t.starts_with("fcm:") => {
                self.fcm_client.send(SilentPush {
                    registration_id: t.trim_start_matches("fcm:"),
                    data: json!({ "topic": topic }),
                }).await
            }
            _ => Err(PushError::NoToken),
        }
    }
}
```

### 1.6 部署架构

```yaml
# relay-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: relay-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: relay-server
  template:
    spec:
      containers:
      - name: relay
        image: cinacoin/relay-server:latest
        ports:
        - containerPort: 8080  # WebSocket
        - containerPort: 8081  # HTTP Admin
        resources:
          requests:
            cpu: "500m"
            memory: "256Mi"
          limits:
            cpu: "2000m"
            memory: "1Gi"
        env:
        - name: NATS_URL
          value: "nats://nats-cluster:4222"
        - name: REDIS_URL
          value: "redis://redis-cluster:6379"
        livenessProbe:
          httpGet:
            path: /v1/health
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: relay-service
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
    protocol: TCP
  selector:
    app: relay-server
```

---

## 2. 自建 RPC Proxy

### 2.1 架构概览

```
┌──────────────────────────────────────────────────────────────────┐
│                       RPC Proxy 集群                              │
│                                                                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │  Envoy      │   │  Envoy      │   │  Envoy      │            │
│  │  (入口代理)  │   │  (入口代理)  │   │  (入口代理)  │            │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘            │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                  ┌────────┴────────┐                            │
│                  │  RPC Router     │  ← 自定义路由层             │
│                  │  (Go/Rust)      │                            │
│                  └────┬────┬────┬──┘                            │
│                       │    │    │                               │
│              ┌────────┘    │    └────────┐                     │
│              ▼             ▼             ▼                     │
│     ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│     │  自建节点   │ │ 公共 RPC-A │ │ 公共 RPC-B │               │
│     │  Erigon    │ │  Alchemy   │ │  Infura    │               │
│     │  :8545     │ │            │ │            │               │
│     └────────────┘ └────────────┘ └────────────┘               │
│              │             │             │                      │
│              ▼             ▼             ▼                      │
│     ┌────────────────────────────────────────────┐              │
│     │              Redis 缓存层                    │              │
│     │  - eth_call 结果缓存 (TTL: 12s)            │              │
│     │  - eth_getBlockByNumber 缓存 (TTL: 12s)    │              │
│     │  - 去重队列 (5s 窗口)                       │              │
│     └────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 核心路由策略

```rust
// RPC 路由决策
enum RpcRoute {
    /// 本地全节点 (最低延迟，免费)
    LocalNode { url: String },
    /// 主 RPC Provider (高配额)
    PrimaryProvider { url: String, api_key: String },
    /// 备用 Provider (故障切换)
    FallbackProvider { url: String, api_key: String },
    /// 仅读缓存命中
    CacheHit { value: serde_json::Value },
}

impl RpcRouter {
    fn route(&self, method: &str, params: &[Value]) -> RpcRoute {
        match method {
            // 只读方法：优先缓存 → 本地节点 → 公共 RPC
            "eth_call" | "eth_getBalance" | "eth_blockNumber" 
            | "eth_getBlockByNumber" | "eth_getBlockByHash"
            | "eth_getTransactionReceipt" | "eth_getLogs" => {
                if let Some(cached) = self.cache.get(method, params) {
                    return RpcRoute::CacheHit { value: cached };
                }
                if self.local_node.is_healthy() {
                    RpcRoute::LocalNode { url: self.local_node.url.clone() }
                } else {
                    self.select_public_provider(method)
                }
            }
            
            // 写入方法：直接路由到本地节点或高信任 Provider
            "eth_sendRawTransaction" | "eth_getTransactionCount" => {
                if self.local_node.is_healthy() {
                    RpcRoute::LocalNode { url: self.local_node.url.clone() }
                } else {
                    RpcRoute::PrimaryProvider { 
                        url: self.primary.url.clone(),
                        api_key: self.primary.key.clone(),
                    }
                }
            }
            
            // 其他方法：默认路由
            _ => self.select_public_provider(method),
        }
    }

    fn select_public_provider(&self, _method: &str) -> RpcRoute {
        // 基于配额余量、延迟、错误率选择 Provider
        let providers = [&self.primary, &self.fallback1, &self.fallback2];
        providers
            .iter()
            .filter(|p| p.has_quota())
            .min_by_key(|p| p.p99_latency_ms())
            .map(|p| RpcRoute::PrimaryProvider { 
                url: p.url.clone(), 
                api_key: p.key.clone() 
            })
            .unwrap_or_else(|| {
                // 全部耗尽 → 返回错误或使用免费层
                RpcRoute::FallbackProvider {
                    url: self.free_tier.url.clone(),
                    api_key: String::new(),
                }
            })
    }
}
```

### 2.3 缓存策略

```yaml
# 缓存配置
cache:
  # 只读方法缓存 (秒)
  read_methods:
    eth_blockNumber: 2          # 最新区块号，极短 TTL
    eth_getBlockByNumber: 12    # 区块数据，跟随出块时间
    eth_call: 12                # 状态查询
    eth_getBalance: 30          # 余额变化不频繁
    eth_getTransactionReceipt: 300  # 交易回执，确认后不变
    eth_getLogs: 600            # 日志，永不改变
    
  # 去重窗口 (毫秒)
  dedup_window_ms: 5000        # 5 秒内相同请求合并
  
  # 缓存键生成
  key_strategy: "sha256(method + chain_id + serialized_params)"
  
  # 内存限制
  max_memory_mb: 2048          # 2GB Redis 内存
  eviction_policy: "allkeys-lru"
```

### 2.4 去重与合并

```rust
// 请求去重
struct RequestDedup {
    // 哈希 → (第一次请求的等待者列表, 请求参数)
    pending: Arc<Mutex<HashMap<String, DedupEntry>>>,
}

struct DedupEntry {
    params: Vec<Value>,
    waiters: Vec<oneshot::Sender<Result<Value, Error>>>,
    sent_at: Instant,
}

impl RequestDedup {
    async fn deduplicate(
        &self,
        key: &str,
        params: Vec<Value>,
        timeout: Duration,
    ) -> Result<Value, Error> {
        let mut pending = self.pending.lock().await;
        
        // 清理超时条目
        pending.retain(|_, v| v.sent_at.elapsed() < Duration::from_millis(5000));
        
        if let Some(entry) = pending.get_mut(key) {
            // 相同请求正在处理 → 加入等待队列
            let (tx, rx) = oneshot::channel();
            entry.waiters.push(tx);
            drop(pending);
            // 等待第一个请求的结果
            match tokio::time::timeout(timeout, rx).await {
                Ok(Ok(result)) => result,
                _ => Err(Error::DedupTimeout),
            }
        } else {
            // 新请求 → 创建条目并处理
            let (tx, rx) = oneshot::channel();
            pending.insert(key.to_string(), DedupEntry {
                params: params.clone(),
                waiters: vec![tx],
                sent_at: Instant::now(),
            });
            drop(pending);
            
            // 执行实际 RPC 调用
            let result = self.execute_rpc(&params).await;
            
            // 广播结果给所有等待者
            let mut pending = self.pending.lock().await;
            if let Some(entry) = pending.remove(key) {
                for waiter in entry.waiters {
                    let _ = waiter.send(result.clone());
                }
            }
            
            result
        }
    }
}
```

### 2.5 速率限制

```yaml
rate_limit:
  # 全局限制
  global:
    requests_per_second: 10000
    burst_size: 20000
    
  # 每 API Key 限制
  per_key:
    requests_per_minute: 100000
    burst_size: 200000
    
  # 每 IP 限制 (防滥用)
  per_ip:
    requests_per_second: 100
    burst_size: 500
    
  # 方法级限制
  method_limits:
    eth_sendRawTransaction: 50/秒    # 交易提交限速
    eth_getLogs: 100/秒              # 日志查询限速
    debug_*: 10/秒                   # 调试方法严格限速
```

---

## 3. Core SDK — 客户端库

### 3.1 SDK 架构

```
@cinacoin/core
├── packages/
│   ├── core/            # 核心抽象层
│   │   ├── connector.ts      # 连接器基类
│   │   ├── session.ts        # 会话管理
│   │   ├── store.ts          # 状态管理 (Zustand)
│   │   └── events.ts         # 事件系统
│   ├── adapters/        # 链适配器
│   │   ├── evm/              # EVM 链
│   │   ├── solana/           # Solana
│   │   ├── bitcoin/          # Bitcoin
│   │   └── tron/             # Tron
│   ├── transports/      # 传输层
│   │   ├── relay/            # 自有 Relay WebSocket
│   │   ├── injected/         # 注入 Provider (EIP-1193)
│   │   └── qr-code/          # 扫码连接
│   └── crypto/          # 密码学
│       ├── keypair.ts        # X25519 密钥对
│       ├── encrypt.ts        # ChaCha20-Poly1305
│       └── hash.ts           # SHA-256 哈希
```

### 3.2 Connector 接口设计

```typescript
// 统一连接器接口
interface Connector {
  /** 连接器唯一 ID */
  readonly id: string;
  
  /** 连接器名称 (用于 UI 展示) */
  readonly name: string;
  
  /** 连接器图标 URL */
  readonly icon: string;
  
  /** 是否已安装/可用 */
  readonly installed: boolean;
  
  /** 连接钱包 */
  connect(params?: ConnectParams): Promise<ConnectionResult>;
  
  /** 断开连接 */
  disconnect(): Promise<void>;
  
  /** 获取当前账户 */
  getAccounts(): Promise<string[]>;
  
  /** 获取当前 Chain ID */
  getChainId(): Promise<number>;
  
  /** 切换链 */
  switchChain(chainId: number): Promise<void>;
  
  /** 签名消息 */
  signMessage(message: string): Promise<string>;
  
  /** 签名交易 */
  signTransaction(tx: TransactionRequest): Promise<string>;
  
  /** 事件监听 */
  on(event: string, handler: EventHandler): void;
  
  /** 事件移除 */
  off(event: string, handler: EventHandler): void;
}
```

### 3.3 EIP-6963 多钱包发现

```typescript
// EIP-6963 实现
interface EIP6963ProviderInfo {
  rdns: string;           // 反向 DNS 标识
  name: string;           // 钱包名称
  icon: string;           // 图标 (data URI)
  uuid: string;           // 唯一标识
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

// 发现流程
function discoverWallets(): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    const wallets: EIP6963ProviderDetail[] = [];
    
    // 监听钱包广播事件
    window.addEventListener('eip6963:announceProvider', (event: any) => {
      const detail = event.detail as EIP6963ProviderDetail;
      if (!wallets.find(w => w.info.rdns === detail.info.rdns)) {
        wallets.push(detail);
      }
    });
    
    // 触发发现
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    
    // 超时返回已发现的钱包
    setTimeout(() => resolve(wallets), 300);
  });
}
```

### 3.4 会话管理

```typescript
// 会话状态机
type SessionState = 
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; accounts: string[]; chainId: number; sessionId: string }
  | { status: 'error'; error: Error };

interface SessionManager {
  /** 当前会话状态 */
  getState(): SessionState;
  
  /** 状态变化订阅 */
  subscribe(cb: (state: SessionState) => void): () => void;
  
  /** 恢复持久化会话 */
  restore(): Promise<SessionState>;
  
  /** 发起连接 */
  initiate(connector: Connector, params: ConnectParams): Promise<void>;
  
  /** 确认连接 (用户授权后) */
  confirm(sessionId: string, accounts: string[], chainId: number): Promise<void>;
  
  /** 主动断开 */
  terminate(): Promise<void>;
  
  /** 清理过期会话 */
  cleanup(): Promise<void>;
}
```

### 3.5 SDK 使用示例

```typescript
import { Cinacoin } from '@cinacoin/core';
import { EvmAdapter } from '@cinacoin/adapter-evm';
import { RelayTransport } from '@cinacoin/transport-relay';

// 初始化
const cinacoin = new Cinacoin({
  relayUrl: 'wss://relay.yourdomain.com/v1',
  projectId: 'your-project-id',
  chains: [
    { id: 1, name: 'Ethereum', rpcUrl: 'https://rpc.yourdomain.com/eth' },
    { id: 137, name: 'Polygon', rpcUrl: 'https://rpc.yourdomain.com/polygon' },
    { id: 56, name: 'BSC', rpcUrl: 'https://rpc.yourdomain.com/bsc' },
  ],
});

// 注册适配器
cinacoin.registerAdapter(new EvmAdapter());

// 注册传输层
cinacoin.registerTransport(new RelayTransport({
  url: 'wss://relay.yourdomain.com/v1',
}));

// 连接钱包
const connectors = cinacoin.getConnectors();
const [selected] = await cinacoin.connect(connectors[0]);

// 状态监听
cinacoin.on('accountChanged', (accounts) => {
  console.log('Account changed:', accounts);
});

cinacoin.on('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId);
});
```

---

## 4. Phase 1 里程碑

| 里程碑 | 时间 | 验收标准 |
|--------|------|---------|
| M1.1 | Week 1-2 | Relay Server 核心 WebSocket + Pub/Sub 原型 |
| M1.2 | Week 3-4 | Relay Server 加密模块 + Pairing 协议实现 |
| M1.3 | Week 5-6 | RPC Proxy 基础路由 + 缓存层 |
| M1.4 | Week 7-8 | RPC Proxy 去重 + 速率限制 + 多 Provider 故障切换 |
| M1.5 | Week 8 | Core SDK 基础 Connector 接口 + EVM 适配器 |
| M1.6 | Week 8 | 集成测试：dApp ↔ Relay ↔ 钱包 端到端连接 |

---

## 5. 验收测试用例

```yaml
test_cases:
  - name: "基础连接测试"
    steps:
      - "dApp 发起连接请求"
      - "Relay 创建 pairing session"
      - "钱包通过 QR 码或 URI 接收到配对信息"
      - "钱包确认连接"
      - "Relay 转发确认到 dApp"
      - "双方建立加密通道"
    expected: "dApp 收到钱包账户地址和 chain_id"
    
  - name: "RPC 缓存测试"
    steps:
      - "发送 eth_blockNumber 请求 A"
      - "2 秒内再次发送相同请求 B"
      - "检查请求 B 是否命中缓存"
    expected: "请求 B 在 < 5ms 返回，未向上游发送请求"
    
  - name: "故障切换测试"
    steps:
      - "停止主 Provider"
      - "发送 eth_call 请求"
      - "检查是否自动切换到备用 Provider"
    expected: "请求在 < 500ms 内通过备用 Provider 完成"
    
  - name: "重连恢复测试"
    steps:
      - "建立连接后断开 WebSocket"
      - "等待 10 秒后重新连接"
      - "检查会话是否自动恢复"
    expected: "会话在 3 秒内自动恢复，无需用户重新授权"
```

---

## 6. 监控指标

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| Relay WebSocket 连接数 | > 80% 容量 | 容量规划预警 |
| Relay 消息延迟 P99 | > 500ms | 用户体验退化 |
| RPC 缓存命中率 | < 60% | 缓存策略需调优 |
| RPC 错误率 | > 1% | 上游 Provider 异常 |
| Session 存活率 | < 95% | 连接稳定性问题 |
| Push 送达率 | < 90% | Push 通知通道异常 |

---

*Phase 1 Design Document v1.0 — 2026-05-16*
