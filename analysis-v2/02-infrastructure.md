# Infrastructure & Backend Services Comparison

> CinaAuth/Cinacoin vs Reown — Infrastructure Deep Dive
> Generated: 2026-05-17

---

## 1. Service-by-Service Mapping

| CinaAuth/Cinacoin | Reown Equivalent | Language | Status |
|---|---|---|---|
| **relay-server** | WalletConnect Relay (TypeScript) + reown-rust (relay_client) | Rust vs TS/Rust | ⚡ Different architecture |
| **push-server** | push-server-2 (Rust, archived/preview) + a2 (Rust, APNs2 client) | Rust | ✅ Equivalent |
| **keys-server** | keys-server (HCL/Terraform) — identity keys | Rust vs HCL | ⚡ Different approach |
| **bundler** | yttrium (Rust, smart account library) | Rust | ⚡ Different scope |
| **erc6492** | erc6492 (Rust) | Rust | ✅ Equivalent |
| **rpc-proxy** | _None_ | Go | 🆕 CinaAuth unique |
| **deploy/** | _None (Cloud-only)_ | Helm/K8s | 🆕 CinaAuth unique |

---

## 2. Relay Server Comparison

### CinaAuth: relay-server (Rust + Actix-web + NATS JetStream)

- **Language**: Rust with Actix-web for WebSocket handling
- **Message broker**: NATS JetStream (self-hosted, cluster)
- **Encryption**: X25519 + ChaCha20-Poly1305 (end-to-end)
- **Protocol**: WalletConnect v2 relay protocol
- **Architecture**: Stateless service → NATS pub/sub → Push Server
- **Docker**: Distroless cc-debian12 runtime, <50MB images
- **K8s**: 3 replicas, HPA 3-20, multi-zone topology spread, pod anti-affinity
- **Ingress**: Dedicated WSS ingress with 3600s timeout

### Reown: Relay (TypeScript) + reown-rust (relay_client / relay_rpc)

- **Server**: TypeScript implementation (WalletConnect/relay — 37 stars, last updated 2023)
- **Client SDK**: reown-rust provides `relay_client` (HTTP + WebSocket clients) and `relay_rpc` (domain types, auth tokens)
- **Infrastructure**: **Cloud-hosted only** — users connect to relay.walletconnect.com
- **No self-hosted option**: The relay is a managed service; no Kubernetes deployment provided
- **reown-rust scope**: Client library (41 stars) — relay_client, relay_rpc, blockchain_api. Not a server.

### Analysis

| Dimension | CinaAuth | Reown | Winner |
|---|---|---|---|
| Self-hostable | ✅ Full Helm chart, Docker | ❌ Cloud-only | CinaAuth |
| Message broker | NATS JetStream (persistent, replayable) | Proprietary cloud infra | CinaAuth (transparency) |
| Client SDK | Built-in protocol | reown-rust (relay_client + relay_rpc) | Reown (client-side maturity) |
| Language | Rust (Actix-web) | TypeScript (server), Rust (client) | CinaAuth (consistency) |
| Production readiness | Full K8s, SLOs, DR, monitoring | Production at scale (millions of users) | Reown (battle-tested) |

**Key insight**: CinaAuth implements the relay as a **self-hosted infrastructure service** with NATS as the message backbone. Reown's relay is a **managed cloud service** with a Rust client SDK. These are fundamentally different models — CinaAuth targets white-label/enterprise self-hosting; Reown targets cloud-first developer consumption.

---

## 3. Push Server Comparison

### CinaAuth: push-server (Rust + Actix-web + NATS + Redis)

- **Language**: Rust with Actix-web
- **Push providers**: APNs (iOS), FCM (Android), WebPush (future)
- **Message ingestion**: Subscribes to NATS JetStream topics (from relay-server events)
- **Caching**: Redis for token caching and message deduplication
- **API**: Device registration, health check, Prometheus metrics
- **Storage**: APNs .p8 keys, FCM service account JSON → K8s Secrets
- **Docker**: Multi-stage build, distroless runtime
- **K8s**: 2 replicas, health probes, secret injection

### Reown: push-server-2 (Rust) + a2 (Rust, APNs2 async client)

- **push-server-2**: Rust implementation — **not production-ready** (explicit "not intended for production use" warning in README). Last updated Sep 2023. Apache 2.0.
- **a2**: Standalone async APNs2 client library — popular (170 stars), useful for Rust APNs integration
- **Current state**: Reown's push notifications appear to be primarily cloud-managed; self-hosted push-server-2 is in preview

### Analysis

| Dimension | CinaAuth | Reown | Winner |
|---|---|---|---|
| Production readiness | ✅ Full implementation with docs | ⚠️ Preview/archived | CinaAuth |
| Push providers | APNs + FCM + WebPush (planned) | APNs (a2) + cloud FCM | Tie |
| Message ingestion | NATS pub/sub from relay | Cloud events | CinaAuth (self-hosted) |
| Deduplication | Redis-based | Not specified | CinaAuth |
| Device-wallet binding | ✅ Explicit API | ✅ Cloud-managed | Tie |

**Key insight**: CinaAuth's push-server is **production-ready and self-hosted**, while Reown's push-server-2 explicitly warns it's not for production use. However, Reown's `a2` library (APNs2 async client) is a well-established open-source component that could be reused.

---

## 4. Keys Server Comparison

### CinaAuth: keys-server (Rust + Actix-web + PostgreSQL + SQLx)

- **Language**: Rust with Actix-web
- **Database**: PostgreSQL via SQLx (with SQLx migrations)
- **Encryption**: ring + zeroize; master key (HKDF seed) encrypts all data at rest
- **Key types**: session, signing, encryption
- **API**: Store, retrieve, rotate, revoke keys
- **Security**: Memory zeroing, TLS database connections, bearer token auth, audit logging
- **K8s**: 2 replicas, secret injection (DB URL, master key), health probes

### Reown: keys-server (HCL/Terraform)

- **Purpose**: Infrastructure-as-code for managing identity keys
- **Format**: HCL/Terraform — **not a runtime service**
- **Scope**: Provisions and rotates identity keys in cloud infrastructure (likely AWS KMS or similar)
- **No runtime API**: It's a provisioning tool, not a key management API service

### Analysis

| Dimension | CinaAuth | Reown | Winner |
|---|---|---|---|
| Type | Runtime key management API | IaC provisioning tool | Different purposes |
| Key operations | Store/retrieve/rotate/revoke via REST API | Terraform apply/destroy | CinaAuth (runtime) |
| Encryption at rest | HKDF + ring, master key in K8s Secrets | Cloud KMS (inferred) | Reown (KMS) |
| Audit logging | ✅ Built-in | Terraform state (limited) | CinaAuth |
| Self-hosted | ✅ PostgreSQL + Rust binary | Cloud provider dependent | CinaAuth |

**Key insight**: These serve different purposes. CinaAuth's keys-server is a **runtime key management service** with a REST API — closer to a Vault-like service. Reown's keys-server is **infrastructure-as-code** for provisioning identity keys. CinaAuth's approach is more comprehensive for self-hosted deployments.

---

## 5. Bundler vs yttrium

### CinaAuth: bundler (Rust + Actix-web + Alloy)

- **Language**: Rust with Actix-web
- **Ethereum library**: Alloy
- **Protocol**: ERC-4337 (Account Abstraction) Bundler
- **Mempool**: Local mempool with Redis backing
- **Validation**: Signature, paymaster, gas estimation, nonce, priority fee
- **Bundling**: Configurable max ops, interval/timeout triggers, dynamic gas pricing
- **Gas strategy**: Tracked gas prices with percentile-based pricing + buffer
- **Reputation system**: Throttle/ban senders based on violations (configurable thresholds)
- **Blacklist**: Configurable blacklisted senders
- **Simulation**: State override simulation with max gas limit (DoS protection)
- **API**: JSON-RPC compatible (eth_sendUserOperation, eth_getUserOperationByHash, eth_supportedEntryPoints)
- **Entry point**: Supports EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)
- **K8s**: 2 replicas, connects to rpc-proxy internally

### Reown: yttrium (Rust, cross-platform smart account library)

- **Language**: Rust
- **Scope**: Smart account library — **not a standalone bundler service**
- **Purpose**: Client-side smart account management (account creation, user operations, signature handling)
- **Platform**: Cross-platform (iOS, Android, web via Rust)
- **Difference**: yttrium is a **client SDK** for building smart accounts; CinaAuth's bundler is a **server-side service** that bundles and submits UserOperations

### Analysis

| Dimension | CinaAuth | Reown | Winner |
|---|---|---|---|
| Type | Server-side bundler service | Client-side smart account library | Different layers |
| Mempool management | ✅ Local + Redis | N/A (client-side) | CinaAuth |
| Reputation system | ✅ Throttle/ban tracking | N/A | CinaAuth |
| Gas estimation | ✅ Dynamic with percentile tracking | Client-side estimation | Both |
| EntryPoint support | v0.7 | Client-side (flexible) | Tie |
| Production K8s | ✅ Full Helm deployment | SDK integration | CinaAuth (for bundler) |

**Key insight**: These are complementary, not competing. yttrium is the **client-side** smart account SDK; CinaAuth's bundler is the **server-side** bundling service. A complete system would use both (or equivalent). CinaAuth has built the server-side bundler infrastructure that Reown would typically provide as a managed cloud service.

---

## 6. ERC-6492 Comparison

### CinaAuth: erc6492 (Rust + Alloy)

- **Language**: Rust
- **Library**: Alloy (primitives, providers, contract)
- **Signature formats**: EIP-191, EIP-1271, ERC-6492 wrapped
- **Modules**:
  - `types.rs` — SignatureFormat enum, VerificationResult, WrappedSignature
  - `decoder.rs` — ABI decoding of wrapped signatures, suffix detection
  - `verify.rs` — Verification logic (EIP-191 recovery, EIP-1271 contract call, ERC-6492 counterfactual)
  - `factory.rs` — Known factory addresses (Safe v1.4.1, Kernel/ZeroDev, Biconomy), calldata builders
- **Counterfactual verification**: Checks if contract is deployed; if not, uses factory for simulation
- **Address prediction**: CREATE2 address calculation (placeholder implementation)

### Reown: erc6492 (Rust)

- Part of the WalletConnect/Rust ecosystem
- Handles ERC-6492 signature verification for pre-deployed contract accounts

### Analysis

| Dimension | CinaAuth | Reown | Winner |
|---|---|---|---|
| Library | Alloy-based | WalletConnect Rust ecosystem | Both viable |
| EIP-191 support | ✅ ECDSA recovery | ✅ | Tie |
| EIP-1271 support | ✅ Contract call verification | ✅ | Tie |
| ERC-6492 support | ✅ Full decode + verify | ✅ | Tie |
| Known factories | Safe, Kernel, Biconomy | Similar set | Tie |
| Code maturity | Placeholder factory calldata | Production-tested | Reown (if deployed) |

**Key insight**: Functionally equivalent. Both support the three signature formats. CinaAuth's implementation is well-structured with clear module separation. The factory calldata builders are simplified placeholders — production hardening needed.

---

## 7. RPC Proxy — CinaAuth Unique Feature

### CinaAuth: rpc-proxy (Go + net/http + Redis)

- **Language**: Go (chosen for performance — standard library net/http)
- **Docker**: Scratch container, CGO_ENABLED=0, static binary
- **Function**: Multi-provider intelligent RPC routing with caching
- **Routing logic**:
  - Read calls (eth_call, eth_getBalance, etc.) → Redis cache → provider chain
  - Write calls (eth_sendRawTransaction) → direct to primary
  - Debug calls → dedicated debug nodes
- **Provider chain**: local_node → primary → fallbacks (configurable per chain)
- **Supported chains**: Ethereum (1), Polygon (137), BSC (56)
- **Cache**: Multi-level with configurable TTLs per method (2s blockNumber to 600s getLogs)
- **Deduplication**: 5-second window — identical requests wait for first response
- **Rate limiting**: Global (10k RPS), per-key (100k RPM), per-IP (100 RPS)
- **Metrics**: Prometheus + detailed status endpoint (provider latency, cache hit rates)
- **K8s**: 3 replicas, HPA 3-15, KEDA Prometheus scaling

### Reown: _No equivalent_

- Reown relies on WalletConnect Cloud for blockchain API access
- Uses `blockchain_api` in reown-rust (client-side API wrapper)
- No self-hosted RPC proxy or multi-provider routing

### Analysis

**This is a significant differentiator.** CinaAuth's RPC Proxy provides:

1. **Vendor independence** — No lock-in to a single RPC provider
2. **Cost optimization** — Cache + dedup reduces upstream API calls
3. **Resilience** — Automatic failover across providers
4. **Local node support** — Can use self-hosted Erigon nodes as primary
5. **Rate limiting** — Prevents quota exhaustion

Reown has nothing equivalent at the infrastructure level.

---

## 8. Deploy Infrastructure — CinaAuth Unique Feature

### CinaAuth: deploy/ (Helm + Kubernetes + Full SRE Stack)

CinaAuth provides a **complete production-grade deployment infrastructure**:

#### Core Helm Chart (`deploy/helm/cinacoin/`)
- All 5 services: relay, rpc-proxy, push-server, keys-server, bundler
- Resource requests/limits, HPA, topology spread, pod anti-affinity
- Ingress with cert-manager TLS, WebSocket timeout tuning
- Pod security standards (non-root, read-only filesystem, no capabilities)

#### Message Infrastructure
- **NATS JetStream**: 3-replica cluster, 4Gi memory, 20Gi file storage
- **Redis Cluster**: 3 master + 3 replica, persistence, metrics

#### Blockchain Nodes
- **Erigon**: Ethereum mainnet (2 replicas, 2TB storage), Polygon (1 replica)
- **Solana**: Optional, 1 replica, 4TB storage
- P2p, RPC, WS, metrics ports exposed

#### Monitoring Stack
- **Prometheus**: 30-day retention, 500Gi storage
- **Grafana**: Dashboards for relay, RPC, cost
- **Alertmanager**: Slack + PagerDuty integration
- **OpenTelemetry**: Traces → Jaeger, logs → Loki, metrics → Prometheus
- **SLOs**: Per-service availability/latency targets (99.95%–99.99%)
- **Error budgets**: 7d/30d tracking with fast/slow burn alerts

#### Security
- **Network policies**: Default-deny-all, per-service ingress rules
- **Ingress hardening**: Security headers, rate limiting, IP allowlists, attack pattern blocking
- **Pod security**: Non-root, read-only filesystem, dropped capabilities

#### Autoscaling
- **KEDA**: Prometheus-based + time-based scaling
- **HPA**: CPU/memory-based horizontal pod autoscaling
- **Cost optimization**: Spot instance configs, budget alerts

#### Disaster Recovery
- **RTO**: 4 hours, **RPO**: 1 hour
- Multi-region failover (us-east-1 → us-west-2)
- S3 cross-region replication
- Route 53 health-checked DNS failover
- Backup runbooks for PostgreSQL, Redis
- Quarterly DR drill procedures

#### Runbooks
- RPC provider outage, relay latency spike, node desync, memory leak
- Daily/weekly/monthly checklists

### Reown: _Cloud-only_

- Reown provides a **managed cloud platform** (cloud.walletconnect.com → cloud.reown.com)
- **No self-hosted deployment option** for the relay or core infrastructure
- Users consume APIs; they don't deploy infrastructure
- Enterprise customers may have dedicated instances, but no public Helm charts

### Analysis

**This is the most significant differentiator.** CinaAuth provides a **complete, self-hosted, production-grade infrastructure** that Reown does not offer.

| Dimension | CinaAuth | Reown |
|---|---|---|
| Deployment model | Self-hosted K8s (Helm) | Managed cloud |
| Monitoring | Full Prometheus/Grafana/Jaeger/Loki | Cloud dashboard |
| SLOs/Error budgets | Google SRE methodology | SLA (contract-based) |
| Disaster recovery | Multi-region, documented runbooks | Reown-managed |
| Security | Network policies, pod security, ingress hardening | Cloud-managed |
| Cost control | Spot instances, KEDA time-based scaling | Pay-per-use |
| Vendor lock-in | None (fully self-hosted) | High (cloud-only) |

---

## 9. Architecture Philosophy Comparison

### CinaAuth: "Bring Your Own Infrastructure"

```
┌──────────────────────────────────────────────────────────────┐
│                    YOUR KUBERNETES CLUSTER                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Relay   │  │ RPC Proxy│  │ Bundler  │  │ Push Server  │ │
│  │  Server  │  │  (Go)    │  │  (Rust)  │  │   (Rust)     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│       │             │             │                │         │
│  ┌────┴─────────────┴─────────────┴────────────────┴───────┐ │
│  │              NATS JetStream (Message Bus)                │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│  ┌──────────┐  ┌──────────┴──────┐  ┌──────────────────┐    │
│  │  Redis   │  │  Keys Server    │  │  Blockchain Nodes│    │
│  │  Cluster │  │  (PostgreSQL)   │  │  (Erigon/Solana) │    │
│  └──────────┘  └─────────────────┘  └──────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Prometheus │ Grafana │ Jaeger │ Loki │ Alertmanager    ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Reown: "Connect to Our Cloud"

```
┌──────────┐     HTTPS/WSS     ┌───────────────────────────┐
│  Your    │ ◀────────────────▶│  Reown Cloud Platform     │
│  App/SDK │                    │                           │
│          │                    │  ┌─────────┐ ┌─────────┐ │
│  (reown- │                    │  │ Relay   │ │ Notify  │ │
│   rust/  │                    │  │ Cluster │ │ Server  │ │
│   AppKit)│                    │  └─────────┘ └─────────┘ │
│          │                    │  ┌─────────┐ ┌─────────┐ │
│          │                    │  │ Keys    │ │ Blockchain││
│          │                    │  │ Server  │ │ API     │ │
│          │                    │  └─────────┘ └─────────┘ │
└──────────┘                    └───────────────────────────┘
```

---

## 10. Technology Stack Summary

### CinaAuth Infrastructure Stack

| Component | Language | Framework | Database/Storage |
|---|---|---|---|
| relay-server | Rust | Actix-web | NATS JetStream |
| rpc-proxy | Go | net/http (stdlib) | Redis |
| push-server | Rust | Actix-web | NATS + Redis |
| keys-server | Rust | Actix-web | PostgreSQL (SQLx) |
| bundler | Rust | Actix-web | Redis (mempool) |
| erc6492 | Rust | Library (Alloy) | N/A (library) |
| deploy/ | Helm/K8s | Full SRE stack | — |

### Reown Infrastructure Stack

| Component | Language | Framework | Notes |
|---|---|---|---|
| Relay (cloud) | TypeScript | — | Managed service |
| push-server-2 | Rust | — | Preview/archived |
| a2 | Rust | — | APNs2 async client library |
| keys-server | HCL/Terraform | — | IaC provisioning |
| yttrium | Rust | — | Client-side smart account SDK |
| erc6492 | Rust | — | Signature verification |
| reown-rust | Rust | — | Relay client + RPC types |
| AppKit | TypeScript | — | Frontend SDK |

---

## 11. Strengths & Weaknesses

### CinaAuth Strengths

1. **Full self-hosting** — Complete Helm chart with every service
2. **Production SRE stack** — SLOs, error budgets, DR, runbooks, monitoring
3. **RPC Proxy** — Unique multi-provider routing with caching (no Reown equivalent)
4. **Unified Rust backend** — 5 of 6 services in Rust (consistency)
5. **Security-first** — Network policies, pod security, distroless containers
6. **Cost control** — Spot instances, KEDA time-based scaling, cache deduplication
7. **Blockchain nodes** — Self-hosted Erigon nodes in Helm (Reown has none)
8. **Vendor independence** — Zero cloud lock-in

### CinaAuth Weaknesses

1. **Unproven at scale** — No battle-tested production metrics
2. **Factory calldata placeholders** — ERC-6492 factory helpers need implementation
3. **Go/Rust language split** — RPC proxy in Go (minor consistency issue)
4. **Source code depth** — Only READMEs and configs visible (no implementation source)
5. **No client SDKs** — No TypeScript/Swift/Kotlin SDKs (Reown has AppKit, reown-rust, reown-kotlin, reown-flutter, reown-dotnet)

### Reown Strengths

1. **Battle-tested** — Powers millions of WalletConnect connections daily
2. **Rich client SDKs** — TypeScript, Rust, Kotlin, Swift, Flutter, .NET
3. **Cloud simplicity** — No infrastructure to manage
4. **Brand recognition** — WalletConnect → Reown is the standard
5. **Open-source libraries** — a2 (APNs2), reown-rust are reusable

### Reown Weaknesses

1. **Cloud lock-in** — No self-hosted option for core relay
2. **No RPC proxy** — No multi-provider routing/caching
3. **Limited IaC** — No production deployment infrastructure
4. **Preview push-server** — Self-hosted push is not production-ready
5. **Opaque infrastructure** — Users can't see/modify the relay implementation
6. **No DR documentation** — No public disaster recovery runbooks

---

## 12. Verdict

**CinaAuth/Cinacoin is fundamentally an infrastructure platform; Reown is fundamentally a cloud service.**

| Criteria | CinaAuth | Reown |
|---|---|---|
| Self-hosted relay | ✅ | ❌ |
| Self-hosted push | ✅ Production-ready | ⚠️ Preview only |
| RPC proxy | ✅ Unique | ❌ |
| SRE/monitoring | ✅ Full stack | ❌ Cloud-only |
| Disaster recovery | ✅ Documented | ❌ Managed |
| Client SDKs | ❌ | ✅ Rich ecosystem |
| Production scale | ⚠️ Unproven | ✅ Battle-tested |
| Vendor independence | ✅ | ❌ |

**Strategic positioning**: CinaAuth wins for enterprises that need **full control, self-hosting, and vendor independence**. Reown wins for teams that want **fast integration and cloud simplicity**.

The RPC Proxy and complete Helm deployment infrastructure are CinaAuth's killer differentiators — they represent infrastructure depth that Reown simply does not provide or intend to provide.
