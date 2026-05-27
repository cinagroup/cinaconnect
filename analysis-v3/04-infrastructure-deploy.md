# Cinacoin Infrastructure & Deployment Analysis

> **Date:** 2026-05-25  
> **Scope:** Server-side infrastructure + Cloudflare Workers deployment status  
> **Packages analyzed:** relay-server, rpc-proxy, keys-server, push-server, notify-server, bundler, erc6492, blockchain-api, explorer, cli, codemod, cdn, analytics

---

## 1. Server Implementation Depth

### 1.1 relay-server — **8/10 — Production-Ready (Self-Hosted)**

| Aspect | Status |
|--------|--------|
| Language | Rust (actix-web) + TypeScript (Cloudflare Worker) |
| WebSocket protocol | Full WCv2-compatible relay (subscribe/unsubscribe/publish/ping) |
| Pub/Sub routing | Redis Pub/Sub for cross-instance message delivery |
| Multi-instance | Broadcast channel + Redis Pub/Sub fan-out |
| Rate limiting | Per-IP in-memory with configurable window/limit |
| Topic management | Expiration tracking, cleanup, Redis-set subscriber tracking |
| Crypto module | X25519 DH + ChaCha20-Poly1305 (WCv2-compatible) — **self-contained** |
| Health/metrics | `/v1/health` + Prometheus `/v1/metrics` (12 metrics) |
| Tests | `src/tests/mod.rs` present |
| Dockerfile | Yes |
| Cloudflare Worker | Yes (Durable Objects + KV) |

**Strengths:** Full protocol implementation, production-grade Rust, proper heartbeat/keepalive, Redis Pub/Sub for horizontal scaling, rate limiting, message size enforcement, topic expiration, Prometheus metrics.

**Gaps:** TLS setup is a TODO comment in `main.rs` ("TLS setup would go here in production"). The Cloudflare Worker version uses Durable Objects for session management — good for Workers but only covers a subset of the Rust relay feature set (no Redis Pub/Sub fan-out, no crypto module in the Worker).

---

### 1.2 rpc-proxy — **9/10 — Production-Ready**

| Aspect | Status |
|--------|--------|
| Language | TypeScript (HTTP server) + Go (internal modules) + Cloudflare Worker |
| Multi-chain routing | `X-Chain-Id` header routing to upstream RPCs |
| Caching | In-memory cache for read-only methods + KV caching on Workers |
| Rate limiting | Per-IP in-memory |
| Health/metrics | `/health` + `/metrics` endpoints |
| Read-only methods | 17 JSON-RPC methods cached (eth_call, eth_get*, etc.) |
| Go internals | dedup, router, proxy, config, ratelimit modules — **production quality** |
| Cloudflare Worker | Full implementation at `cloudflare/worker.ts` — 7 chains configured |
| Dockerfile | Yes |

**Strengths:** Dual implementation (TypeScript + Go), proper caching strategy with read-only method detection, CORS support, Cloudflare Worker is fully functional with KV cache.

**Gaps:** TypeScript version uses in-memory cache (no Redis); Go internals are comprehensive but the Go binary isn't the primary entry point.

---

### 1.3 keys-server — **8/10 — Production-Ready**

| Aspect | Status |
|--------|--------|
| Language | Rust (axum) + TypeScript (Cloudflare Worker) |
| Routes | 12 endpoints: identity keys, invite keys, wallet keys |
| Database | PostgreSQL (Rust) / D1 SQLite (Workers) |
| Cache | Redis (Rust) / KV (Workers) |
| Auth | Middleware layer for authentication |
| Migrations | SQL migration files present |
| Health/metrics | Full dependency health checks (DB + Redis) + Prometheus |
| Dockerfile | Yes |

**Strengths:** Full CRUD for identity keys, invite codes, and wallet key management. Auth middleware. Database migrations. Dual backend strategy (PostgreSQL/Redis → D1/KV).

**Gaps:** The `handlers/wallet_keys.rs` and `handlers/invite_keys.rs` weren't read in depth, but handler module structure looks complete. Cloudflare Worker version is simpler (no key rotation, no wallet signing — just basic CRUD).

---

### 1.4 push-server — **8/10 — Production-Ready**

| Aspect | Status |
|--------|--------|
| Language | Rust (axum) + TypeScript (Cloudflare Worker) |
| Platforms | APNs (iOS) + FCM (Android) |
| Endpoints | `/v1/push`, `/v1/push/batch`, `/v1/register`, `/v1/unregister`, `/v1/receipt/:id`, `/health`, `/metrics` |
| Rate limiting | Per-device and per-app |
| Retry | Exponential backoff retry policy |
| Delivery receipts | UUID-based with Redis storage |
| Prometheus | Device/register metrics, active device gauge |
| Dockerfile | Yes |

**Strengths:** Full APNs + FCM client implementations, batch push, delivery receipts, retry with backoff, rate limiting at device/app level, health checks verify all dependency configs.

**Gaps:** Cloudflare Worker delegates to `PushServer` class from `dist/PushServer.js` — this is a passthrough that requires the compiled bundle. No D1 database for device token storage on Workers (uses KV only).

---

### 1.5 notify-server — **7/10 — Mostly Complete**

| Aspect | Status |
|--------|--------|
| Language | Rust (axum) + TypeScript (Cloudflare Worker) |
| Routes | `/v1/subscribe`, `/v1/unsubscribe`, `/v1/notify`, `/v1/history`, `/v1/health`, `/v1/metrics` |
| Database | PostgreSQL (Rust) / D1 SQLite (Workers) |
| Cache | Redis (Rust) / KV (Workers) |
| Auth | Auth middleware layer |
| Notification delivery | Forwards to push-server via HTTP |
| Dockerfile | Yes |

**Strengths:** Full subscription management, multi-channel support (push/email/webhook types), auth middleware, database and Redis layers.

**Gaps:** Handler implementations are thin — `notify.rs` uses `.unwrap_or()` on DB insert (crash on error). History handler exists but wasn't read in detail. Cloudflare Worker delegates to `NotifyServer` class — same passthrough pattern as push-server.

---

### 1.6 bundler — **8/10 — Production-Ready (ERC-4337)**

| Aspect | Status |
|--------|--------|
| Language | Rust (tokio) + TypeScript (client SDK) |
| Core | Mempool, gas oracle, validator, reputation system |
| UserOp validation | Full validation with state override simulation |
| Bundling loop | Timed interval with `maybe_bundle()` |
| Reputation | Sender ban/throttle tracking |
| Gas estimation | Per-UserOp gas estimation |
| RPC server | JSON-RPC / HTTP server |
| Config | YAML config + env var fallback |

**Strengths:** Complete ERC-4337 bundler with reputation-aware mempool, simulation-based validation, gas oracle, Prometheus metrics, timed bundling loop.

**Gaps:** `create_handle_ops_tx` returns `B256::ZERO` as placeholder — actual transaction encoding/sending via signer is TODO. The bundler logic is complete but the actual blockchain submission is stubbed.

---

### 1.7 erc6492 — **7/10 — Library-Complete, Verification Stub**

| Aspect | Status |
|--------|--------|
| Language | Rust + TypeScript |
| Signature formats | EIP-191, EIP-1271, ERC-6492 |
| Encode/decode | Full encoding and decoding of wrapped signatures |
| Validation | Format validation + structure checks |
| On-chain verification | `verify_signature` with alloy Provider — **requires RPC call** |

**Strengths:** Complete encode/decode for ERC-6492 wrapped signatures. Format detection. Alloy-based verification path.

**Gaps:** The actual `verify_erc6492` uses `eth_call` with state override — needs a working RPC provider. The TypeScript `validateSignature` returns `isValid: true` for standard signatures without on-chain verification (documented limitation).

---

### 1.8 blockchain-api — **6/10 — SDK Library (No Server)**

| Aspect | Status |
|--------|--------|
| Type | TypeScript SDK library (client-side) |
| Features | API client for balances, transactions, ENS, tokens, NFTs |
| Hooks | React hooks (`useBlockchainApi`, `useTokenPortfolio`) |
| Backend | None — depends on external RPC/indexer |

**Note:** This is a **client SDK**, not a server. No server component exists. It wraps viem/core-sdk for on-chain data reading.

---

### 1.9 explorer — **5/10 — Frontend Component Library**

| Aspect | Status |
|--------|--------|
| Type | React component library |
| Features | WalletSearch, logo fetching, registry |
| Hooks | `useExplorer` |
| Backend | None |

**Note:** Frontend components only. No server infrastructure.

---

### 1.10 cli — **7/10 — Tool, Not Server**

| Aspect | Status |
|--------|--------|
| Type | Node.js CLI (commander) |
| Commands | `init`, `add`, `build`, `test` |
| Package | `@cinacoin/cli` |

**Note:** Developer tooling, not infrastructure.

---

### 1.11 codemod — **6/10 — Migration Tool**

| Aspect | Status |
|--------|--------|
| Type | AST transform library |
| Transforms | AppKit→Cinacoin, WCv1→v2, RainbowKit→Cinacoin, ConnectKit→Cinacoin |

**Note:** Migration tooling for adopters. No server.

---

### 1.12 cdn — **6/10 — Browser Bundle**

| Aspect | Status |
|--------|--------|
| Type | IIFE browser bundle (Rollup) |
| Features | ConnectButton, ConnectModal, module loader |
| Deployment | Designed for script-tag / CDN delivery |

**Note:** Frontend delivery mechanism. Could be hosted on Cloudflare Pages or any CDN.

---

### 1.13 analytics — **5/10 — SDK Library**

| Aspect | Status |
|--------|--------|
| Type | TypeScript SDK |
| Features | Event tracking, privacy/anonymization, consent management |
| Providers | Local (InMemory/LocalStorage) + Remote |
| Backend | None — remote provider needs an ingestion endpoint |

**Note:** Client-side analytics SDK. The `RemoteProvider` would need a collection endpoint (not implemented as a server in this repo).

---

## 2. Deployment Status

### 2.1 wrangler.toml Inventory

| Service | wrangler.toml | Durable Objects | KV | D1 | Custom Domain |
|---------|--------------|-----------------|-----|-----|---------------|
| relay-server | ✅ Yes | ✅ RELAY_SESSION | ✅ RELAY_CACHE | ❌ | ✅ relay.cinacoin.com |
| rpc-proxy | ✅ Yes | ❌ | ✅ RPC_CACHE | ❌ | ✅ rpc.cinacoin.com |
| keys-server | ✅ Yes | ❌ | ✅ KEYS_CACHE | ✅ cinacoin-keys | ✅ keys.cinacoin.com |
| push-server | ✅ Yes | ❌ | ✅ DEVICE_TOKENS | ❌ | ✅ push.cinacoin.com |
| notify-server | ✅ Yes | ❌ | ✅ SUBSCRIPTION_CACHE | ✅ cinacoin-notifications | ✅ notify.cinacoin.com |

### 2.2 Deployment Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `deploy/deploy-all.sh` | Sequential deployment of all Workers | ✅ Present, supports env flags |
| `deploy/deploy-rpc-proxy.sh` | RPC Proxy only | ✅ Present |
| `deploy/deploy-keys-server.sh` | Keys Server only | ✅ Present |
| `deploy/deploy-push-server.sh` | Push Server only | ✅ Present |
| `deploy/deploy-notify-server.sh` | Notify Server only | ✅ Present |
| `deploy/deploy-relay-server.sh` | Relay Server only | ✅ Present |
| `deploy/check-health.sh` | Post-deploy health checks | ✅ Present (only checks rpc-proxy + keys-server) |

### 2.3 Actual Deployment Assessment

| Service | Configured | Deployable | Actually Deployed? | Notes |
|---------|-----------|------------|-------------------|-------|
| RPC Proxy | ✅ Fully | ✅ Yes | ⚠️ Configured only | KV namespace ID exists, but no live health check in script |
| Keys Server | ✅ Fully | ✅ Yes | ⚠️ Configured only | D1 DB ID exists, migration support present |
| Relay Server | ✅ Fully | ✅ Yes | ❌ Not in deploy script | wrangler.toml exists, but `deploy-all.sh` references `deploy_relay_server` function that's **undefined** |
| Push Server | ✅ Fully | ✅ Yes | ❌ Not in deploy script | wrangler.toml exists, but deploy function undefined |
| Notify Server | ✅ Fully | ✅ Yes | ❌ Not in deploy script | wrangler.toml exists, but deploy function undefined |

**Critical bug in deploy-all.sh:** The script calls `deploy_relay_server`, `deploy_notify_server`, and `deploy_push_server` functions that are not defined. Only `deploy_rpc_proxy` and `deploy_keys_server` functions are implemented. This means `deploy-all.sh` will error out on relay/notify/push servers.

---

## 3. Cloudflare Workers vs Traditional Hosting

### 3.1 Workers-Compatible Services

| Service | Workers Fit | Recommended Platform | Rationale |
|---------|------------|---------------------|-----------|
| **rpc-proxy** | ✅ Excellent | Cloudflare Workers | Stateless, KV-cachable, low CPU, perfect for Workers |
| **keys-server** | ✅ Good | Cloudflare Workers | D1 for persistence, KV for cache, but lacks PostgreSQL features |
| **relay-server** | ⚠️ Partial | **Both** (Workers + Self-hosted) | Workers DO version handles sessions, but Rust version has Redis Pub/Sub fan-out and crypto that Workers can't replicate |
| **push-server** | ⚠️ Partial | **Self-hosted** | Requires persistent connections to APNs/FCM (HTTP/2 + JWT), Workers can't maintain these |
| **notify-server** | ⚠️ Partial | **Self-hosted** | Needs to forward to push-server, store notifications in D1 — works but limited |

### 3.2 Recommendation Summary

- **Stay on Workers:** RPC Proxy (perfect fit), Keys Server (good fit with D1 migration)
- **Need traditional hosting:** Push Server (APNs/FCM clients need persistent certs + connections), Bundler (needs signer private key + blockchain transactions), Relay Server (Rust version is superior for production scale)
- **Hybrid approach:** Deploy Workers for read-heavy stateless services, use self-hosted (Docker/K8s) for stateful/compute-heavy services

---

## 4. Missing Infrastructure (vs Reown/AppKit)

### 4.1 What Cinacoin Has

| Component | Status |
|-----------|--------|
| WebSocket relay | ✅ Rust + Cloudflare Workers |
| RPC proxy | ✅ TypeScript + Go + Cloudflare Workers |
| Key management | ✅ Rust + Cloudflare Workers |
| Push notifications | ✅ Rust (APNs + FCM) + Cloudflare Workers |
| Notification system | ✅ Rust + Cloudflare Workers |
| ERC-4337 bundler | ✅ Rust (transaction sending is stub) |
| ERC-6492 verification | ✅ Rust + TypeScript library |
| Analytics SDK | ✅ TypeScript (no ingestion server) |
| CDN browser bundle | ✅ Rollup-based |
| CLI tooling | ✅ commander-based |
| Codemods | ✅ 4 migration transforms |
| Monitoring docs | ✅ Cloudflare Workers monitoring guide |
| Disaster recovery | ✅ DR plan with RTO/RPO |
| Health check scripts | ✅ Partial (2 of 5 services) |

### 4.2 What's Missing vs Reown

| Component | Reown Has | Cinacoin Status | Gap |
|-----------|-----------|-------------------|-----|
| **Explorer/Block Explorer** | Blockchain explorer UI | ✅ Component library exists | No standalone explorer app |
| **Paymaster** | Gas sponsorship | ❌ No server (only `paymaster` package directory) | Missing gas sponsorship server |
| **Smart Sessions** | Session management | ✅ keys-server has session creation | No dedicated sessions service |
| **In-app purchase** | IAP support | ❌ No server | Missing |
| **Email wallet** | Email-based wallet | ❌ No server | Missing |
| **Verifier** | Identity verification | ❌ No server | Missing |
| **Reown Name** | ENS-like naming | ❌ No server | Missing |
| **Analytics ingestion** | Data collection server | ❌ Only SDK, no server | Missing collection endpoint |
| **Multi-chain indexer** | Indexing service | ❌ No indexer | Missing — blockchain-api is client-only |
| **Transaction simulation** | Pre-execution simulation | ⚠️ Bundler has placeholder | Simulation code is stub |
| **Monitoring dashboards** | Grafana/Prometheus | ✅ Templates exist | `grafana/dashboards/` dir exists but not read |
| **Helm charts** | Kubernetes deployment | ✅ `deploy/helm/` exists | Not validated |
| **Docker compose** | Local dev | ✅ `deploy/docker/` exists | Not validated |
| **Runbooks** | Incident procedures | ✅ `deploy/runbooks/` exists | Not validated |
| **Backup scripts** | Automated backups | ✅ `deploy/backup/` exists | Not validated |
| **Secret rotation** | Key rotation automation | ❌ Manual only | DR doc lists checklist, no automation |

### 4.3 Infrastructure Gaps — Priority

| Priority | Gap | Impact |
|----------|-----|--------|
| **P0** | deploy-all.sh broken (undefined functions) | Cannot deploy 3 of 5 services via script |
| **P0** | Bundler transaction sending is stub | Cannot actually submit UserOps to chain |
| **P1** | No analytics ingestion server | Analytics SDK has nowhere to send data |
| **P1** | No paymaster server | Cannot sponsor gas for users |
| **P1** | No indexer / block explorer app | Missing Reown ecosystem parity |
| **P2** | Health check only covers 2 services | Monitoring gap for push/notify/relay |
| **P2** | No secret rotation automation | Manual security process |
| **P2** | Relay TLS is TODO | Production security gap |

---

## 5. Monitoring & Observability

### 5.1 What Exists

| Component | Status |
|-----------|--------|
| `deploy/monitoring.md` | ✅ Comprehensive Cloudflare Workers monitoring guide |
| `deploy/monitoring/cf-alerts.json` | ✅ Alert definitions |
| `deploy/monitoring/dashboards/` | ✅ Dashboard templates |
| `deploy/monitoring/grafana/` | ✅ Grafana dashboards (rpc, relay, cost) |
| `deploy/monitoring/prometheus/` | ✅ Prometheus config |
| `deploy/monitoring/alertmanager/` | ✅ Alertmanager config |
| `deploy/monitoring/slo-config.yaml` | ✅ SLO definitions |
| `deploy/monitoring/error-budget.yaml` | ✅ Error budget tracking |
| `deploy/monitoring/observability/` | ✅ Observability config |
| `deploy/runbooks/` | ✅ Incident runbooks |
| `deploy/check-health.sh` | ⚠️ Only checks 2 of 5 services |

### 5.2 Per-Server Metrics Coverage

| Service | Prometheus Metrics | Health Endpoint | Workers Analytics |
|---------|-------------------|----------------|------------------|
| relay-server | ✅ 12 metrics | ✅ `/v1/health` + `/v1/metrics` | ✅ |
| rpc-proxy | ✅ In-worker metrics | ✅ `/health` + `/metrics` | ✅ |
| keys-server | ✅ Prometheus | ✅ `/v1/health` + `/metrics` | ✅ |
| push-server | ✅ Prometheus | ✅ `/v1/health` + `/metrics` | ✅ |
| notify-server | ✅ Prometheus | ✅ `/v1/health` + `/v1/metrics` | ✅ |

### 5.3 Monitoring Gaps

- **No unified monitoring**: Each server has its own metrics endpoint; no centralized scrape config linking them together
- **No SLO monitoring automation**: SLO config exists but no automation to enforce/track
- **Health check gap**: `check-health.sh` only validates rpc-proxy and keys-server
- **No log aggregation**: Logpush destination is templated but not configured (no actual S3/R2/Datadog setup)

---

## 6. Disaster Recovery

### 6.1 DR Plan Assessment (`deploy/disaster-recovery.md`)

| Aspect | Status |
|--------|--------|
| RTO target | 4 hours |
| RPO target | 1 hour |
| MTTR target | 2 hours |
| Region failover | ✅ us-east-1 → us-west-2 documented |
| Data corruption recovery | ✅ Point-in-time restore procedures |
| Security breach response | ✅ Secret rotation checklist |
| Blockchain node failover | ✅ Fallback to Alchemy/Infura/Ankr |
| Secondary region setup | ✅ EKS, S3 cross-region replication |
| Minimum viable deployment | ✅ Helm values for P0-only services |
| Communication plan | ✅ Timeline + status page updates |
| DR testing | ✅ Quarterly drill + post-drill checklist |
| Contact directory | ❌ Referenced (`deploy/contacts.yaml`) but not in repo |

### 6.2 DR Plan Gaps

- **contacts.yaml not in repo**: Emergency contact info maintained separately — risk during incident
- **No automated failover**: DNS failover is manual (Route 53 record change)
- **Backup automation unclear**: `deploy/backup/` directory exists but not validated
- **No DR runbook for Cloudflare Workers**: The DR plan is Kubernetes-focused; Workers services aren't mentioned in failover procedures
- **Secret rotation is manual**: No automated rotation pipeline

---

## 7. Summary Scores

| Service | Completeness | Deployment Status | Workers Suitability | Priority Gap |
|---------|-------------|-------------------|--------------------|--------------|
| relay-server | 8/10 | Configured, not deployed | ⚠️ Hybrid needed | TLS TODO |
| rpc-proxy | 9/10 | Configured, partially deployable | ✅ Excellent | None critical |
| keys-server | 8/10 | Configured, partially deployable | ✅ Good | Worker is simplified |
| push-server | 8/10 | Configured, not deployed | ❌ Needs self-hosted | APNs/FCM cert management |
| notify-server | 7/10 | Configured, not deployed | ⚠️ Partial | Thin handler implementations |
| bundler | 8/10 | No Workers config (self-hosted) | ❌ Not suitable | Transaction sending is stub |
| erc6492 | 7/10 | Library (no deploy) | ❌ N/A | On-chain verification needs RPC |
| blockchain-api | 6/10 | Client SDK (no server) | ❌ N/A | Needs ingestion/indexer backend |
| explorer | 5/10 | Component library | ❌ N/A | No standalone app |
| cli | 7/10 | NPM package | ❌ N/A | Developer tool |
| codemod | 6/10 | NPM package | ❌ N/A | Migration tool |
| cdn | 6/10 | Bundle (needs hosting) | ✅ Pages/R2 | No hosting config |
| analytics | 5/10 | SDK (no server) | ⚠️ Remote needs endpoint | No ingestion server |

---

## 8. Recommendations

### Immediate (P0)

1. **Fix deploy-all.sh** — Define `deploy_relay_server`, `deploy_push_server`, `deploy_notify_server` functions
2. **Extend health checks** — Add relay, push, and notify servers to `check-health.sh`
3. **Complete bundler transaction sending** — Implement actual `eth_sendRawTransaction` in `create_handle_ops_tx`
4. **Add TLS to relay-server** — Uncomment and configure TLS in Rust server

### Short-term (P1)

5. **Choose deployment targets** — Decide Workers vs self-hosted per service and configure accordingly
6. **Build analytics ingestion server** — Complete the analytics story
7. **Deploy CDN to R2/Pages** — Configure hosting for browser bundle
8. **Connect Logpush** — Configure actual log destination (R2 recommended for Cloudflare-native)

### Medium-term (P2)

9. **Implement paymaster server** — Gas sponsorship is a Reown core feature
10. **Add secret rotation automation** — At minimum, script the rotation checklist
11. **Create DR runbook for Workers** — The DR plan is K8s-focused; Workers need their own procedures
12. **Build indexer service** — blockchain-api needs a backend indexer to be competitive

---

*Report generated: 2026-05-25T11:05:00Z*
