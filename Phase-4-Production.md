# Phase 4: 生产部署与监控 — 详细技术设计

> **目标**: 将 Relay、RPC Proxy、UI 组件和智能账户部署到生产环境，建立完整的监控、告警、运维体系  
> **时间**: M5-M6  
> **产出物**: K8s manifests, Helm Charts, Runbook, SLA 报告, 自动化运维工具

---

## 1. 基础设施拓扑

### 1.1 多 Region 部署架构

```
                          ┌─────────────────┐
                          │   CloudFlare     │
                          │   CDN + DDoS     │
                          │   WAF + Bot Mgmt │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
     │  US-East (VA)    │ │  EU-West (DE)   │ │  APAC (SG)      │
     │                  │ │                 │ │                 │
     │  ┌────────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
     │  │ K8s Cluster│  │ │  │ K8s Clstr │  │ │  │ K8s Clstr │  │
     │  │            │  │ │  │           │  │ │  │           │  │
     │  │ Relay × 3  │  │ │  │ Relay × 3 │  │ │  │ Relay × 3 │  │
     │  │ RPC-Proxy×3│  │ │  │ RPC-Prx×3 │  │ │  │ RPC-Prx×3 │  │
     │  │ Node × 2   │  │ │  │ Node × 2  │  │ │  │ Node × 2  │  │
     │  └──────┬─────┘  │ │  └─────┬─────┘  │ │  └─────┬─────┘  │
     │         │         │ │        │        │ │        │        │
     │  ┌──────┴─────┐   │ │ ┌──────┴────┐   │ │ ┌──────┴────┐   │
     │  │ Redis Clstr│   │ │ │ Redis Clst│   │ │ │ Redis Clst│   │
     │  │ NATS Cluster│  │ │ │ NATS Clst │   │ │ │ NATS Clst │   │
     │  │ Prometheus │   │ │ │ Prometheus│   │ │ │ Prometheus│   │
     │  └────────────┘   │ │ └───────────┘   │ │ └───────────┘   │
     └───────────────────┘ └─────────────────┘ └─────────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  Grafana Cloud   │
                          │  (全局看板)       │
                          └─────────────────┘
```

### 1.2 区域规划

| Region | 位置 | 云服务 | 覆盖范围 |
|--------|------|--------|---------|
| us-east-1 | 弗吉尼亚 | AWS | 北美、南美 |
| eu-central-1 | 法兰克福 | AWS | 欧洲、中东、非洲 |
| ap-southeast-1 | 新加坡 | AWS | 亚太、大洋洲 |

---

## 2. Kubernetes 部署

### 2.1 Helm Chart 结构

```yaml
# cinacoin/Chart.yaml
apiVersion: v2
name: cinacoin
description: Cinacoin Production Deployment
version: 1.0.0
appVersion: "1.0.0"

# cinacoin/values.yaml
global:
  environment: production
  region: us-east-1
  imageRegistry: ghcr.io/cinacoin

relay:
  replicaCount: 3
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2000m"
      memory: "2Gi"
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilization: 70
    targetMemoryUtilization: 80
  service:
    type: ClusterIP
    port: 8080
  ingress:
    enabled: true
    host: relay.cinacoin.com
    tls:
      enabled: true
      secretName: relay-tls

rpcProxy:
  replicaCount: 3
  resources:
    requests:
      cpu: "500m"
      memory: "256Mi"
    limits:
      cpu: "2000m"
      memory: "1Gi"
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 15
    targetCPUUtilization: 65
  env:
    REDIS_URL: "redis://redis-cluster:6379"
    PROVIDERS_FILE: "/config/providers.yaml"

nats:
  cluster:
    replicas: 3
  jetstream:
    enabled: true
    memory: "4Gi"
    file: "20Gi"

redis:
  cluster:
    enabled: true
    masterCount: 3
    replicaCount: 3
  auth:
    existingSecret: redis-password
  metrics:
    enabled: true

blockchainNodes:
  ethereum:
    enabled: true
    client: erigon
    replicas: 2
    network: mainnet
    dataDir: /data/ethereum
    persistence:
      enabled: true
      size: "2Ti"
      storageClass: gp3-io2
  polygon:
    enabled: true
    client: erigon
    replicas: 1
    network: mainnet
    dataDir: /data/polygon
    persistence:
      enabled: true
      size: "2Ti"
      storageClass: gp3-io2

monitoring:
  prometheus:
    enabled: true
    retention: "30d"
    storageSize: "500Gi"
  grafana:
    enabled: true
    adminPasswordSecret: grafana-admin
  alertmanager:
    enabled: true
    receivers:
      - name: slack
        slack_configs:
          - channel: '#cinacoin-alerts'
      - name: pagerduty
        pagerduty_configs:
          - service_key: "PD_SERVICE_KEY"
```

### 2.2 Relay 部署配置

```yaml
# relay-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: relay-server
  labels:
    app: relay-server
    component: core
spec:
  replicas: 3
  selector:
    matchLabels:
      app: relay-server
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: relay-server
        component: core
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8081"
        prometheus.io/path: "/v1/metrics"
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: relay-server
      containers:
      - name: relay
        image: ghcr.io/cinacoin/relay-server:1.0.0
        ports:
        - name: ws
          containerPort: 8080
          protocol: TCP
        - name: http
          containerPort: 8081
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        env:
        - name: RUST_LOG
          value: "info,relay=debug"
        - name: NATS_URL
          value: "nats://nats-cluster:4222"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: REGION
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['topology.kubernetes.io/region']
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /v1/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /v1/health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        volumeMounts:
        - name: tls-cert
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls-cert
        secret:
          secretName: relay-tls-cert
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: relay-server
              topologyKey: kubernetes.io/hostname
```

### 2.3 区块链节点部署

```yaml
# erigon-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: erigon-ethereum
spec:
  serviceName: erigon-ethereum
  replicas: 2
  selector:
    matchLabels:
      app: erigon-ethereum
  template:
    metadata:
      labels:
        app: erigon-ethereum
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "6060"
    spec:
      containers:
      - name: erigon
        image: thorax/erigon:latest
        args:
        - "--chain=mainnet"
        - "--http"
        - "--http.addr=0.0.0.0"
        - "--http.port=8545"
        - "--http.api=eth,net,web3,txpool,debug"
        - "--ws"
        - "--ws.addr=0.0.0.0"
        - "--ws.port=8546"
        - "--metrics"
        - "--metrics.addr=0.0.0.0"
        - "--metrics.port=6060"
        - "--txpool.globalslots=50000"
        - "--batchsize=128mb"
        - "--db.pagesize=4096"
        ports:
        - name: rpc
          containerPort: 8545
        - name: ws
          containerPort: 8546
        - name: metrics
          containerPort: 6060
        - name: p2p
          containerPort: 30303
          protocol: TCP
        - name: p2p-udp
          containerPort: 30303
          protocol: UDP
        resources:
          requests:
            cpu: "4000m"
            memory: "16Gi"
          limits:
            cpu: "8000m"
            memory: "32Gi"
        volumeMounts:
        - name: data
          mountPath: /data
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - "curl -s -X POST http://localhost:8545 -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' | grep -q result"
          initialDelaySeconds: 300
          periodSeconds: 30
          failureThreshold: 10
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: data-erigon-ethereum
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3-io2
      resources:
        requests:
          storage: 2Ti
```

---

## 3. 监控体系

### 3.1 Prometheus 指标

```yaml
# 自定义指标定义
metrics:
  # Relay 指标
  relay_connections_total:
    type: counter
    labels: [region, status]
    description: "WebSocket 连接总数"
    
  relay_messages_total:
    type: counter
    labels: [region, msg_type, direction]
    description: "消息总数"
    
  relay_message_duration_seconds:
    type: histogram
    labels: [region, msg_type]
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
    description: "消息处理延迟"
    
  relay_active_connections:
    type: gauge
    labels: [region]
    description: "当前活跃连接数"
    
  relay_session_duration_seconds:
    type: histogram
    labels: [region]
    buckets: [60, 300, 600, 1800, 3600, 7200, 14400, 86400]
    description: "会话持续时间"
    
  # RPC Proxy 指标
  rpc_requests_total:
    type: counter
    labels: [region, method, provider, status]
    description: "RPC 请求总数"
    
  rpc_request_duration_seconds:
    type: histogram
    labels: [region, method, provider]
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
    description: "RPC 请求延迟"
    
  rpc_cache_hit_total:
    type: counter
    labels: [region, method]
    description: "缓存命中数"
    
  rpc_provider_failover_total:
    type: counter
    labels: [region, from_provider, to_provider, reason]
    description: "Provider 故障切换次数"
    
  # 区块链节点指标
  node_block_height:
    type: gauge
    labels: [region, chain]
    description: "当前区块高度"
    
  node_peer_count:
    type: gauge
    labels: [region, chain]
    description: "P2P 连接节点数"
    
  node_sync_status:
    type: gauge
    labels: [region, chain]
    description: "同步状态 (1=同步, 0=不同步)"
```

### 3.2 Grafana 仪表板

```json
{
  "dashboard": {
    "title": "Cinacoin 全局监控",
    "panels": [
      {
        "title": "Relay WebSocket 连接数",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(relay_active_connections) by (region)",
            "legendFormat": "{{region}}"
          }
        ],
        "thresholds": [
          { "value": 80000, "color": "yellow", "op": "gt" },
          { "value": 90000, "color": "red", "op": "gt" }
        ]
      },
      {
        "title": "Relay 消息延迟 P99",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(relay_message_duration_seconds_bucket[5m])) by (le, region))",
            "legendFormat": "{{region}} P99"
          }
        ],
        "thresholds": [
          { "value": 0.5, "color": "yellow", "op": "gt" },
          { "value": 1.0, "color": "red", "op": "gt" }
        ]
      },
      {
        "title": "RPC 缓存命中率",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(rpc_cache_hit_total[5m])) / sum(rate(rpc_requests_total[5m])) * 100"
          }
        ],
        "thresholds": [
          { "value": 60, "color": "red" },
          { "value": 80, "color": "yellow" },
          { "value": 90, "color": "green" }
        ]
      },
      {
        "title": "RPC Provider 可用性",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(rpc_requests_total{status=\"success\"}[5m])) / sum(rate(rpc_requests_total[5m])) * 100",
            "legendFormat": "{{provider}}"
          }
        ]
      },
      {
        "title": "区块链节点同步状态",
        "type": "table",
        "targets": [
          {
            "expr": "node_block_height",
            "legendFormat": "{{chain}} - {{region}}"
          },
          {
            "expr": "node_sync_status",
            "legendFormat": "{{chain}} sync - {{region}}"
          }
        ]
      },
      {
        "title": "成本追踪 (RPC 调用)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(rpc_requests_total{provider!=\"local\"}[1h])) by (provider)",
            "legendFormat": "{{provider}} /h"
          }
        ]
      }
    ]
  }
}
```

### 3.3 告警规则

```yaml
# alert-rules.yaml
groups:
  - name: relay-alerts
    rules:
      - alert: HighRelayLatency
        expr: histogram_quantile(0.99, rate(relay_message_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Relay P99 延迟 > 500ms"
          description: "Region {{ $labels.region }} 的 Relay 消息延迟 P99 为 {{ $value }}s"
          
      - alert: RelayConnectionSpike
        expr: rate(relay_connections_total[5m]) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Relay 连接数激增"
          
      - alert: RelayPodCrash
        expr: kube_pod_container_status_restarts_total{container="relay"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Relay Pod 重启"
          
      - alert: NATSClusterDown
        expr: nats_server_connections == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NATS 集群不可用"

  - name: rpc-alerts
    rules:
      - alert: HighRPCErrorRate
        expr: sum(rate(rpc_requests_total{status="error"}[5m])) / sum(rate(rpc_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RPC 错误率 > 1%"
          
      - alert: LowRPCCacheHitRate
        expr: sum(rate(rpc_cache_hit_total[5m])) / sum(rate(rpc_requests_total[5m])) < 0.6
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "RPC 缓存命中率 < 60%"
          
      - alert: RPCProviderFailover
        expr: rate(rpc_provider_failover_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RPC Provider 故障切换发生"

  - name: node-alerts
    rules:
      - alert: NodeSyncLagging
        expr: node_sync_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "区块链节点不同步"
          
      - alert: NodeLowPeers
        expr: node_peer_count < 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "区块链节点 P2P 连接数过低"
          
      - alert: NodeDiskFull
        expr: kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "节点磁盘使用率 > 90%"
```

### 3.4 告警路由

```yaml
# alertmanager-config.yaml
route:
  receiver: default-receiver
  group_by: ['alertname', 'region']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: pagerduty
      continue: true
    - match:
        severity: warning
      receiver: slack

receivers:
  - name: default-receiver
    slack_configs:
      - channel: '#cinacoin-alerts'
        send_resolved: true
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}'
  
  - name: pagerduty
    pagerduty_configs:
      - service_key: "PD_SERVICE_KEY"
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }}'
```

---

## 4. 日志管理

### 4.1 日志结构

```yaml
# 所有服务使用结构化日志 (JSON)
log_format: json
log_fields:
  timestamp: "ISO-8601"
  level: "DEBUG|INFO|WARN|ERROR"
  service: "relay|rpc-proxy|bundler|..."
  region: "us-east-1|eu-central-1|ap-southeast-1"
  trace_id: "UUID"
  span_id: "UUID"
  message: "人类可读消息"
  fields:
    # 上下文相关字段
    topic: "string"       # relay: topic ID
    method: "string"      # rpc: RPC method
    chain_id: "number"    # 链 ID
    duration_ms: "number" # 请求耗时
    status: "number"      # HTTP 状态码
```

### 4.2 日志采集

```yaml
# fluent-bit 配置
# 收集所有 Pod 日志 → Loki
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        1
        Daemon       Off
        Log_Level    info
    
    [INPUT]
        Name         tail
        Path         /var/log/containers/*.log
        Parser       docker
        Tag          kube.*
        Refresh_Interval 5
        Rotate_Wait    30
        Mem_Buf_Limit  25MB
        Skip_Long_Lines On
    
    [FILTER]
        Name         kubernetes
        Match        kube.*
        Merge_Log    On
        Keep_Log     Off
        K8S-Logging.Parser On
        K8S-Logging.Exclude On
    
    [OUTPUT]
        Name         loki
        Match        *
        Url          http://loki:3100
        Labels       {job="cinacoin", region="${REGION}"}
        Auto_Kubernetes_Labels true
```

### 4.3 分布式追踪

```yaml
# OpenTelemetry 配置
otel:
  service:
    name: cinacoin
    version: "1.0.0"
  
  traces:
    exporter: jaeger
    endpoint: jaeger-collector:14250
    sampler:
      type: probabilistic
      ratio: 0.1  # 10% 采样 (生产环境)
  
  metrics:
    exporter: prometheus
  
  propagators:
    - tracecontext
    - baggage
```

---

## 5. CI/CD 流水线

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        
      - name: Run tests
        run: cargo test --workspace
        
      - name: Run integration tests
        run: cargo test --test integration

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [relay-server, rpc-proxy, bundler, paymaster-indexer]
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: |
          docker build -t ghcr.io/cinacoin/${{ matrix.service }}:${{ github.sha }} \
            -t ghcr.io/cinacoin/${{ matrix.service }}:latest \
            -f docker/${{ matrix.service }}/Dockerfile .
      
      - name: Push to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
          docker push ghcr.io/cinacoin/${{ matrix.service }}:${{ github.sha }}
          docker push ghcr.io/cinacoin/${{ matrix.service }}:latest

  deploy-staging:
    needs: build
    if: github.ref_type == 'tag' || github.event.inputs.environment == 'staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: azure/setup-kubectl@v3
      - uses: azure/setup-helm@v3
      
      - name: Deploy to staging
        run: |
          helm upgrade --install cinacoin ./helm/cinacoin \
            --namespace staging \
            --set global.environment=staging \
            --set relay.image.tag=${{ github.sha }} \
            --set rpcProxy.image.tag=${{ github.sha }} \
            --wait --timeout 10m

  deploy-production:
    needs: deploy-staging
    if: github.ref_type == 'tag'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: azure/setup-kubectl@v3
      - uses: azure/setup-helm@v3
      
      - name: Deploy to production (canary)
        run: |
          # Canary deployment: 10% traffic
          helm upgrade --install cinacoin-canary ./helm/cinacoin \
            --namespace production \
            --set global.environment=production \
            --set relay.image.tag=${{ github.sha }} \
            --set relay.replicaCount=1 \
            --wait --timeout 10m
      
      - name: Canary verification
        run: |
          # 等待 15 分钟观察指标
          sleep 900
          # 检查错误率
          ERROR_RATE=$(curl -s http://grafana/api/v1/query?query=rpc_error_rate | jq '.data.result[0].value[1]')
          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "Canary failed: error rate ${ERROR_RATE}"
            helm rollback cinacoin-canary --namespace production
            exit 1
          fi
      
      - name: Full rollout
        run: |
          helm upgrade --install cinacoin ./helm/cinacoin \
            --namespace production \
            --set global.environment=production \
            --set relay.image.tag=${{ github.sha }} \
            --wait --timeout 15m
```

---

## 6. Runbook (运维手册)

### 6.1 常见故障处理

```yaml
runbooks:
  - title: "Relay 延迟飙升"
    severity: P1
    symptoms:
      - "Relay P99 延迟 > 1s 持续 5 分钟"
      - "WebSocket 连接超时增加"
    diagnosis:
      - "检查 NATS 集群状态: kubectl get pods -n nats"
      - "检查 Redis 连接: redis-cli -h redis-cluster ping"
      - "检查 CPU/内存使用: kubectl top pods -l app=relay-server"
    remediation:
      - "如果 NATS 异常: kubectl rollout restart deployment nats -n nats"
      - "如果 Redis 异常: kubectl rollout restart statefulset redis -n redis"
      - "如果 CPU 满载: kubectl scale deployment relay-server --replicas=6"
      - "如果问题持续: 滚动重启所有 Relay Pod"
    escalation: "15 分钟未解决 → 通知 on-call 工程师"
    
  - title: "RPC Provider 全部不可用"
    severity: P1
    symptoms:
      - "RPC 错误率 > 50%"
      - "所有 Provider 健康检查失败"
    diagnosis:
      - "检查各 Provider 状态页面 (status.alchemy.com, status.infura.io)"
      - "检查自建节点: curl http://erigon:8545 -d '{\"method\":\"eth_blockNumber\"}'"
      - "检查网络连接: curl -I https://eth-mainnet.g.alchemy.com/v2/..."
    remediation:
      - "启用应急免费 Provider (public nodes)"
      - "增加自建节点副本"
      - "联系 Provider 技术支持"
      
  - title: "区块链节点不同步"
    severity: P2
    symptoms:
      - "node_sync_status == 0"
      - "区块高度落后 > 100 块"
    diagnosis:
      - "检查 P2P 连接: curl http://erigon:8545 -d '{\"method\":\"net_peerCount\"}'"
      - "检查磁盘 IO: iostat -x 5"
      - "检查内存使用: free -h"
    remediation:
      - "P2P 连接低: 增加 max_peers 配置"
      - "磁盘 IO 瓶颈: 迁移到 NVMe SSD"
      - "如无法恢复: 从快照恢复 (snapshot sync)"
      
  - title: "内存泄漏"
    severity: P2
    symptoms:
      - "Pod 内存持续增长"
      - "OOM Kill 事件"
    diagnosis:
      - "检查内存使用趋势: grafana > Pod Memory"
      - "收集 heap profile: curl http://pod:9090/debug/pprof/heap"
    remediation:
      - "重启受影响的 Pod"
      - "分析 heap profile 定位泄漏源"
      - "修复代码并部署新版本"
```

### 6.2 日常运维检查清单

```yaml
daily_checks:
  - "检查所有 Grafana 仪表板告警面板"
  - "检查 Relay 连接数和消息延迟"
  - "检查 RPC 缓存命中率和错误率"
  - "检查区块链节点同步状态"
  - "检查磁盘使用率 (节点数据)"
  - "检查成本支出 (RPC Provider)"
  - "检查异常日志 (ERROR 级别)"

weekly_checks:
  - "审查告警规则有效性"
  - "分析错误率趋势"
  - "审查 RPC Provider 配额使用情况"
  - "检查证书有效期"
  - "备份配置和数据库"
  - "审查安全事件"

monthly_checks:
  - "SLA 报告生成"
  - "容量规划审查"
  - "成本优化分析"
  - "灾备演练"
  - "依赖组件安全更新"
  - "渗透测试"
```

---

## 7. SLA 目标与承诺

### 7.1 SLA 定义

| 指标 | 目标 | 测量方法 |
|------|------|---------|
| **可用性** | 99.95% | 月 uptime / 月 total * 100 |
| **Relay 延迟 P99** | < 500ms | histogram_quantile(0.99, ...) |
| **RPC 可用性** | 99.9% | 成功率 * 100 |
| **RPC 延迟 P95** | < 2s | histogram_quantile(0.95, ...) |
| **数据持久性** | 99.999% | 备份验证 |
| **故障恢复时间 (RTO)** | < 15 分钟 | 从告警到恢复 |
| **数据恢复点 (RPO)** | < 5 分钟 | 备份间隔 |

### 7.2 SLA 计算

```
可用性 = (总时间 - 停机时间) / 总时间 * 100%

99.95% 可用性 = 每年最多 4.38 小时停机
99.9%  可用性 = 每年最多 8.76 小时停机
99.99% 可用性 = 每年最多 52.56 分钟停机
```

---

*Phase 4 Design Document v1.0 — 2026-05-16*
