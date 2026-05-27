# 02 — Infrastructure & Backend Services Gap Analysis

> CinaAuth/Cinacoin vs Reown (WalletConnect) Infrastructure  
> Generated: 2026-05-16 UTC  
> Scope: Phase 4 (Production) + Phase 5 (Optimization) design docs + deploy/ manifests

---

## 1. Executive Summary

| Dimension | CinaAuth/Cinacoin | Reown | Verdict |
|-----------|-------------------|-------|---------|
| Backend Services | Relay + RPC Proxy (custom) | push-server, notify-server, keys-server, erc6492, yttrium | **Gap** — missing push/notify/keys |
| Infrastructure as Code | Helm chart + raw K8s manifests | Terraform (keys-server) + infra-as-code patterns | **Gap** — no Terraform/Pulumi |
| Monitoring & Observability | Prometheus + Grafana + Jaeger + Fluent Bit + OTel | Proprietary monitoring stack (not open-sourced) | **Advantage** — full observability stack |
| Cost Management | KEDA, Spot instances, budget alerts, chain-config cost rules | Commercial SaaS pricing ($500–$5,000/mo + MAU limits) | **Advantage** — built-in cost control |
| Deployment Automation | GitHub Actions CI/CD with canary | Commercial deployment (managed) | **Parity** — comparable automation |
| Blockchain Nodes | Erigon (EVM) + Solana validator, deployed as StatefulSets | Managed node infrastructure (not exposed) | **Advantage** — transparent node management |
| Relay Server | Custom Rust relay with NATS + Redis | WalletConnect relay (proprietary, SaaS) | **Comparable** — custom implementation |
| Push Notifications | Planned APNs/FCM (Phase 5 cost model) | Full push-server (Rust, APNs + FCM) + notify-server | **Major Gap** — no push implementation |

**Bottom Line:** Cinacoin has a **stronger** infrastructure foundation (monitoring, cost management, IaC quality) than what Reown exposes publicly, but is **missing critical backend services** (push notifications, identity keys, ERC-6492 verification, smart account orchestration) that are core to Reown's value proposition.

---

## 2. Backend Services Completeness

### 2.1 Push Notification Infrastructure

| Feature | Reown | CinaAuth/Cinacoin | Gap |
|---------|-------|-------------------|-----|
| **push-server** | ✅ Rust, 34 stars, production APNs2 + FCM | ❌ Not implemented | **P0 — Critical** |
| **notify-server** | ✅ Rust, 22 stars, notify.walletconnect.com | ❌ Not implemented | **P0 — Critical** |
| **APNs client (a2)** | ✅ Rust async APNs2 client, 170 stars | ❌ No APNs integration | **P0** |
| **FCM client (fcm-rust)** | ✅ Rust FCM implementation, 2 stars | ❌ No FCM integration | **P1** |
| **Push cost budget** | N/A (included in SaaS) | ✅ $50–200/mo budget line (Phase 5) | Planning only |

**Analysis:** This is the **largest gap**. Reown has a complete push notification stack:
- `push-server` — handles device registration, token management, message routing
- `notify-server` — the public-facing notification service
- `a2` — battle-tested async APNs client (their most-starred utility repo)
- `fcm-rust` — Firebase Cloud Messaging integration

Cinacoin only mentions push notifications as a **cost line item** in Phase 5 ($50–200/mo). There is no push server implementation, no device registration flow, no notification routing logic.

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Implement push-server (Rust) with APNs + FCM support. Mirror Reown's push-server architecture: device token registration, per-app routing, message queuing via NATS. | 2–3 weeks |
| **P0** | Deploy APNs client (use Reown's `a2` as reference — MIT license, or write independent implementation) | 1–2 weeks |
| **P1** | Implement FCM integration for Android push | 1 week |
| **P1** | Add push notification metrics to Prometheus (delivery rate, latency, failure rate) | 2 days |
| **P2** | Add push notification runbook to deploy/runbooks/ | 1 day |

### 2.2 Identity & Keys Management

| Feature | Reown | CinaAuth/Cinacoin | Gap |
|---------|-------|-------------------|-----|
| **keys-server** | ✅ HCL/Terraform, 17 stars — identity keys + invite keys for Chat SDK | ❌ Not implemented | **P0** |
| **gauth-rs** | ✅ Google OAuth2 client (Rust, 0 stars) | ❌ No OAuth2 integration | **P2** |
| **erc6492** | ✅ Universal Rust Ethereum signature verification, 7 stars | ❌ Not implemented | **P1** |

**Analysis:** Reown's keys-server manages identity keys and invite keys for their Chat SDK. This is essential for:
- Secure messaging between wallets and dApps
- Device-to-device encrypted communication
- Key rotation and recovery

Cinacoin has no equivalent identity key management. The Phase 3 design mentions "MPC module" for Phase 5 but there is no keys-server or key management infrastructure.

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Design and implement identity key management service. Must support key generation, storage, rotation, and invite key distribution. Consider deploying as K8s StatefulSet with encrypted volume. | 3–4 weeks |
| **P1** | Implement ERC-6492 signature verification for smart contract wallet support. This is needed for Phase 3 smart account integration. | 1–2 weeks |
| **P2** | Google OAuth2 integration for Web2 login fallback | 1 week |

### 2.3 Smart Account Infrastructure

| Feature | Reown | CinaAuth/Cinacoin | Gap |
|---------|-------|-------------------|-----|
| **yttrium** | ✅ Rust, 12 stars — cross-platform smart account library | ❌ Referenced in Phase 3 only (design doc) | **P0** |

**Analysis:** Reown's `yttrium` is a cross-platform smart account library. Cinacoin Phase 3 has a detailed smart account design (Account Abstraction, UserOperations, bundler) but the actual implementation library is not yet built. The deploy/ directory has a `bundler/Dockerfile` but no yttrium-equivalent library.

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Complete the bundler implementation (deploy/docker/bundler/Dockerfile exists but no code referenced) | 2–3 weeks |
| **P0** | Build smart account SDK library (Rust + TypeScript) equivalent to yttrium | 3–4 weeks |
| **P1** | Add bundler to Helm chart (currently missing from cinacoin/values.yaml) | 2 days |

---

## 3. Infrastructure as Code Quality

### 3.1 Helm Chart Assessment

```
deploy/helm/cinacoin/
├── Chart.yaml              ✅ Complete (kubeVersion, maintainers, keywords)
├── values.yaml             ✅ Comprehensive (all services parameterized)
├── templates/
│   ├── _helpers.tpl        ✅ Standard label helpers
│   ├── namespace.yaml      ✅ Namespace creation
│   ├── relay/
│   │   ├── deployment.yaml ✅ Full spec (security context, probes, topology)
│   │   ├── hpa.yaml        ✅ HPA v2 (CPU + memory targets)
│   │   ├── service.yaml    ✅ ClusterIP
│   │   └── ingress.yaml    ✅ TLS + cert-manager + nginx annotations
│   ├── rpc-proxy/
│   │   ├── deployment.yaml ✅ Full spec (security context, probes)
│   │   ├── hpa.yaml        ✅ HPA v2
│   │   └── service.yaml    ✅ ClusterIP
│   ├── nats/
│   │   ├── service.yaml    ✅ ClusterIP + headless
│   │   └── statefulset.yaml✅ JetStream enabled, route discovery
│   └── redis/
│       ├── service.yaml    ✅ ClusterIP
│       └── statefulset.yaml✅ Cluster mode, AOF persistence
```

**Strengths:**
- Full Helm v2 chart with proper `kubeVersion` constraint
- Security contexts on all containers (runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities)
- Topology spread constraints for zone awareness
- Pod anti-affinity for high availability
- Rolling update strategy with maxUnavailable=0 (zero downtime)
- Proper secret references (envFromSecrets)
- Prometheus scrape annotations on all services
- Ingress with cert-manager TLS automation

**Gaps vs Reown:**
- No Terraform/Pulumi for cloud resource provisioning (Reown's keys-server uses HCL/Terraform)
- No ArgoCD/Flux GitOps deployment manifests
- No multi-cluster management (Phase 4 describes 3 regions but Helm chart is single-cluster)

### 3.2 Terraform / Cloud IaC

| IaC Component | Reown | CinaAuth/Cinacoin | Gap |
|---------------|-------|-------------------|-----|
| Terraform (keys-server) | ✅ HCL/Terraform repo | ❌ No Terraform | **P1** |
| AWS resources | Not public | Budget alerts reference AWS CLI | **P2** |
| GCP resources | Not public | Budget alerts reference GCloud | **P2** |
| GitOps (ArgoCD/Flux) | Not public | ❌ Not configured | **P1** |

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P1** | Create Terraform modules for EKS cluster, VPC, Route53, CloudFlare integration | 1–2 weeks |
| **P1** | Add ArgoCD Application manifests for GitOps deployment | 3–5 days |
| **P2** | Add AWS/GCP budget alert Terraform resources (currently only CLI templates) | 2 days |

---

## 4. Monitoring & Observability

### 4.1 Stack Comparison

| Component | CinaAuth/Cinacoin | Reown | Assessment |
|-----------|-------------------|-------|------------|
| **Metrics** | Prometheus (v2.51.0) | Proprietary | ✅ **Advantage** — standard stack |
| **Dashboards** | Grafana (10.4.0) | Proprietary | ✅ **Advantage** — full dashboards |
| **Alerting** | AlertManager (v0.27.0) + Slack + PagerDuty | Unknown | ✅ **Advantage** — multi-channel |
| **Tracing** | Jaeger (1.55) + OpenTelemetry Collector | Unknown | ✅ **Advantage** — full tracing |
| **Logging** | Fluent Bit → Loki | Unknown | ✅ **Advantage** — structured logging |
| **Custom Metrics** | relay, rpc, node, cost — 4 alert rule files | N/A | ✅ **Advantage** |
| **SLA Monitoring** | 99.95% availability target, RTO < 15min, RPO < 5min | Not public | ✅ Documented SLAs |

### 4.2 Prometheus Alert Rules

| Alert File | Rules | Coverage |
|------------|-------|----------|
| `relay-alerts.yaml` | 7 rules (latency warning/critical, connection spike, pod crash, NATS down, connections high, HPA maxed) | ✅ Excellent |
| `rpc-alerts.yaml` | 6 rules (error rate warning/critical, cache hit rate, failover, latency, pod crash) | ✅ Excellent |
| `node-alerts.yaml` | 5 rules (sync lag, low peers, disk full, block height stall, memory) | ✅ Excellent |
| `cost-alerts.yaml` | 5 rules (budget exceeded, external calls, spot interruption, monthly budget, storage cost) | ✅ **Unique** — Reown has no equivalent |

### 4.3 Runbook Coverage

| Runbook | Status | Quality |
|---------|--------|---------|
| `relay-latency-spike.md` | ✅ Complete (5-step diagnosis, 4 remediation paths, escalation) | High |
| `rpc-provider-outage.md` | ✅ Complete (4-step diagnosis, 4 remediation steps, escalation) | High |
| `node-desync.md` | ✅ Present | Medium |
| `memory-leak.md` | ✅ Present | Medium |
| `daily-checklist.md` | ✅ Complete (morning check, all categories) | High |
| `weekly-checklist.md` | ✅ Present | Medium |
| `monthly-checklist.md` | ✅ Present | Medium |

**Gap:** No runbook for push notification failures (since push-server doesn't exist yet).

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P1** | Add Jaeger persistent storage (currently memory-only: `--memory.max-traces=50000`) | 2 days |
| **P1** | Add Loki deployment manifest (referenced in Fluent Bit config but no deploy/manifest) | 1 day |
| **P2** | Add Grafana provisioning for dashboards (currently JSON only, not auto-provisioned) | 2 days |
| **P2** | Add synthetic monitoring / uptime checks | 3 days |

---

## 5. Cost Management

### 5.1 Cinacoin Cost Features

| Feature | Status | Details |
|---------|--------|---------|
| **KEDA autoscaling** | ✅ Implemented | Prometheus-based + cron-based scalers for relay and rpc-proxy |
| **Spot instances** | ✅ Implemented | Spot + OnDemand dual deployment for relay, graceful shutdown |
| **Budget alerts** | ✅ Templates | AWS Budget + GCP Budget templates (CLI usage) |
| **Cost alert rules** | ✅ 5 Prometheus rules | Budget exceeded, external call rate, spot interruption, monthly budget, storage |
| **Chain cost configs** | ✅ Registry | Per-chain gas configs, priority matrix, cost tracking |
| **Cost dashboard** | ✅ Grafana JSON | Cost dashboard defined in Phase 4 design |
| **Cache optimization** | ✅ Design | Multi-layer cache (L1 Moka + L2 Bloom + L3 Redis) with dynamic TTL |
| **Multi-Provider bidding** | ✅ Design | Dynamic provider selection based on price |

### 5.2 Reown Cost Model

| Feature | Status |
|---------|--------|
| Pricing | $500–$5,000/month + MAU limits |
| Cost optimization | Managed by Reown (black box) |
| Budget alerts | N/A (SaaS billing) |
| Spot instance support | N/A |
| Cost dashboard | Customer-facing billing portal only |

**Assessment:** Cinacoin has a **massive advantage** in cost transparency and control. The built-in KEDA scalers, spot instance configs, budget alerts, and Prometheus cost rules provide visibility and control that Reown's SaaS model cannot match.

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P1** | Implement cost dashboard as working Grafana dashboard (currently JSON design doc) | 2 days |
| **P2** | Add actual cloud cost ingestion (AWS Cost Explorer / GCP Billing API → Prometheus) | 1 week |
| **P2** | Convert budget alert templates to Terraform | 2 days |

---

## 6. Deployment Automation

### 6.1 CI/CD Pipeline (Phase 4 Design)

| Stage | Implementation | Status |
|-------|---------------|--------|
| Test | `cargo test --workspace` + integration tests | ✅ Design doc |
| Build | Multi-service Docker → GHCR | ✅ Design doc |
| Staging | Helm deploy to staging namespace | ✅ Design doc |
| Production | Canary (10% traffic) → verify → full rollout | ✅ Design doc |
| Rollback | `helm rollback` on canary failure | ✅ Design doc |

### 6.2 Docker Images

| Service | Dockerfile | Quality |
|---------|-----------|---------|
| relay-server | Multi-stage (Rust → debian-slim) | ✅ Excellent (layer caching, non-root user, health check) |
| rpc-proxy | Multi-stage (Go → scratch) | ✅ Excellent (static binary, scratch image, minimal attack surface) |
| bundler | Present | ⚠️ Not reviewed (no source available) |
| core-ui | Nginx-based | ✅ Present |

### 6.3 Gaps vs Reown

| Gap | Priority | Notes |
|-----|----------|-------|
| No ArgoCD/Flux GitOps | P1 | Helm-based only, no continuous reconciliation |
| No environment promotion automation | P1 | Manual staging → production promotion in design doc |
| No blue-green deployment | P2 | Canary is implemented but blue-green is not |
| No deployment dashboard | P2 | Cannot visualize deployment status |

---

## 7. Blockchain Node Management

### 7.1 Node Deployment

| Node Type | Client | Replicas | Storage | Health Checks |
|-----------|--------|----------|---------|---------------|
| Ethereum | Erigon | 2 | 2Ti (gp3-io2) | ✅ eth_blockNumber probe |
| Polygon | Erigon | 1 | 2Ti (gp3-io2) | ✅ Inherited from Ethereum config |
| Solana | solana-validator | 1 | 4Ti (2× local-ssd) | ✅ solana health + cluster-version |

### 7.2 Node Configuration Quality

**Erigon (Ethereum):**
- ✅ Metrics enabled (port 6060)
- ✅ WebSocket + HTTP + RPC APIs exposed
- ✅ txpool configured (50K global slots)
- ✅ DB page size optimized (4096)
- ✅ Batch size configured (128MB)
- ✅ P2P TCP + UDP ports exposed
- ✅ Readiness probe: eth_blockNumber with grep
- ⚠️ Uses `latest` tag — should pin version

**Solana Validator:**
- ✅ Multiple entrypoints configured
- ✅ Genesis hash verification
- ✅ Ledger size limit configured
- ✅ WAL recovery mode set
- ✅ No voting (RPC-only node)
- ✅ Dual volume mounts (data + accounts)
- ⚠️ `runAsNonRoot: false` — security concern
- ⚠️ No resource limits set in values.yaml (only in raw StatefulSet)

### 7.3 Gaps vs Reown

| Feature | Reown | CinaAuth/Cinacoin | Gap |
|---------|-------|-------------------|-----|
| Node management | Managed infrastructure | Full K8s manifests + configs | **Advantage** — transparent |
| Node monitoring | Not exposed | Prometheus metrics + alert rules | **Advantage** — observable |
| Snapshot management | Managed | Manual (mentioned in technical debt) | **Gap** — P1 |
| Multi-chain node orchestration | Not exposed | Chain registry config | **Advantage** — documented |

**Recommendations:**

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Pin Erigon and Solana Docker image versions (remove `latest`) | 1 day |
| **P1** | Fix Solana security context (`runAsNonRoot: false`) | 1 day |
| **P1** | Automate node snapshot backup/restore (currently manual) | 1–2 weeks |
| **P1** | Add node sync recovery automation (auto-snapshot-sync on desync) | 1 week |
| **P2** | Add Solana node to Helm chart values (currently separate manifest) | 2 days |

---

## 8. Relay Server Capabilities

### 8.1 Cinacoin Relay

| Feature | Status | Implementation |
|---------|--------|---------------|
| WebSocket transport | ✅ | Port 8080, TLS via ingress |
| HTTP health endpoint | ✅ | `/v1/health` on port 8081 |
| NATS JetStream messaging | ✅ | 3-node cluster, 4Gi memory, 20Gi file store |
| Redis session cache | ✅ | 6-node cluster (3 master + 3 replica) |
| Multi-region support | ✅ Design | CloudFlare LB, 3 regions planned |
| Prometheus metrics | ✅ | `/v1/metrics` on port 9090 |
| Auto-scaling | ✅ | HPA (CPU+memory) + KEDA (connections + queue depth) |
| Zero-downtime deploys | ✅ | RollingUpdate, maxUnavailable=0 |
| Connection draining | ✅ | 60s graceful period |
| Security | ✅ | Non-root, readOnlyRootFs, drop ALL caps |

### 8.2 Reown Relay

| Feature | Status | Notes |
|---------|--------|-------|
| WebSocket relay | ✅ | Proprietary, SaaS-only |
| Multi-region | ✅ | Managed by Reown |
| Push integration | ✅ | Integrated with push-server |
| Identity/Chat | ✅ | Integrated with keys-server |

### 8.3 Comparison

Cinacoin relay is a **clean-room implementation** with better observability and cost control. However, it lacks:
1. Push notification integration (needs push-server)
2. Identity/Chat SDK integration (needs keys-server)
3. ERC-6492 signature verification (needs erc6492 implementation)

The relay architecture (NATS + Redis) is **architecturally sound** and comparable to Reown's approach, but the ecosystem services are missing.

---

## 9. Priority Summary

### P0 — Critical (Must Have for Production)

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 1 | **Push Server missing** | Implement push-server (Rust) with APNs + FCM | 2–3 weeks |
| 2 | **APNs client missing** | Deploy async APNs2 client for iOS push | 1–2 weeks |
| 3 | **Keys server missing** | Implement identity key management service | 3–4 weeks |
| 4 | **Smart account library missing** | Complete bundler + yttrium-equivalent SDK | 3–4 weeks |
| 5 | **Docker image tags unpinned** | Pin Erigon and Solana to specific versions | 1 day |

### P1 — Important (Should Have)

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 6 | **FCM client missing** | Implement Firebase Cloud Messaging for Android | 1 week |
| 7 | **ERC-6492 verification missing** | Implement universal signature verification | 1–2 weeks |
| 8 | **No Terraform IaC** | Create Terraform for EKS, VPC, DNS | 1–2 weeks |
| 9 | **No GitOps (ArgoCD/Flux)** | Deploy GitOps continuous reconciliation | 3–5 days |
| 10 | **Loki missing** | Deploy Loki for log aggregation (Fluent Bit configured but no Loki) | 1 day |
| 11 | **Jaeger memory-only** | Add persistent storage for Jaeger traces | 2 days |
| 12 | **Node snapshot automation** | Automated backup/restore for blockchain nodes | 1–2 weeks |
| 13 | **Solana security context** | Fix `runAsNonRoot: false` in Solana StatefulSet | 1 day |
| 14 | **Bundler missing from Helm** | Add bundler to cinacoin Helm chart | 2 days |
| 15 | **Cost dashboard not deployed** | Deploy cost dashboard from design to Grafana | 2 days |

### P2 — Nice to Have

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 16 | **Google OAuth2** | Implement gauth-rs equivalent for Web2 login | 1 week |
| 17 | **Synthetic monitoring** | Add uptime/health synthetic checks | 3 days |
| 18 | **Blue-green deployment** | Add blue-green deploy option alongside canary | 1 week |
| 19 | **Cloud cost ingestion** | Connect AWS Cost Explorer / GCP Billing to Prometheus | 1 week |
| 20 | **Budget alerts Terraform** | Convert CLI budget templates to Terraform | 2 days |
| 21 | **Grafana auto-provisioning** | Auto-provision dashboards from JSON files | 2 days |
| 22 | **Deployment dashboard** | Visualize deployment status and history | 3 days |
| 23 | **Push runbook** | Add runbook for push notification failures | 1 day |

---

## 10. Architecture Recommendations

### 10.1 Immediate Actions (Next 2 Weeks)

1. **Pin Docker image versions** — Replace `latest` tags with specific versions for all blockchain nodes
2. **Deploy Loki** — Fluent Bit is configured but Loki is not deployed; logs are going nowhere
3. **Add persistent Jaeger storage** — Memory-only traces are lost on restart; use Elasticsearch or Cassandra backend
4. **Fix Solana security context** — `runAsNonRoot: false` is a security risk

### 10.2 Short-term (Next Month)

1. **Build push-server** — This is the biggest functional gap. Without it, the relay cannot deliver push notifications to mobile wallets
2. **Build keys-server** — Identity key management is needed for any Chat SDK equivalent
3. **Implement ERC-6492** — Required for smart contract wallet signature verification (Phase 3 integration)
4. **Add Terraform** — Current deploy is Helm-only; cloud resources need proper IaC

### 10.3 Medium-term (Next Quarter)

1. **Complete smart account SDK** — The yttrium equivalent for cross-platform smart account management
2. **Deploy ArgoCD/Flux** — Move from CI/CD push to GitOps pull model
3. **Automate node snapshots** — Currently listed as technical debt in Phase 5
4. **Build cost dashboard** — Deploy the Phase 5 cost tracking tooling

---

## 11. Competitive Assessment

| Dimension | Cinacoin Score | Reown Score | Notes |
|-----------|:--------------:|:-----------:|-------|
| Relay | 8/10 | 9/10 | Missing push/keys integration |
| RPC Proxy | 8/10 | 7/10 | Better cost control, multi-provider |
| Monitoring | 9/10 | 5/10 | Full stack vs proprietary black box |
| Cost Management | 9/10 | 3/10 | Transparent vs opaque pricing |
| Push/Notify | 1/10 | 9/10 | Missing vs production-ready |
| Identity/Keys | 2/10 | 8/10 | Not implemented vs production-ready |
| Smart Accounts | 3/10 | 7/10 | Design-only vs yttrium library |
| IaC Quality | 7/10 | 6/10 | Helm excellent, no Terraform |
| Deployment | 7/10 | 8/10 | Good CI/CD, no GitOps |
| Node Management | 8/10 | 6/10 | Transparent vs managed |
| **Overall** | **6.2/10** | **6.8/10** | Strong foundation, missing key services |

**Conclusion:** Cinacoin has built a **superior infrastructure platform** (monitoring, cost management, observability, deployment quality) compared to what Reown exposes. However, the **absence of push notification, identity key management, and ERC-6492 services** creates functional gaps that must be filled to achieve feature parity. The good news: these are **service additions**, not infrastructure rebuilds — the foundation is solid.

---

*Report generated 2026-05-16 | Part of Cinacoin vs Reown analysis series*
