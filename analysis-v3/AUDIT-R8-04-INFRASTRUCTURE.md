# AUDIT-R8-04 — Infrastructure & Deployment

**Scope:** Cinacoin Infrastructure (Rust servers, Go RPC proxy, Cloudflare Workers, Docker, CI/CD, Monitoring)  
**Date:** 2026-05-26  
**Auditor:** Sub-agent (automated file-level review)

---

## 1. Rust Server Audit

### 1.1 relay-server (packages/relay-server/)

**Codebase:** ~1,682 lines of Rust across 8 files  
**Stack:** actix-web, actix-web-actors (WebSocket), redis, prometheus

| File | Lines | Notes |
|------|-------|-------|
| main.rs | 142 | Server entry point, graceful shutdown |
| relay.rs | 734 | Core WebSocket relay logic (largest file) |
| config.rs | 144 | Env-var config with defaults |
| health.rs | 193 | /v1/health endpoint, dependency checks |
| metrics.rs | 128 | Prometheus counters/gauges |
| models.rs | 163 | RelayMessage, MessageType, RelayAck/RelayError |
| crypto.rs | 178 | X25519 + ChaCha20-Poly1305 |
| tests/mod.rs | — | Unit tests |

**Quality Assessment:**
- ✅ Well-structured modular code, clear separation of concerns
- ✅ Comprehensive crypto implementation (X25519 DH, ChaCha20-Poly1305, topic derivation)
- ✅ Good error handling with metrics tracking
- ✅ Prometheus metrics for connections, messages, subscriptions, errors
- ✅ Graceful shutdown via signal handling
- ✅ Rate limiting in config
- ✅ TLS config scaffolding (cert/key paths configurable)

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| R-01 | 🔴 CRITICAL | main.rs:~95 | **TLS not implemented** — `tls_enabled()` returns true if paths are set, but `HttpServer` still starts without TLS bindings. The `if config.tls_enabled()` branch runs `server.run().await` identically to the `else` branch. No `openssl::SslAcceptorBuilder` is constructed. |
| R-02 | 🔴 CRITICAL | relay.rs:~300 | **`hash_to_sender` is a stub** — returns `Address::ZERO` always. Reputation system records "success" for all senders, making the reputation system effectively useless for abuse prevention. |
| R-03 | 🟡 HIGH | relay.rs:~630 | **Fire-and-forget `actix::spawn` in handler** — on WebSocket message, `do_subscribe`/`do_unsubscribe`/`do_publish` are spawned asynchronously without awaiting. If these fail, the client has already received an "ack". Loss of consistency between ack and actual Redis state. |
| R-04 | 🟡 HIGH | config.rs:~53 | **`tls_enabled()` doesn't validate file existence** — accepts any non-empty string. Could silently accept invalid paths. |
| R-05 | 🟡 HIGH | relay.rs:~460 | **`relay.rs` file is 734 lines** — violates single-responsibility principle. Should be split into WebSocket handler, pub/sub dispatcher, and subscription manager modules. |
| R-06 | 🟡 MEDIUM | health.rs:~80 | **`check_nats` is a no-op stub** — always returns "healthy" with zero latency. Should actually connect to NATS if configured. |
| R-07 | 🟡 MEDIUM | metrics.rs | **Histogram has no buckets configured** — `Histogram::with_opts(Opts::new(...))` without `HistogramOpts::with_buckets()` uses default Prometheus buckets which may not be suitable for WebSocket message sizes. |
| R-08 | 🟢 LOW | main.rs:~95 | **Duplicate code in TLS branches** — both branches call `server.run().await`. Dead code. |
| R-09 | 🟢 LOW | relay.rs:~350 | **Client timeout is only 60s** — `CLIENT_TIMEOUT = 60s` may disconnect mobile clients on poor connections before they can ping back. |

### 1.2 keys-server (packages/keys-server/)

**Codebase:** ~1,532 lines of Rust across 14 files  
**Stack:** axum, sqlx, redis, jsonwebtoken, prometheus

**Quality Assessment:**
- ✅ Clean axum-based architecture with middleware
- ✅ JWT auth middleware with signature validation, expiry check, and Redis blacklist
- ✅ Database migrations via sqlx
- ✅ Health checks for PostgreSQL and Redis
- ✅ Graceful shutdown (SIGTERM + Ctrl+C)
- ✅ Well-defined API routes for identity/invite/wallet keys

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| K-01 | 🔴 CRITICAL | handlers/identity_keys.rs (all endpoints) | **ALL handlers are stubs** — `register`, `get_key`, `rotate_key`, `revoke_key` all have `State(_state)` (unused state) and return hardcoded/example responses. No actual DB interaction. The `sqlx::query!` calls are commented out as TODOs. |
| K-02 | 🔴 CRITICAL | handlers/invite_keys.rs (all endpoints) | **ALL handlers are stubs** — `create_invite`, `get_invite`, `redeem_invite`, `revoke_invite` return hardcoded responses. No persistence, no validation, no expiry checking. |
| K-03 | 🔴 CRITICAL | handlers/wallet_keys.rs (all endpoints) | **ALL handlers are stubs** — `generate_wallet`, `get_wallet`, `sign_message`, `delete_wallet` return hardcoded `"0x..."` responses. No key generation, no signing, no storage. |
| K-04 | 🔴 CRITICAL | config.rs:~60 | **JWT secret defaults to `"change-me-in-production"`** — if `JWT_SECRET` env var is not set, the server uses a hardcoded default. This is a severe security vulnerability if accidentally deployed to production. |
| K-05 | 🟡 HIGH | config.rs:~46 | **`database_url` defaults to `postgres://keys:keys@localhost:5432/keys`** — default credentials. Same pattern as JWT secret — dangerous if deployed without env config. |
| K-06 | 🟡 HIGH | middleware/auth.rs:~50 | **No issuer (`iss`) or audience (`aud`) validation in JWT middleware** — only validates signature and expiry. Tokens from other services could be accepted if they share the same secret. |
| K-07 | 🟡 HIGH | handlers/wallet_keys.rs:sign_message | **Sign endpoint returns `"0x..."`** — this is the most dangerous stub. If accidentally called in production, it silently "succeeds" without actually signing, potentially causing downstream failures. |
| K-08 | 🟡 MEDIUM | main.rs:~52 | **`CorsLayer::permissive()`** — allows all origins. Should be restricted to known domains in production. |
| K-09 | 🟡 MEDIUM | database.rs:~6 | **`create_pool` creates a connection pool but doesn't set max connections** — `PgPool::connect` uses sqlx defaults. Config has `database_max_connections` but it's never passed. |
| K-10 | 🟢 LOW | handlers/invite_keys.rs:~148 | **`generate_invite_code` uses only first 8 chars of UUID** — ~4 billion possible codes. May have collisions at scale. |

### 1.3 push-server (packages/push-server/)

**Codebase:** ~2,160 lines of Rust across 14 files  
**Stack:** axum, redis (moka cache), reqwest, prometheus

**Quality Assessment:**
- ✅ Well-structured with separate modules for APNs/FCM/delivery/retry
- ✅ Exponential backoff retry policy with configurable parameters
- ✅ Per-device and per-app rate limiting via moka cache
- ✅ Delivery receipts with Redis storage
- ✅ Health checks for Redis, APNs config, and FCM config
- ✅ Graceful shutdown

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| P-01 | 🟡 HIGH | config.rs | **No default for required APNs/FCM vars** — uses `require_env()` which panics on missing env vars. This is correct for production but makes local testing harder. Better to have feature-flagged defaults. |
| P-02 | 🟡 HIGH | handler.rs:push_batch | **Batch push skips rate limiting** — `push_batch` calls `send_once` directly, bypassing the per-device and per-app rate limiters checked in the single-push handler. |
| P-03 | 🟡 HIGH | rate_limiter.rs | **Rate limiter is in-memory only (moka)** — doesn't sync with Redis as the doc comment claims. If multiple push-server instances run, rate limits are not shared. |
| P-04 | 🟡 MEDIUM | handler.rs:register | **Device ID uses only first 16 chars of token** — `format!("device:{}", req.token.chars().take(16).collect::<String>())` could create collisions for tokens that share the same prefix. |
| P-05 | 🟡 MEDIUM | delivery.rs | **`store_receipt` uses fire-and-forget `tokio::spawn`** — if Redis is temporarily unavailable, delivery receipts are silently lost. |
| P-06 | 🟢 LOW | apns.rs | **APNs token caching** — JWT tokens for APNs are cached but no explicit TTL management. APNs tokens expire after 1 hour; need to ensure refresh happens before expiry. |
| P-07 | 🟢 LOW | handler.rs:health | **APNs/FCM health checks only validate config presence, not connectivity** — doesn't actually test if APNs or FCM endpoints are reachable. |

### 1.4 notify-server (packages/notify-server/)

**Codebase:** ~720 lines of Rust across 15 files  
**Stack:** axum, redis, reqwest (for push forwarding)

**Quality Assessment:**
- ⚠️ Very thin codebase — most handlers are 1-2 lines
- ⚠️ No actual business logic in handlers
- ⚠️ Auth middleware is a stub

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| N-01 | 🔴 CRITICAL | handlers/notify.rs | **`unwrap_or(Uuid::nil())` on DB insert** — if DB insert fails, notification gets ID `00000000-0000-0000-0000-000000000000` and returns "sent" status. Silent failure with wrong ID. |
| N-02 | 🔴 CRITICAL | handlers/notify.rs:~18 | **Push forward ignores result** — `let _ = state.push_client.post(...).send().await;` discards all errors. If push-server is down, notifications appear successful but are never delivered. |
| N-03 | 🔴 CRITICAL | middleware/auth.rs | **Auth middleware is a complete stub** — only checks if Authorization header exists, doesn't validate JWT or API key. Any request with any header value passes. |
| N-04 | 🔴 CRITICAL | handlers/subscribe.rs, unsubscribe.rs | **No error handling** — `let _ = state.redis.add_subscription(...)` discards result. Subscription could fail silently. |
| N-05 | 🟡 HIGH | handlers/history.rs | **`unwrap_or_default()` on DB query** — if DB fails, returns empty list silently. No error logged. |
| N-06 | 🟡 HIGH | config.rs | **All config fields are required with no defaults** — `env::var` without `unwrap_or_else` means the server won't start without ALL env vars set. This is fragile. |
| N-07 | 🟡 HIGH | main.rs:~55 | **Hardcoded listen address** — `SocketAddr::from(([0, 0, 0, 0], 8080))` is hardcoded. Config has no `host`/`port` fields. |
| N-08 | 🟡 MEDIUM | metrics.rs (15 lines) | **Metrics module exists but has no actual metrics** — just an empty `metrics_handler` function. No counters, gauges, or histograms defined. |
| N-09 | 🟡 MEDIUM | handlers/health.rs | **Health check doesn't check dependencies** — returns `{"status": "ok"}` without checking DB, Redis, or push-server connectivity. |

### 1.5 bundler (packages/bundler/)

**Codebase:** ~2,753 lines of Rust across 14 files  
**Stack:** alloy-primitives, axum, redis, serde, prometheus

**Quality Assessment:**
- ✅ Most substantial Rust codebase in the project
- ✅ Full ERC-4337 bundler implementation: validation, simulation, mempool, reputation, gas oracle, signing
- ✅ Good error types with `thiserror`
- ✅ YAML config with env-var expansion and fallback
- ✅ Prometheus metrics
- ✅ Reputation system for sender throttling/banning

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| B-01 | 🔴 CRITICAL | bundler.rs:compute_user_op_hash | **Hash computation is non-standard** — EIP-4337 specifies a specific encoding for UserOp hashing. This implementation uses a custom byte concatenation that may not produce the correct hash. Would fail on real chains. |
| B-02 | 🔴 CRITICAL | bundler.rs:hash_to_sender | **`hash_to_sender` returns `Address::ZERO`** — same stub as relay-server. Reputation recording after submit records all operations to `Address::ZERO`, breaking the reputation system. |
| B-03 | 🔴 CRITICAL | bundler.rs:simulate_handle_ops_with_override | **Simulation is a no-op** — only checks gas limits and empty signatures. Does NOT actually call `eth_call` with state override as the comment indicates. This means UserOps are bundled without proper simulation. |
| B-04 | 🟡 HIGH | signer.rs | **Private key handling** — needs review for secure memory handling. Private keys should be zeroed after use. |
| B-05 | 🟡 HIGH | mempool.rs | **Mempool persistence unclear** — if bundler restarts, pending UserOps are lost. Need Redis-backed mempool for durability. |
| B-06 | 🟡 MEDIUM | config.rs:from_env | **`ReputationConfig::default()` is used** — from_env() doesn't populate reputation thresholds from env vars, only the YAML loader does. Inconsistent. |
| B-07 | 🟡 MEDIUM | gas_oracle.rs | **Gas oracle fallback** — needs to handle RPC failures gracefully. If the gas price endpoint fails, bundler should use cached values or fail safe. |
| B-08 | 🟢 LOW | validation.rs | **No explicit EIP-4337 validation rules documented** — validation module should reference specific ERC-4337 spec sections for each check. |

### 1.6 erc6492 (packages/erc6492/)

**Codebase:** ~433 lines of Rust across 5 files  
**Stack:** alloy primitives, serde

**Quality Assessment:**
- ✅ Correct ERC-6492 suffix detection (`0x6492...`)
- ✅ EIP-191 signature recovery using alloy primitives
- ✅ EIP-1271 `isValidSignature` contract call
- ✅ ABI decoder for wrapped signatures with bounds checking

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| E-01 | 🟡 HIGH | factory.rs | **All factory helpers return empty/zero** — `build_safe_factory_calldata`, `build_kernel_factory_calldata`, `predict_address` all return `Bytes::new()` or `Address::ZERO`. Comment says "in production, encode the full..." — these are incomplete. |
| E-02 | 🟡 HIGH | verify.rs:verify_erc6492 | **Pre-deployed contract verification is incomplete** — uses `eth_call` for deployment simulation but doesn't properly handle state override. After `eth_call` succeeds, it falls through to `verify_eip1271` which may fail because the contract isn't actually deployed. |
| E-03 | 🟡 MEDIUM | decoder.rs | **ABI decoding is manual, not using alloy's ABI codec** — prone to edge cases with complex calldata. Should use `alloy::sol_types` for proper decoding. |
| E-04 | 🟢 LOW | Cargo.toml | **Missing `thiserror` and `serde_json` dependencies** — `types.rs` uses `thiserror::Error` derive but Cargo.toml only lists `alloy-primitives` and `k256`. (May be in workspace deps.) |

### 1.7 rpc-proxy (packages/rpc-proxy/)

**Two implementations:**
- **Go** (`cmd/rpc-proxy/`, `internal/`) — production binary
- **TypeScript** (`cloudflare/worker.ts`) — Cloudflare Worker variant

**Go Codebase:** ~800 lines across 9 files (config, proxy, router, ratelimit, dedup, tests)  
**TypeScript Codebase:** ~250 lines in single worker.ts

**Quality Assessment (Go):**
- ✅ Multi-stage Docker build with scratch image
- ✅ Static compilation (CGO_ENABLED=0)
- ✅ Config from YAML with env-var expansion
- ✅ Provider routing with health checks
- ✅ Rate limiting and deduplication
- ✅ Unit tests for all packages

**Quality Assessment (TypeScript/Cloudflare):**
- ✅ Clean single-file worker with routing
- ✅ KV caching for read-only methods
- ✅ Metrics endpoint
- ✅ CORS handling

**Issues:**

| # | Severity | File | Issue |
|---|----------|------|-------|
| G-01 | 🟡 HIGH | Dockerfile (rpc-proxy) | **`USER 1000:1000` on scratch image** — scratch images don't have `/etc/passwd`, so user switching doesn't work as expected. The binary still runs as root effectively. |
| G-02 | 🟡 HIGH | cloudflare/worker.ts | **No API key validation** — the worker doesn't check for API keys or rate limit. Anyone can use the RPC proxy. |
| G-03 | 🟡 HIGH | cloudflare/worker.ts | **Metrics are in-memory and reset on worker restart** — Cloudflare Workers are stateless; the `metrics` object is reset on each cold start. Use Durable Objects or KV for persistent metrics. |
| G-04 | 🟡 MEDIUM | internal/proxy/proxy.go | **Upstream timeout** — need to verify that HTTP client has appropriate timeout configured to prevent hanging connections. |
| G-05 | 🟡 MEDIUM | internal/ratelimit/ratelimit.go | **Rate limiter appears to be in-memory only** — no Redis or distributed rate limiting. Multiple instances would have independent rate limits. |
| G-06 | 🟢 LOW | cloudflare/worker.ts | **Hardcoded chain RPC URLs** — chains are hardcoded in the worker. Should use env vars or KV for dynamic configuration. |

---

## 2. Cloudflare Workers Deployment

### 2.1 Worker Inventory

| Worker | Root wrangler.toml | cloudflare/wrangler.toml | KV | D1 | Routes |
|--------|--------------------|--------------------------|-----|-----|--------|
| rpc-proxy | ✅ | ✅ | `RPC_CACHE` (ID set) | — | `rpc.cinacoin.com` |
| relay-server | ✅ | ✅ | `RELAY_CACHE` (ID set) | — | `relay.cinacoin.com` |
| keys-server | ✅ | ✅ | `KEYS_CACHE` (ID set) | `cinacoin-keys` (ID set) | `keys.cinacoin.com` |
| push-server | ✅ | ✅ | `DEVICE_TOKENS` (ID set) | `cinacoin-push` (placeholder) | `push.cinacoin.com` |
| notify-server | ✅ | ✅ | `SUBSCRIPTION_CACHE` (ID set) | `cinacoin-notifications` (ID set) | `notify.cinacoin.com` |

### 2.2 KV Namespace Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| W-01 | 🔴 CRITICAL | Multiple wrangler.toml | **KV namespace ID collision** — keys-server, push-server, and notify-server all use the **same KV namespace ID** `e4c457a74fdf465dada283af98a4a992` for different purposes (KEYS_CACHE, DEVICE_TOKENS, SUBSCRIPTION_CACHE). This means keys, device tokens, and subscriptions share the same KV namespace, causing key collisions and data corruption. |
| W-02 | 🟡 HIGH | push-server/cloudflare/wrangler.toml | **Placeholder KV ID** — `DEVICE_TOKENS` ID is `"PLACEHOLDER_REPLACE_AFTER_CREATE"`. Worker will fail to deploy until replaced. |
| W-03 | 🟡 HIGH | notify-server/cloudflare/wrangler.toml | **Placeholder KV/D1 IDs** — both `SUBSCRIPTION_CACHE` and `SUBSCRIPTION_DB` have placeholder IDs. |
| W-04 | 🟡 MEDIUM | push-server/cloudflare/wrangler.toml | **Placeholder D1 database** — `PUSH_LOG_DB` has placeholder ID. |

### 2.3 D1 Database Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| W-05 | 🟡 HIGH | keys-server/cloudflare/wrangler.toml vs root wrangler.toml | **D1 binding name mismatch** — root wrangler.toml uses `binding = "KEYS_DB"` while cloudflare/wrangler.toml uses `binding = "DB"`. Worker code referencing `KEYS_DB` will fail with the cloudflare config. |
| W-06 | 🟡 MEDIUM | rpc-proxy/cloudflare/wrangler.toml | **Staging env KV not configured** — staging environment has commented-out KV namespace. Staging worker will fail on cache operations. |
| W-07 | 🟡 MEDIUM | keys-server/cloudflare/wrangler.toml | **Staging env D1 not configured** — staging D1 database ID is empty. |

### 2.4 Durable Objects

| # | Severity | File | Issue |
|---|----------|------|-------|
| W-08 | 🟡 HIGH | relay-server/wrangler.toml | **DO migration uses deprecated `new_sqlite_classes`** — root wrangler.toml uses `new_sqlite_classes`, cloudflare/wrangler.toml uses `new_classes`. Inconsistent migration strategy. |
| W-09 | 🟡 MEDIUM | rpc-proxy/cloudflare/wrangler.toml | **DO bindings commented out** — rate limiting DO is commented out. In-memory rate limiting (see G-05) won't persist across worker instances. |

### 2.5 Routes & Domains

| # | Severity | Issue |
|---|----------|-------|
| W-10 | 🟡 MEDIUM | **Domain inconsistency** — Routes use `cinacoin.com` domain (e.g., `rpc.cinacoin.com`), but the staging env comments reference `cinacoin.com`. Which is the production domain? |
| W-11 | 🟡 MEDIUM | **Custom domain vs route patterns** — root wrangler.toml files use `custom_domain = true` patterns, but cloudflare/ versions use comment-out `zone_name` patterns. Deployment method is unclear. |

---

## 3. Cloudflare Pages Frontend Deployment

### 3.1 Frontend Apps

| App | Location | wrangler.toml | Build Output | Notes |
|-----|----------|---------------|--------------|-------|
| demo | apps/demo/ | ✅ | `out/` | Next.js, Pages-compatible |
| demo-react | apps/demo-react/ | — | `out/` | React variant |
| backend-dashboard | apps/backend-dashboard/ | — | `out/` | Admin dashboard |
| health-status | apps/health-status/ | ✅ | `out/` | Status page |

### 3.2 Issues

| # | Severity | Issue |
|---|----------|-------|
| F-01 | 🟡 MEDIUM | **No Pages deployment config** — `deploy-cloudflare.sh` references `wrangler pages deploy .next` for demo, but the app has `out/` (static export). Should use `out/` not `.next/`. |
| F-02 | 🟡 MEDIUM | **demo-react and backend-dashboard have no wrangler.toml** — cannot be deployed via Wrangler CLI without configuration. |
| F-03 | 🟢 LOW | **No `pages-build-output` directive** — if using Pages CI, need to specify build command and output directory in `wrangler.toml` or `pages.json`. |

---

## 4. Docker Deployment

### 4.1 Root docker-compose.yml

| # | Severity | Issue |
|---|----------|-------|
| D-01 | 🔴 CRITICAL | **Default PostgreSQL credentials** — `POSTGRES_USER=user`, `POSTGRES_PASSWORD=pass`. Hardcoded defaults visible in docker-compose.yml. |
| D-02 | 🟡 HIGH | **Missing services** — docker-compose.yml only includes `demo`, `relay`, `redis`, `rpc-proxy`, `keys-server`, `db`. Missing `push-server`, `notify-server`, `bundler`, `erc6492`. |
| D-03 | 🟡 HIGH | **relay uses upstream image** — `ghcr.io/walletconnect/walletconnect-relay:latest` instead of building the local `relay-server`. Defeats the purpose of self-hosting. |
| D-04 | 🟡 MEDIUM | **Root Dockerfile is a no-op** — the root `Dockerfile` builds SDK packages then runs `node --version` as CMD. Doesn't actually serve anything. |
| D-05 | 🟡 MEDIUM | **`Dockerfile.demo` referenced but doesn't exist** — docker-compose.yml references `dockerfile: Dockerfile.demo` but no such file exists at repo root. |
| D-06 | 🟡 MEDIUM | **No Dockerfiles for push-server and keys-server in deploy/docker/** — the build.yaml workflow references `deploy/docker/push-server/Dockerfile` and `deploy/docker/keys-server/Dockerfile` but these don't exist. Only `relay-server`, `rpc-proxy`, `bundler`, `core-ui` have Dockerfiles. |
| D-07 | 🟡 MEDIUM | **No `.dockerignore` files** — packages lack `.dockerignore`, meaning full source trees (including `node_modules/`, `dist/`, `.wrangler/`) get copied into build context. Slow builds and bloated images. |

### 4.2 Individual Dockerfiles

| Dockerfile | Assessment | Issues |
|------------|------------|--------|
| relay-server | ✅ Good distroless multi-stage | HEALTHCHECK uses `--health-check` flag — needs to be verified binary supports it |
| rpc-proxy | ✅ Good scratch multi-stage | `USER 1000:1000` on scratch (see G-01) |
| bundler | ✅ Good distroless multi-stage | Same HEALTHCHECK concern |
| core-ui | ✅ Nginx static serve | References `nginx.conf` from `deploy/docker/core-ui/` — file should be verified |

### 4.3 Helm Chart (deploy/helm/cinacoin/)

| # | Severity | Issue |
|---|----------|-------|
| H-01 | 🟡 HIGH | **Image registry mismatch** — `values.yaml` uses `ghcr.io/cinacoin` but CI build.yaml pushes to `ghcr.io/onchainux`. Images won't be found. |
| H-02 | 🟡 MEDIUM | **No bundler deployment in Helm templates** — values.yaml defines `bundler:` config but no `templates/bundler/` directory exists. |
| H-03 | 🟡 MEDIUM | **Network policies are comprehensive** — good job on default-deny, allow-relay-ingress, allow-rpc-proxy-ingress, etc. |
| H-04 | 🟡 MEDIUM | **No PDB for push-server/keys-server** — `templates/pdb.yaml` exists but needs to cover all services. |
| H-05 | 🟢 LOW | **Blockchain nodes in Helm** — includes Erigon for Ethereum/Polygon with 2Ti PVCs. This is massive infrastructure; should be documented as optional. |

---

## 5. Monitoring & Alerting

### 5.1 Monitoring Workflows (.github/workflows/monitoring.yml)

| # | Severity | Issue |
|---|----------|-------|
| M-01 | 🟡 HIGH | **Health check endpoints don't exist on all services** — monitoring workflow checks `https://rpc-proxy.cinacoin.com/health` etc., but several services may not have public endpoints or correct health paths. |
| M-02 | 🟡 MEDIUM | **Scripts not found** — `scripts/monitoring-health-check.sh` and `scripts/monitoring-alert.sh` are referenced but may not exist. |
| M-03 | 🟡 MEDIUM | **Weekly report is mostly placeholder** — Cloudflare GraphQL API section has hardcoded values. Not actionable. |
| M-04 | 🟡 MEDIUM | **Prometheus rules directory** — `deploy/monitoring/prometheus/rules/` exists but contents need review. |

### 5.2 /metrics Endpoints

| Service | Endpoint | Status |
|---------|----------|--------|
| relay-server | `/metrics` (actix) | ✅ Implemented |
| keys-server | `/metrics` (axum) | ✅ Implemented |
| push-server | `/metrics` (axum) | ✅ Implemented |
| notify-server | `/v1/metrics` (axum) | ⚠️ Empty — no metrics defined |
| rpc-proxy | `/metrics` (Go/Worker) | ✅ Implemented in both |
| bundler | `/metrics` (axum) | ✅ Implemented |

### 5.3 Health Endpoints

| Service | Endpoint | Quality |
|---------|----------|---------|
| relay-server | `/v1/health` | ✅ Checks Redis, NATS, DB |
| keys-server | `/v1/health` | ✅ Checks DB, Redis |
| push-server | `/v1/health` | ✅ Checks Redis, APNs config, FCM config |
| notify-server | `/v1/health` | ❌ Returns static `{"status": "ok"}`, no dependency checks |
| rpc-proxy (Go) | `/health` | Needs verification |
| rpc-proxy (Worker) | `/health` | ✅ Returns timestamp |
| bundler | `/health` | Needs verification |

---

## 6. CI/CD Pipeline

### 6.1 Workflows Inventory

| Workflow | Purpose | Status |
|----------|---------|--------|
| ci.yml | TypeScript lint/typecheck/build/test | ✅ |
| build.yaml | Rust + Go build, Docker push, security scan | ✅ Comprehensive |
| deploy.yaml | Helm deploy with canary | ✅ Staging → Canary → Production |
| monitoring.yml | Scheduled health checks + weekly reports | ⚠️ Placeholder |
| release.yaml | Release automation | Not reviewed |
| security-scan.yml | Security scanning | Not reviewed |
| e2e.yml | End-to-end tests | Not reviewed |

### 6.2 Issues

| # | Severity | Workflow | Issue |
|---|----------|----------|-------|
| C-01 | 🟡 HIGH | build.yaml | **Workflow references non-existent Dockerfiles** — matrix includes `push-server` and `keys-server` Dockerfiles that don't exist in `deploy/docker/`. |
| C-02 | 🟡 HIGH | build.yaml | **Rust workspace paths inconsistent** — `rust-relay` job uses `working-directory: ./relay-server` but relay-server is at `packages/relay-server/`. Will fail. |
| C-03 | 🟡 MEDIUM | build.yaml | **Go cache path** — `cache-dependency-path: ./rpc-proxy/go.sum` but go module is at `packages/rpc-proxy/`. Cache miss. |
| C-04 | 🟡 MEDIUM | build.yaml | **`cargo audit` always passes** — all `cargo audit` steps use `|| true`, so failures don't block CI. |
| C-05 | 🟡 MEDIUM | ci.yml | **No Rust CI** — `ci.yml` only covers TypeScript. Rust builds, tests, and clippy are in `build.yaml` only, which means PRs without build changes skip Rust checks. |
| C-06 | 🟡 MEDIUM | deploy.yaml | **Canary error rate parsing is fragile** — Python one-liner for Prometheus response parsing will fail on unexpected JSON shapes. |
| C-07 | 🟢 LOW | deploy.yaml | **`sleep 900` for canary observation** — hard-coded 15-minute wait. Should use a polling approach with timeout. |
| C-08 | 🟢 LOW | build.yaml | **Trivy scan only on PR** — vulnerability scanning doesn't run on main branch pushes. |

---

## 7. Summary & Priority Actions

### 🔴 Critical (Must Fix Before Production)

| ID | Issue | Impact |
|----|-------|--------|
| R-01 | TLS not implemented in relay-server despite config | All relay traffic unencrypted |
| R-02, B-02 | `hash_to_sender` stubs return `Address::ZERO` | Reputation systems broken |
| K-01, K-02, K-03 | All keys-server handlers are stubs | No actual key management |
| K-04 | JWT secret defaults to `"change-me-in-production"` | Authentication bypass if deployed without env config |
| N-01, N-02 | notify-server silently swallows errors | Notifications appear sent but aren't |
| N-03 | Auth middleware is a stub | No authentication on notify-server |
| W-01 | KV namespace ID collision across 3 services | Data corruption |
| D-01 | Default PostgreSQL credentials in docker-compose | Database accessible with known credentials |
| B-03 | Bundler simulation is a no-op | Invalid UserOps bundled, funds at risk |

### 🟡 High (Should Fix Soon)

| ID | Issue |
|----|-------|
| K-05 | Default PostgreSQL credentials in config |
| P-02 | Batch push bypasses rate limiting |
| P-03 | Rate limiter not distributed across instances |
| G-02 | RPC proxy Worker has no API key validation |
| D-06 | Missing Dockerfiles for push-server and keys-server |
| H-01 | Helm image registry mismatch with CI |
| C-02 | Rust workspace paths in build.yaml are wrong |

### 🟢 Medium/Low (Improvements)

| ID | Issue |
|----|-------|
| R-05 | relay.rs too large (734 lines) |
| K-08 | CORS permissive in keys-server |
| W-10 | Domain name inconsistency (cinacoin.com vs cinacoin.com) |
| M-01 | Health check endpoints may not exist |
| C-04 | `cargo audit` failures silently ignored |
| Various | Incomplete factory helpers in erc6492 |

---

## 8. Overall Assessment

**Infrastructure maturity:** 4/10 — Significant gaps between scaffolding and production readiness.

**Strengths:**
- Good architectural organization (Helm, Docker, CI/CD workflows exist)
- relay-server and push-server have well-structured Rust code
- Monitoring framework with Prometheus/Grafana/Alertmanager is comprehensive
- Helm chart includes network policies, PDBs, and autoscaling

**Critical gaps:**
- **keys-server is entirely non-functional** — all endpoints are stubs returning hardcoded data
- **notify-server has no auth, no error handling, no dependency checks**
- **bundler simulation is a no-op** — dangerous for a financial system handling real funds
- **reputation systems are broken** due to `hash_to_sender` stubs in relay-server and bundler
- **TLS is not implemented** in relay-server
- **KV namespace collision** will cause data corruption in Cloudflare Workers
- **CI pipeline has path errors** that would cause builds to fail
- **docker-compose is incomplete** — missing services, references non-existent Dockerfiles

**Recommendation:** Do not deploy to production until all 🔴 critical issues are resolved. The project has good architectural scaffolding but the actual business logic is incomplete in several critical services.
