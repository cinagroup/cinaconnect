# Phase 5: 成本优化与链扩展 — 详细技术设计

> **目标**: 持续优化基础设施成本，扩展支持更多区块链网络，建立性能调优体系  
> **时间**: M6+ (持续)  
> **产出物**: 性能调优报告、新链适配器、成本分析工具

---

## 1. 成本优化策略

### 1.1 成本构成分析

```
月度成本构成 (预估):
├── 计算资源 (K8s 集群)           $1,500-3,000
│   ├── Relay Server (3 Region)   $600-1,200
│   ├── RPC Proxy (3 Region)      $450-900
│   ├── Bundler                   $150-300
│   └── 监控/日志                 $300-600
│
├── 存储 (节点数据)                $800-2,000
│   ├── Erigon 全节点 (EVM)       $400-800
│   ├── Solana 节点 (如需要)       $400-1,200
│   └── Redis/NATS 持久化         $100-200
│
├── 网络 (带宽 + CDN)              $200-500
│   ├── CloudFlare Pro            $20
│   ├── 跨区域流量                 $100-300
│   └── 入站/出站带宽              $80-180
│
├── 第三方服务                     $200-800
│   ├── RPC Provider (备用)        $100-400
│   ├── Push 通知 (APNs/FCM)       $50-200
│   └── 监控服务 (Grafana Cloud)   $50-200
│
├── 安全与合规                     $100-300
│   ├── SSL 证书                   $0 (Let's Encrypt)
│   ├── WAF (CloudFlare)          $20
│   └── 安全审计 (季度)            $80-280/月摊销
│
└── 人力成本 (运维)                 视团队规模
    └── 自动化程度越高，人力越低

总计: $2,800 - $6,900/月
(远低于 Reown 商业授权费用 $500-$5,000/月 + MAU 限制)
```

### 1.2 优化措施矩阵

| 优化项 | 策略 | 预期节省 | 实施难度 |
|--------|------|---------|---------|
| **Spot 实例** | Relay/RPC Proxy 使用 Spot | 60-70% | 低 |
| **节点精简** | 仅维护高频链全节点 | 30-50% | 中 |
| **缓存优化** | 提高缓存命中率至 85%+ | 20-40% RPC 成本 | 中 |
| **自动伸缩** | 低峰期缩减副本数 | 40-50% 计算成本 | 低 |
| **请求聚合** | 合并相同 RPC 请求 | 15-25% RPC 成本 | 低 |
| **CDN 缓存** | 静态链数据 CDN 缓存 | 10-20% 带宽成本 | 低 |
| **多 Provider 竞价** | 动态选择最优价格 Provider | 20-30% 备用 RPC | 中 |

### 1.3 Spot 实例容错

```yaml
# relay-spot-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: relay-server-spot
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: relay
        image: ghcr.io/cinacoin/relay-server:1.0.0
      # Spot 实例容忍中断
      tolerations:
      - key: "spot-instance"
        operator: "Exists"
        effect: "NoSchedule"
      # 优雅关闭
      terminationGracePeriodSeconds: 60
---
# 同时保持至少 1 个按需实例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: relay-server-ondemand
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: relay
        image: ghcr.io/cinacoin/relay-server:1.0.0
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: lifecycle
                operator: In
                values:
                - OnDemand
```

### 1.4 自动伸缩策略

```yaml
# KEDA 自动伸缩 (基于自定义指标)
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: relay-scaler
spec:
  scaleTargetRef:
    name: relay-server
  minReplicaCount: 2
  maxReplicaCount: 20
  pollingInterval: 15
  cooldownPeriod: 120
  triggers:
    # 基于活跃 WebSocket 连接数
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: relay_active_connections
        threshold: '5000'
        query: sum(relay_active_connections{region="us-east-1"})
    
    # 基于消息队列深度
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: nats_jetstream_consumer_pending
        threshold: '10000'
        query: sum(nats_jetstream_consumer_pending)

# 定时伸缩 (低峰期缩减)
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: relay-time-based
spec:
  scaleTargetRef:
    name: relay-server
  minReplicaCount: 2
  maxReplicaCount: 6
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: 0 2 * * *     # 凌晨 2 点缩减
        end: 0 8 * * *       # 上午 8 点恢复
        desiredReplicas: "2"
```

### 1.5 缓存层优化

```rust
// 智能缓存策略
struct SmartCache {
    redis: RedisClient,
    local_cache: MokaCache,  // 本地内存缓存 (进程内)
    bloom_filter: BloomFilter, // 布隆过滤器 (快速判断 key 是否存在)
}

impl SmartCache {
    /// 多层缓存查找
    async fn get(&self, key: &str) -> Option<Value> {
        // L1: 本地内存缓存 (亚毫秒级)
        if let Some(value) = self.local_cache.get(key) {
            cache_metrics::hit("L1").await;
            return Some(value);
        }
        
        // L2: Bloom Filter 快速否定
        if !self.bloom_filter.contains(key) {
            cache_metrics::miss("bloom").await;
            return None;
        }
        
        // L3: Redis 集群 (毫秒级)
        if let Some(value) = self.redis.get(key).await {
            // 回填本地缓存
            self.local_cache.insert(key.to_string(), value.clone());
            cache_metrics::hit("L2").await;
            return Some(value);
        }
        
        cache_metrics::miss("L2").await;
        None
    }
    
    /// 动态 TTL 调整
    async fn set_with_dynamic_ttl(&self, key: &str, value: Value) {
        let access_count = self.redis.get_counter(key).await;
        
        // 热点数据 → 更长 TTL
        let ttl = if access_count > 100 {
            Duration::from_secs(300)  // 5 分钟
        } else if access_count > 10 {
            Duration::from_secs(60)   // 1 分钟
        } else {
            Duration::from_secs(12)   // 12 秒
        };
        
        self.redis.set(key, value, ttl).await;
        
        // 更新布隆过滤器
        self.bloom_filter.insert(key);
    }
}
```

---

## 2. 链扩展策略

### 2.1 链优先级矩阵

| 优先级 | 链 | 用户量 | 集成难度 | 说明 |
|--------|-----|--------|---------|------|
| P0 | Ethereum | ★★★★★ | 低 | 已完成 |
| P0 | Polygon | ★★★★ | 低 | EVM 兼容 |
| P0 | Arbitrum | ★★★★ | 低 | EVM 兼容 |
| P0 | BSC | ★★★ | 低 | EVM 兼容 |
| P1 | Solana | ★★★★ | 中 | 非 EVM，需独立适配器 |
| P1 | Base | ★★★ | 低 | Coinbase L2，EVM 兼容 |
| P1 | Optimism | ★★★ | 低 | EVM 兼容 |
| P2 | Bitcoin | ★★★★ | 高 | UTXO 模型，需独立实现 |
| P2 | TON | ★★★ | 中 | 独立 VM |
| P2 | Tron | ★★★ | 中 | 独立 VM |
| P3 | Avalanche | ★★ | 低 | EVM 兼容 |
| P3 | zkSync | ★★ | 中 | EVM 兼容，但 Gas 特殊 |
| P3 | Linea | ★★ | 低 | EVM 兼容 |

### 2.2 新链适配器开发流程

```
新链接入步骤:
1. 研究链的 RPC API 和交易格式
2. 实现 ChainAdapter trait
3. 实现 TransactionBuilder
4. 实现 AddressFormat
5. 实现签名流程
6. 编写单元测试 + 集成测试
7. 在测试网上验证
8. 主网部署
9. 监控告警配置
10. 文档更新
```

### 2.3 ChainAdapter Trait 定义

```rust
/// 链适配器 trait — 所有链必须实现
#[async_trait]
pub trait ChainAdapter: Send + Sync {
    /// 链 ID
    fn chain_id(&self) -> u64;
    
    /// 链名称
    fn name(&self) -> &str;
    
    /// 原生货币符号
    fn native_currency(&self) -> CurrencyInfo;
    
    /// 区块浏览器 URL
    fn explorer_url(&self, tx_hash: &str) -> String;
    
    /// 地址格式验证
    fn validate_address(&self, address: &str) -> Result<()>;
    
    /// 构建交易
    async fn build_transaction(
        &self,
        params: TransactionParams,
    ) -> Result<SignedTransaction>;
    
    /// 估算 Gas
    async fn estimate_gas(
        &self,
        call: RpcCall,
    ) -> Result<GasEstimation>;
    
    /// 发送交易
    async fn send_transaction(
        &self,
        tx: SignedTransaction,
    ) Result<String>;  // 返回 tx hash
    
    /// 获取交易状态
    async fn get_transaction_status(
        &self,
        tx_hash: &str,
    ) -> Result<TransactionStatus>;
    
    /// 获取余额
    async fn get_balance(
        &self,
        address: &str,
    ) -> Result<Balance>;
    
    /// 签名消息
    fn sign_message(
        &self,
        message: &[u8],
        private_key: &PrivateKey,
    ) -> Result<Signature>;
    
    /// 验证签名
    fn verify_signature(
        &self,
        message: &[u8],
        signature: &Signature,
        public_key: &PublicKey,
    ) -> Result<()>;
}
```

### 2.4 Solana 适配器示例

```rust
/// Solana 链适配器
pub struct SolanaAdapter {
    rpc_url: String,
    commitment: CommitmentConfig,
}

#[async_trait]
impl ChainAdapter for SolanaAdapter {
    fn chain_id(&self) -> u64 {
        101  // Solana mainnet-beta
    }
    
    fn name(&self) -> &str {
        "Solana"
    }
    
    fn native_currency(&self) -> CurrencyInfo {
        CurrencyInfo {
            name: "Solana".to_string(),
            symbol: "SOL".to_string(),
            decimals: 9,
        }
    }
    
    fn validate_address(&self, address: &str) -> Result<()> {
        // Solana 地址是 base58 编码的 32 字节
        let pubkey = Pubkey::from_str(address)
            .map_err(|_| Error::InvalidAddress)?;
        // 验证是否是有效 pubkey
        Ok(())
    }
    
    async fn build_transaction(
        &self,
        params: TransactionParams,
    ) -> Result<SignedTransaction> {
        let client = RpcClient::new(&self.rpc_url);
        
        // 获取最新区块哈希
        let recent_blockhash = client
            .get_latest_blockhash_with_commitment(self.commitment)
            .await?;
        
        // 构建 Solana 交易
        let instruction = Instruction {
            program_id: params.program_id.parse()?,
            accounts: params.accounts,
            data: params.data,
        };
        
        let tx = Transaction::new_with_payer(
            &[instruction],
            Some(&params.payer_pubkey),
        );
        
        // 签名
        let mut signed_tx = tx;
        signed_tx.sign(&[&params.payer_keypair], recent_blockhash.0);
        
        Ok(SignedTransaction::Solana(signed_tx))
    }
    
    async fn send_transaction(
        &self,
        tx: SignedTransaction,
    ) -> Result<String> {
        let client = RpcClient::new(&self.rpc_url);
        
        match tx {
            SignedTransaction::Solana(tx) => {
                let signature = client
                    .send_and_confirm_transaction(&tx)
                    .await?;
                Ok(signature.to_string())
            }
            _ => Err(Error::InvalidTransactionType),
        }
    }
    
    // ... 其他方法实现
}
```

### 2.5 链配置注册

```yaml
# chains.yaml — 链注册配置
chains:
  - id: 1
    name: Ethereum
    symbol: ETH
    type: evm
    rpc_url: "https://rpc.cinacoin.com/eth"
    ws_url: "wss://rpc.cinacoin.com/eth/ws"
    explorer: "https://etherscan.io"
    explorer_tx: "https://etherscan.io/tx/{hash}"
    native_currency:
      name: Ether
      symbol: ETH
      decimals: 18
    block_time_ms: 12000
    gas_config:
      type: eip1559
      default_priority_fee: "1500000000"  # 1.5 gwei
      max_fee_multiplier: 1.5
    supported: true
    priority: P0

  - id: 137
    name: Polygon
    symbol: MATIC
    type: evm
    rpc_url: "https://rpc.cinacoin.com/polygon"
    ws_url: "wss://rpc.cinacoin.com/polygon/ws"
    explorer: "https://polygonscan.com"
    explorer_tx: "https://polygonscan.com/tx/{hash}"
    native_currency:
      name: MATIC
      symbol: POL
      decimals: 18
    block_time_ms: 2000
    gas_config:
      type: legacy
      default_gas_price: "30000000000"  # 30 gwei
    supported: true
    priority: P0

  - id: 101
    name: Solana
    symbol: SOL
    type: solana
    rpc_url: "https://rpc.cinacoin.com/solana"
    ws_url: "wss://rpc.cinacoin.com/solana/ws"
    explorer: "https://solscan.io"
    explorer_tx: "https://solscan.io/tx/{hash}"
    native_currency:
      name: Solana
      symbol: SOL
      decimals: 9
    block_time_ms: 400
    supported: false  # Phase 5 启用
    priority: P1
```

---

## 3. 性能调优

### 3.1 Relay 性能调优

```rust
// WebSocket 连接优化
struct WebSocketConfig {
    /// 最大帧大小
    max_frame_size: usize,  // 默认 64KB
    
    /// 最大消息大小
    max_message_size: usize,  // 默认 1MB
    
    /// 心跳间隔
    ping_interval: Duration,  // 30s
    
    /// 超时时间
    timeout: Duration,        // 10min
    
    /// 缓冲区大小
    write_buffer_size: usize,  // 128KB
    read_buffer_size: usize,   // 128KB
    
    /// 压缩
    compression: bool,  // per-message deflate
    
    /// 连接数限制
    max_connections: usize,  // 100,000
}

// Tokio 运行时调优
#[tokio::main]
async fn main() {
    // 根据 CPU 核心数设置工作线程
    let num_cpus = num_cpus::get();
    
    tokio::runtime::Builder::new_multi_thread()
        .worker_threads(num_cpus * 2)  // IO 密集型: 2x CPU
        .thread_stack_size(4 * 1024 * 1024)  // 4MB 栈
        .max_blocking_threads(512)
        .enable_all()
        .build()
        .unwrap()
        .block_on(run())
}

// NATS 发布优化
async fn publish_optimized(
    nats: &Connection,
    topic: &str,
    payload: &[u8],
) -> Result<()> {
    // 使用消息批处理
    let publisher = nats.publisher().await?;
    
    // 批量发布 (减少网络往返)
    publisher
        .publish_batch(topic, payload)
        .await?;
    
    Ok(())
}
```

### 3.2 RPC Proxy 性能调优

```yaml
# Envoy 调优配置
static_resources:
  listeners:
    - name: rpc_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8545
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: rpc_proxy
                http_filters:
                  - name: envoy.filters.http.router
                
                # 连接池优化
                common_http_protocol_options:
                  max_requests_per_connection: 10000  # 连接复用
                  idle_timeout: 300s
                  
                # 请求缓冲
                http2_protocol_options:
                  max_concurrent_streams: 100
                  initial_stream_window_size: 65535
                  initial_connection_window_size: 1048576
                  
                # 速率限制
                route_config:
                  virtual_hosts:
                    - name: rpc_backend
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: rpc_cluster
                            timeout: 30s
                            retry_policy:
                              retry_on: "5xx,connect-failure,retriable-4xx"
                              num_retries: 2
                              per_try_timeout: 10s
```

### 3.3 数据库调优 (Redis)

```yaml
# Redis 集群调优
redis-config:
  # 内存管理
  maxmemory: "8gb"
  maxmemory-policy: "allkeys-lru"
  
  # 持久化
  save:
    - "900 1"    # 15 分钟内至少 1 个 key 变化
    - "300 10"   # 5 分钟内至少 10 个 key 变化
    - "60 10000" # 1 分钟内至少 10000 个 key 变化
  
  # AOF (追加文件)
  appendonly: "yes"
  appendfsync: "everysec"
  
  # 网络
  tcp-keepalive: 300
  tcp-backlog: 511
  timeout: 0
  
  # 慢查询日志
  slowlog-log-slower-than: 10000  # 10ms
  slowlog-max-len: 1024
  
  # 客户端
  maxclients: 10000
```

---

## 4. 灾备与容灾

### 4.1 灾难恢复计划

| 场景 | RTO | RPO | 恢复策略 |
|------|-----|-----|---------|
| 单 Region 故障 | 5 分钟 | 0 | 自动故障切换到其他 Region |
| 全 Region NATS 故障 | 15 分钟 | 0 | 重新部署 NATS 集群 |
| 区块链节点数据损坏 | 2 小时 | 最新快照 | 从快照恢复 |
| Redis 数据丢失 | 30 分钟 | 5 分钟 | AOF 恢复 + 重建缓存 |
| 证书过期 | 5 分钟 | 0 | 自动续期 (Let's Encrypt) |

### 4.2 跨 Region 故障切换

```yaml
# 全局负载均衡 (CloudFlare)
load_balancer:
  - name: relay-global
    description: "Relay WebSocket 全局负载均衡"
    steering_policy: dynamic_latency
    fallback_pool: us-east-1
    
    pools:
      - name: us-east-1
        enabled: true
        origins:
          - name: relay-us-east
            address: relay-us-east.cinacoin.com
            enabled: true
            weight: 50
        check:
          type: tcp
          port: 443
          interval: 30
          retries: 3
          timeout: 5
      
      - name: eu-central-1
        enabled: true
        origins:
          - name: relay-eu-west
            address: relay-eu-west.cinacoin.com
            enabled: true
            weight: 30
        check:
          type: tcp
          port: 443
          interval: 30
          retries: 3
          timeout: 5
      
      - name: ap-southeast-1
        enabled: true
        origins:
          - name: relay-apac
            address: relay-apac.cinacoin.com
            enabled: true
            weight: 20
        check:
          type: tcp
          port: 443
          interval: 30
          retries: 3
          timeout: 5
```

---

## 5. 持续改进

### 5.1 性能基准测试

```yaml
benchmark_suite:
  relay:
    - name: "WebSocket 连接建立延迟"
      metric: "time_to_connected"
      target: "< 200ms P99"
      
    - name: "消息传输延迟"
      metric: "message_latency"
      target: "< 100ms P99 (同 Region)"
      target: "< 300ms P99 (跨 Region)"
      
    - name: "吞吐量"
      metric: "messages_per_second"
      target: "> 50,000 msg/s (单节点)"
      
    - name: "最大并发连接"
      metric: "max_connections"
      target: "> 100,000 (单节点)"

  rpc_proxy:
    - name: "RPC 响应延迟"
      metric: "rpc_latency"
      target: "< 500ms P95"
      
    - name: "缓存命中率"
      metric: "cache_hit_rate"
      target: "> 80%"
      
    - name: "请求吞吐量"
      metric: "requests_per_second"
      target: "> 10,000 req/s (单节点)"

  bundler:
    - name: "UserOp 处理延迟"
      metric: "userop_latency"
      target: "< 30s (从提交到链上确认)"
      
    - name: "Bundle 打包效率"
      metric: "ops_per_bundle"
      target: "> 10 ops/bundle"
```

### 5.2 成本追踪工具

```typescript
// 成本追踪仪表板
interface CostDashboard {
  /** 实时成本估算 */
  currentMonthEstimate: {
    compute: number;
    storage: number;
    network: number;
    thirdParty: number;
    total: number;
  };
  
  /** 按服务细分 */
  byService: Record<string, ServiceCost>;
  
  /** 趋势分析 */
  trend: {
    daily: DailyCost[];
    weekly: WeeklyCost[];
    monthly: MonthlyCost[];
  };
  
  /** 预算告警 */
  budgetAlerts: BudgetAlert[];
}

interface ServiceCost {
  name: string;
  currentSpend: number;
  projectedMonthly: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  optimization: string;  // 建议的优化措施
}

// 自动优化建议引擎
function generateOptimizationSuggestions(costs: CostDashboard): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  // 检查 Spot 实例机会
  if (costs.byService['k8s-compute'].projectedMonthly > 2000) {
    suggestions.push({
      type: 'spot_instances',
      description: '将 Relay 和 RPC Proxy 切换到 Spot 实例',
      estimatedSaving: costs.byService['k8s-compute'].projectedMonthly * 0.65,
      risk: 'low',
      effort: '2h',
    });
  }
  
  // 检查缓存效率
  if (costs.byService['rpc-provider'].currentSpend > 500) {
    suggestions.push({
      type: 'cache_optimization',
      description: '优化 RPC 缓存策略，提高命中率',
      estimatedSaving: costs.byService['rpc-provider'].currentSpend * 0.3,
      risk: 'low',
      effort: '8h',
    });
  }
  
  // 检查自动伸缩
  if (costs.trend.daily.some(d => d.hour >= 22 || d.hour < 6) && 
      costs.trend.daily.some(d => d.hour >= 9 && d.hour < 18)) {
    const peak = Math.max(...costs.trend.daily.filter(d => d.hour >= 9 && d.hour < 18).map(d => d.cost));
    const offpeak = Math.min(...costs.trend.daily.filter(d => d.hour >= 22 || d.hour < 6).map(d => d.cost));
    if (peak / offpeak > 3) {
      suggestions.push({
        type: 'autoscaling',
        description: '启用时间驱动的自动伸缩，低峰期缩减副本',
        estimatedSaving: (peak - offpeak) * 0.5 * 12,  // 12h 低峰期
        risk: 'low',
        effort: '4h',
      });
    }
  }
  
  return suggestions;
}
```

---

## 6. 技术债管理

### 6.1 技术债登记

| 技术债 | 来源 | 影响 | 优先级 | 预计解决时间 |
|--------|------|------|--------|------------|
| Web3Auth 依赖 | Phase 2 过渡方案 | 有外部依赖风险 | 中 | Phase 3 自研 MPC |
| 单 Region 测试网 | 开发阶段限制 | 不反映生产性能 | 低 | Phase 4 多 Region |
| 缺少 P2P DHT | Relay v1 | 中心化路由单点 | 中 | Relay v2 去中心化 |
| 节点快照手动恢复 | 运维工具不完善 | 恢复时间长 | 中 | M6 自动化 |

### 6.2 技术路线图

```
2026 Q3 (M1-M3)          2026 Q4 (M4-M6)           2027 Q1+
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Relay v1 (中心化) │────→│ Relay v2 (去中心) │────→│ Relay v3 (DHT)   │
│ RPC Proxy 基础    │     │ RPC 智能路由      │     │ P2P Mesh 网络    │
│ 基础 UI 组件      │     │ 智能账户 + Swap   │     │ 跨链互操作       │
│                  │     │ 生产部署          │     │ 自主 MPC 模块     │
│                  │     │ 成本优化          │     │ 完全去中心化      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 7. 总结

### 7.1 投资回报分析

| 项目 | 金额 | 说明 |
|------|------|------|
| **Reown 商业授权** | $500-5,000/月 | 持续费用，MAU 仍有上限 |
| **自建基础设施** | $2,800-6,900/月 | 一次性开发成本 + 月度运营 |
| **开发成本** | $50,000-100,000 | 6 个月开发 (2-3 人团队) |
| **回本周期** | 1-3 个月 | 取决于用户规模 |

> **结论**：如果预期 MAU > 500 或月 RPC > 2,500,000，自建方案在 1-3 个月内即可回本，之后持续节省成本，且无 MAU 限制、无单点依赖。

### 7.2 关键成功因素

1. **法律合规** — 完全独立实现，不使用 Reown 专有代码
2. **渐进迁移** — 允许从 AppKit 平滑过渡
3. **性能对标** — 达到或超过 Reown 的性能指标
4. **成本可控** — 月运营成本 < $7,000
5. **持续迭代** — 从中心化到去中心化的渐进路线

---

*Phase 5 Design Document v1.0 — 2026-05-16*
