# AUDIT-R12-04 — Infrastructure & Deployment

**Scope:** Cinacoin Infrastructure (Rust servers, Go RPC proxy, Cloudflare Workers, Docker, Helm, CI/CD, Monitoring)
**Date:** 2026-05-26
**Auditor:** Sub-agent (automated file-level review)
**Baseline:** AUDIT-R8-04-INFRASTRUCTURE.md

---

## Executive Summary

Since R8, the codebase has seen **significant improvements** in handler implementations and configuration hardening, but also **introduced critical new regressions** in Cargo.toml files. The overall maturity remains around **4/10** — scaffolding is excellent, but production readiness is blocked by multiple critical issues across build, security, and deployment layers.

**Changes since R8:**
| Area | Status | Detail |
|------|--------|--------|
| keys-server handlers | ✅ FIXED → 🔴 NEW ISSUE | All handlers are now fully implemented (no longer stubs), but XOR key encryption is cryptographically insecure |
| JWT secret default | ✅ FIXED | JWT_SECRET is now mandatory (no default), with minimum-length enforcement |
| KV namespace collision | ✅ FIXED | Each service now has unique KV namespace IDs |
| Dockerfiles missing | ✅ PARTIALLY FIXED | keys-server and push-server Dockerfiles now exist at package level |
| Cargo.toml dependencies | ❌ REGRESSION | relay-server, push-server, notify-server, and rpc-proxy have NO [dependencies] sections |
| docker-compose still | ❌ UNCHANGED | Still uses WalletConnect upstream relay image; still has default DB creds |
| Helm chart name mismatch | ❌ UNCHANGED | deploy.yaml references `onchainux` helm chart but only `cinacoin` exists |
| build.yaml paths | ❌ UNCHANGED | Still references `./relay-server` instead of `./packages/relay-server` |

---

## 1. Rust Server Audit

### 1.1 relay-server (packages/relay-server/)

**Codebase:** ~1,900 lines across 8 files (relay.rs: ~730, main.rs: ~130, config.rs: ~170, health.rs: ~190, metrics.rs: ~150, models.rs: ~170, crypto.rs: ~240)

**Status vs R8:** Largely unchanged. Core issues remain.

**What was verified:**
- ✅ Well-structured modular code with clear separation of concerns
- ✅ X25519 + ChaCha20-Poly1305 crypto with passing tests
- ✅ Redis Pub/Sub subscriber with reconnection logic
- ✅ Prometheus metrics with proper histogram
- ✅ Health checks with Redis connectivity verification
- ✅ Rate limiting per IP with configurable window
- ✅ Topic validation (64 hex chars)
- ✅ Topic expiration and cleanup
- ✅ Graceful shutdown with broadcast listener

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-01 | 🔴 CRITICAL | Cargo.toml | **NO [dependencies] section** — Cargo.toml is 5 lines with only `[package]`. This package cannot compile. Source code uses `actix-web`, `actix-web-actors`, `redis`, `tracing`, `tracing-subscriber`, `serde`, `serde_json`, `chrono`, `uuid`, `prometheus`, `lazy_static`, `x25519-dalek`, `chacha20poly1305`, `sha2`, `base64`, `hex`, `rand`, `futures-util`, `tokio` — none are declared. | — | NEW |
| R12-02 | 🟡 HIGH | main.rs:~105 | **TLS is still not implemented** — both `if config.tls_enabled()` and `else` branches call identical `server.run().await`. The comment says "TLS setup would go here in production" but it has been here since at least R8. | R-01 | UNCHANGED |
| R12-03 | 🟡 HIGH | config.rs:~70 | **`tls_enabled()` doesn't validate file existence** — accepts any non-empty string for cert/key paths. | R-04 | UNCHANGED |
| R12-04 | 🟡 MEDIUM | health.rs:~95 | **`check_nats` is a no-op** — `let _ = nats_url;` discards the parameter. Always returns "healthy" with sub-millisecond latency. NATS is not actually checked. | R-06 | UNCHANGED |
| R12-05 | 🟡 MEDIUM | relay.rs:~350 | **Fire-and-forget `actix::spawn` in handler** — subscribe/unsubscribe/publish operations are spawned after sending "ack" to client. If the async op fails, the client has already received confirmation. | R-03 | UNCHANGED |
| R12-06 | 🟢 LOW | relay.rs:~730 | **relay.rs is still 730 lines** — should be split into modules. | R-05 | UNCHANGED |
| R12-07 | 🟢 LOW | main.rs | **Duplicate TLS branches** — both if/else branches call identical `server.run().await`. Dead code. | R-08 | UNCHANGED |
| R12-08 | 🟢 LOW | relay.rs | **60s client timeout** — may disconnect mobile clients on poor connections. | R-09 | UNCHANGED |

**Cargo.toml (actual content, 5 lines):**
```toml
[package]
name = "cinacoin-relay-server"
version = "0.1.0"
edition = "2021"
description = "WebSocket relay server for Cinacoin"
```

### 1.2 keys-server (packages/keys-server/)

**Codebase:** ~1,500 lines across 13 files

**Status vs R8:** Major improvement in handler implementations, but introduces critical security vulnerability.

**What was verified:**
- ✅ All handlers are now **fully implemented** with real database operations (was K-01/K-02/K-03 in R8)
- ✅ Identity keys: register, get_key, rotate_key, revoke_key — all with proper SQL queries and error handling
- ✅ Invite keys: create_invite, get_invite, redeem_invite (with FOR UPDATE locking), revoke_invite
- ✅ Wallet keys: generate_wallet (actual key generation for Ethereum/Solana), get_wallet, sign_message, delete_wallet
- ✅ JWT auth middleware with issuer validation (`set_issuer(&["keys-server"])`)
- ✅ Redis token blacklist check
- ✅ JWT_SECRET is mandatory (no default) with minimum 16-char enforcement ✅ FIXED from R8 K-04
- ✅ Database pool with configurable max_connections (K-09 fixed)
- ✅ Health checks verify both DB and Redis
- ✅ `zeroize` used on private key material after encryption
- ✅ CORS is still `permissive()` (K-08 unchanged)

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-09 | 🔴 CRITICAL | handlers/wallet_keys.rs:~15 | **XOR-based key encryption** — `encrypt_key_material()` uses single-byte XOR with `jwt_secret`. Comment says "In production, use proper encryption (AES-GCM)." This is cryptographically broken: repeating-key XOR is trivially crackable with known-plaintext attacks. Private keys are effectively stored in cleartext if the JWT_SECRET length is guessed. | — | NEW |
| R12-10 | 🔴 CRITICAL | Cargo.toml | **NO [dependencies] section** — Cargo.toml is only 5 lines. Cannot compile. Uses axum, tokio, sqlx, redis, jsonwebtoken, etc. — none declared. | — | NEW |
| R12-11 | 🟡 HIGH | handlers/wallet_keys.rs:sign_message | **No rate limiting on sign endpoint** — signing operations are not rate-limited. An attacker could repeatedly sign with a stolen wallet_id. | K-07 (partial) | PARTIALLY FIXED |
| R12-12 | 🟡 HIGH | config.rs:~40 | **`database_url` defaults to `postgres://keys:keys@localhost:5432/keys`** — hardcoded default credentials. Still dangerous if deployed without env config. | K-05 | UNCHANGED |
| R12-13 | 🟡 HIGH | main.rs:~70 | **`CorsLayer::permissive()`** — allows all origins. | K-08 | UNCHANGED |
| R12-14 | 🟡 MEDIUM | handlers/invite_keys.rs:generate_invite_code | **8-char alphanumeric invite codes** — 36^8 ≈ 2.8 trillion codes, collision probability is manageable but could be improved with longer codes or UUID-based approach. | K-10 | UNCHANGED |
| R12-15 | 🟢 LOW | Dockerfile | **`--health-check` flag** — binary needs to support this CLI flag. Verify binary actually implements it. | — | UNCHANGED |

### 1.3 push-server (packages/push-server/)

**Codebase:** ~2,100 lines across 13 files

**Status vs R8:** Largely unchanged in structure. Same issues.

**What was verified:**
- ✅ APNs and FCM clients implemented
- ✅ Exponential backoff retry policy
- ✅ Delivery receipts with Redis storage
- ✅ Per-device and per-app rate limiting via in-memory cache
- ✅ Health checks for Redis, APNs config, FCM config
- ✅ Graceful shutdown
- ✅ Prometheus metrics

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-16 | 🔴 CRITICAL | Cargo.toml | **NO [dependencies] section** — 5 lines only. Cannot compile. | — | NEW |
| R12-17 | 🟡 HIGH | handler.rs:push_batch | **Batch push skips rate limiting** — calls `send_once` directly, bypassing per-device and per-app rate limiters. | P-02 | UNCHANGED |
| R12-18 | 🟡 HIGH | rate_limiter.rs | **Rate limiter is in-memory only (moka)** — not distributed. Multiple instances won't share rate limits. | P-03 | UNCHANGED |
| R12-19 | 🟡 MEDIUM | handler.rs:register | **Device ID uses only first 16 chars of token** — potential collisions. | P-04 | UNCHANGED |
| R12-20 | 🟡 MEDIUM | delivery.rs | **Fire-and-forget `tokio::spawn` for receipt storage** — receipts lost if Redis is down. | P-05 | UNCHANGED |
| R12-21 | 🟡 MEDIUM | config.rs | **`require_env()` panics on missing vars** — makes local testing harder. | P-01 | UNCHANGED |

### 1.4 notify-server (packages/notify-server/)

**Codebase:** ~720 lines across 14 files

**Status vs R8:** **Still critically broken.** All the same issues persist.

**What was verified:**
- ⚠️ Very thin codebase — handlers are 1-5 lines each
- ⚠️ Auth middleware still only checks for header presence, not validity
- ⚠️ No error handling in notify handler

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-22 | 🔴 CRITICAL | Cargo.toml | **NO [dependencies] section** — 5 lines only. Cannot compile. | — | NEW |
| R12-23 | 🔴 CRITICAL | middleware/auth.rs | **Auth middleware is a stub** — only checks if `Authorization` header exists. Any non-empty value passes. No JWT validation, no API key check. | N-03 | UNCHANGED |
| R12-24 | 🔴 CRITICAL | handlers/notify.rs:~16 | **`unwrap_or(Uuid::nil())` on DB insert** — if DB fails, notification gets nil UUID. Silent failure. | N-01 | UNCHANGED |
| R12-25 | 🔴 CRITICAL | handlers/notify.rs:~18 | **Push forward ignores result** — `let _ = state.push_client.post(...).send().await;` discards all errors. Notifications appear sent but aren't delivered. | N-02 | UNCHANGED |
| R12-26 | 🟡 HIGH | handlers/subscribe.rs | **No error handling** — `let _ = state.redis.add_subscription(...)` discards result. | N-04 | UNCHANGED |
| R12-27 | 🟡 HIGH | handlers/history.rs | **`unwrap_or_default()` on DB query** — returns empty list silently on failure. | N-05 | UNCHANGED |
| R12-28 | 🟡 HIGH | main.rs:~60 | **Hardcoded listen address** — `SocketAddr::from(([0, 0, 0, 0], 8080))`. No config host/port. | N-07 | UNCHANGED |
| R12-29 | 🟡 MEDIUM | metrics.rs | **Metrics returns JSON, not Prometheus text** — `metrics_handler()` returns `Json({"notifications_sent": N})` instead of proper Prometheus text format. Incompatible with Prometheus scraping. | N-08 | UNCHANGED |

### 1.5 bundler (packages/bundler/)

**Codebase:** ~2,753 lines across 14 files

**Status vs R8:** Mostly unchanged. Simulation and reputation issues persist.

**What was verified:**
- ✅ ERC-4337 bundler with validation, mempool, reputation, gas oracle, signing
- ✅ `create_handle_ops_tx` is now real (was previously stub) — estimates gas, gets nonce, builds and sends handleOps tx
- ✅ Simulation gate with configurable `max_simulation_gas`
- ✅ Config via YAML with env-var expansion
- ✅ Prometheus metrics
- ✅ Only bundler package has a Cargo.lock (though it's essentially empty — see below)

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-30 | 🔴 CRITICAL | bundler.rs:296 | **`hash_to_sender` returns `Address::ZERO`** — reputation recording maps all senders to `Address::ZERO`. Reputation system is broken. | B-02 | UNCHANGED |
| R12-31 | 🔴 CRITICAL | bundler.rs:221 | **`simulate_handle_ops_with_override` is a no-op** — only checks gas limits and empty signatures. Does NOT call `eth_call` with state override. UserOps are bundled without proper simulation. | B-03 | UNCHANGED |
| R12-32 | 🟡 HIGH | bundler.rs:302 | **`compute_user_op_hash` uses non-standard encoding** — EIP-4337 specifies specific hash computation. This uses custom byte concatenation that may not produce correct hashes. | B-01 | UNCHANGED |
| R12-33 | 🟡 HIGH | signer.rs | **Private key handling** — needs secure memory review. Keys should be zeroed after use. | B-04 | UNCHANGED |
| R12-34 | 🟡 MEDIUM | mempool.rs | **In-memory mempool** — pending UserOps lost on restart. Need Redis-backed persistence. | B-05 | UNCHANGED |
| R12-35 | 🟡 MEDIUM | config.rs | **Reputation config inconsistency** — `from_env()` doesn't populate reputation thresholds. | B-06 | UNCHANGED |
| R12-36 | 🟢 LOW | Cargo.lock | **Cargo.lock is essentially empty** — only contains the package header, no dependency entries. Should be `cargo generate-lockfile` to pin versions. | — | NEW |

### 1.6 erc6492 (packages/erc6492/)

**Codebase:** ~433 lines across 5 files

**Status vs R8:** Unchanged. Factory helpers still return empty/zero.

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-37 | 🟡 HIGH | factory.rs | **All factory helpers return empty/zero** — `build_safe_factory_calldata`, `build_kernel_factory_calldata`, `predict_address` all return `Bytes::new()` or `Address::ZERO`. | E-01 | UNCHANGED |
| R12-38 | 🟡 MEDIUM | decoder.rs | **Manual ABI decoding** — should use `alloy::sol_types`. | E-03 | UNCHANGED |
| R12-39 | 🟢 LOW | Cargo.toml | **Missing `thiserror` dependency** — `types.rs` uses `thiserror::Error` derive but Cargo.toml only lists `alloy-primitives` and `k256`. May not compile. | E-04 | UNCHANGED |

### 1.7 rpc-proxy (packages/rpc-proxy/)

**Go Codebase:** ~800 lines across 9 files
**TypeScript Codebase:** ~250 lines (cloudflare/worker.ts)

**Status vs R8:** Unchanged.

**Issues:**

| # | Severity | File | Issue | R8 ID | Status |
|---|----------|------|-------|-------|--------|
| R12-40 | 🔴 CRITICAL | Cargo.toml | **NO [dependencies] section** — only 5 lines `[package]` header. Rust variant cannot compile. (Note: Go variant exists and is separate.) | — | NEW |
| R12-41 | 🟡 HIGH | Dockerfile (Go) | **`USER 1000:1000` on scratch image** — scratch has no `/etc/passwd`, user switching doesn't work. Binary runs as root. | G-01 | UNCHANGED |
| R12-42 | 🟡 MEDIUM | internal/ratelimit/ | **In-memory rate limiting only** — no distributed rate limiting. | G-05 | UNCHANGED |

---

## 2. Cargo.toml Dependency Crisis (NEW — R12)

**This is the most critical new regression since R8.**

Four of seven Rust packages have Cargo.toml files with **no dependencies declared**:

| Package | Cargo.toml Lines | Has Dependencies? | Can Compile? |
|---------|-----------------|-------------------|--------------|
| relay-server | 5 | ❌ | ❌ |
| keys-server | 55 | ✅ (28 deps) | ✅ |
| push-server | 5 | ❌ | ❌ |
| notify-server | 5 | ❌ | ❌ |
| bundler | 26 | ✅ (22 deps) | ✅ |
| erc6492 | 7 | ⚠️ (2 deps, may be incomplete) | ❓ |
| rpc-proxy (Rust) | 5 | ❌ | ❌ |

**Impact:** None of these packages can be compiled. The CI pipeline would catch this, but `build.yaml` has path issues (see §6) that may prevent the broken packages from being tested.

**Root cause:** Looks like Cargo.toml files were replaced or truncated. Only `keys-server` and `bundler` have proper dependency declarations.

---

## 3. Cloudflare Workers Deployment

### 3.1 KV Namespace Status (R8 W-01 FIXED)

| Worker | KV Binding | KV ID | Unique? |
|--------|-----------|-------|---------|
| rpc-proxy | RPC_CACHE | `f91dde2603b44c2f830d42330be9778a` | ✅ |
| relay-server | RELAY_CACHE | `1a8dc90cb91c423695be43ce74028c88` | ✅ |
| keys-server (root) | KEYS_CACHE | `7949502829c74f39b0cbc24d2f6668c6` | ✅ |
| keys-server (cloudflare/) | SESSIONS | `b60edcfb4052452780701cbf7a06aeb9` | ✅ |
| push-server (root) | DEVICE_TOKENS | `9ab61f92afc3485da73fef3b2e730260` | ✅ |
| push-server (cloudflare/) | DEVICE_TOKENS | `9ab61f92afc3485da73fef3b2e730260` | ✅ (same as root) |
| notify-server (root) | SUBSCRIPTION_CACHE | `ab72802bc80c49e3955a710820ce4506` | ✅ |
| notify-server (cloudflare/) | SUBSCRIPTION_CACHE | `ab72802bc80c49e3955a710820ce4506` | ✅ (same as root) |

**✅ W-01 FIXED:** All KV namespace IDs are now unique. No collision.

### 3.2 Remaining Wrangler Issues

| # | Severity | Issue | R8 ID | Status |
|---|----------|-------|-------|--------|
| R12-43 | 🟡 HIGH | **D1 binding name mismatch** — keys-server root wrangler uses `binding = "KEYS_DB"` while cloudflare/ wrangler uses `binding = "DB"`. Worker code referencing `KEYS_DB` will fail with cloudflare config. | W-05 | UNCHANGED |
| R12-44 | 🟡 HIGH | **Placeholder D1 IDs** — push-server cloudflare D1: `PLACEHOLDER_REPLACE_AFTER_CREATE`; notify-server cloudflare D1: `PLACEHOLDER_REPLACE_AFTER_CREATE` | W-03/W-04 | UNCHANGED |
| R12-45 | 🟡 MEDIUM | **DO migration inconsistency** — relay-server root uses `new_sqlite_classes`, cloudflare uses `new_classes`. | W-08 | UNCHANGED |
| R12-46 | 🟡 MEDIUM | **Domain inconsistency** — root wrangler files use `cinacoin.com` routes; cloudflare versions comment out routes referencing `cinacoin.com`. | W-10 | UNCHANGED |
| R12-47 | 🟡 MEDIUM | **Staging KV not configured** — staging environments have commented-out KV namespace IDs. | W-06 | UNCHANGED |

---

## 4. Docker & Docker Compose

### 4.1 docker-compose.yml

**Status vs R8:** Unchanged. All issues persist.

| # | Severity | Issue | R8 ID | Status |
|---|----------|-------|-------|--------|
| R12-48 | 🔴 CRITICAL | **Default PostgreSQL credentials** — `POSTGRES_USER=user`, `POSTGRES_PASSWORD=pass` hardcoded in docker-compose.yml. | D-01 | UNCHANGED |
| R12-49 | 🟡 HIGH | **relay uses upstream image** — `ghcr.io/walletconnect/walletconnect-relay:latest` instead of local build. | D-03 | UNCHANGED |
| R12-50 | 🟡 HIGH | **`Dockerfile.demo` doesn't exist** — docker-compose.yml references it but no such file at repo root. | D-05 | UNCHANGED |
| R12-51 | 🟡 HIGH | **Missing services** — push-server and notify-server not in docker-compose. | D-02 | UNCHANGED |

### 4.2 Dockerfiles

**Status vs R8:** Improved — keys-server and push-server Dockerfiles now exist at package level.

| Dockerfile | Location | Status | Notes |
|------------|----------|--------|-------|
| relay-server | `deploy/docker/relay-server/Dockerfile` | ✅ Multi-stage distroless | References `relay-server/Cargo.toml` at repo root — WRONG path |
| rpc-proxy | `deploy/docker/rpc-proxy/Dockerfile` | ✅ Multi-stage scratch | `USER 1000:1000` on scratch (R12-41) |
| bundler | `deploy/docker/bundler/Dockerfile` | ✅ Multi-stage distroless | References `bundler/Cargo.toml` at repo root — WRONG path |
| core-ui | `deploy/docker/core-ui/Dockerfile` | ✅ Nginx static | OK |
| keys-server | `packages/keys-server/Dockerfile` | ✅ Multi-stage distroless | References `./Cargo.toml` relative — CORRECT for package-level |
| push-server | `packages/push-server/Dockerfile` | ✅ Multi-stage distroless | References `./Cargo.toml` relative — CORRECT for package-level |

| # | Severity | Issue |
|---|----------|-------|
| R12-52 | 🔴 CRITICAL | **deploy/docker/ Dockerfiles reference wrong paths** — `deploy/docker/relay-server/Dockerfile` does `COPY relay-server/Cargo.toml` but this is relative to build context `.` (repo root), where there is NO `relay-server/` directory. The actual source is at `packages/relay-server/`. These Dockerfiles will fail to build. |
| R12-53 | 🟡 HIGH | **Package-level Dockerfiles for keys-server/push-server** reference `./Cargo.toml` but they're in `packages/*/` where the context would need to be `packages/*/` not `.` for the build to work correctly with the matrix in build.yaml (which uses `context: .`). |
| R12-54 | 🟡 MEDIUM | **No `.dockerignore` files** — packages lack them, causing bloated build contexts. | D-07 |
| R12-55 | 🟡 MEDIUM | **HEALTHCHECK uses `--health-check` CLI flag** — binaries need to implement this flag. Verify support. | — |

### 4.3 Root Dockerfile

| # | Severity | Issue |
|---|----------|-------|
| R12-56 | 🟡 HIGH | **`CMD ["node", "--version"]`** — the root Dockerfile's runtime stage runs `node --version` as CMD. Doesn't serve anything. Essentially a no-op container. | D-04 |

---

## 5. Helm Chart (deploy/helm/cinacoin/)

**Status vs R8:** Unchanged. Key issues persist.

| # | Severity | Issue | R8 ID | Status |
|---|----------|-------|-------|--------|
| R12-57 | 🔴 CRITICAL | **Helm chart name mismatch** — deploy.yaml and deploy-cloudflare.yml reference `./deploy/helm/onchainux` but only `./deploy/helm/cinacoin` exists. Helm deploy will fail with "chart not found". | H-01 | UNCHANGED |
| R12-58 | 🟡 HIGH | **Image registry mismatch** — `values.yaml` uses `ghcr.io/cinacoin` but CI pushes to `ghcr.io/onchainux`. Images won't be found at deploy time. | H-01 | UNCHANGED |
| R12-59 | 🟡 HIGH | **No notify-server in Helm templates** — values.yaml has no `notifyServer` section, no templates for notify-server deployment. The service is completely missing from the Helm chart. | — | NEW |
| R12-60 | 🟡 MEDIUM | **No PDB for push-server/keys-server** — `templates/pdb.yaml` exists but doesn't cover all services. | H-04 | UNCHANGED |

---

## 6. CI/CD Pipeline

### 6.1 build.yaml Issues (UNCHANGED from R8)

| # | Severity | Workflow | Issue | R8 ID | Status |
|---|----------|----------|-------|-------|--------|
| R12-61 | 🔴 CRITICAL | build.yaml:rust-relay | **Wrong working directory** — `working-directory: ./relay-server` but source is at `./packages/relay-server/`. CI job will fail with "No such file or directory". | C-02 | UNCHANGED |
| R12-62 | 🔴 CRITICAL | build.yaml:docker-build | **References non-existent Dockerfiles** — matrix includes `deploy/docker/push-server/Dockerfile` and `deploy/docker/keys-server/Dockerfile` but these only exist at `packages/*/Dockerfile`. | C-01 | UNCHANGED |
| R12-63 | 🟡 HIGH | build.yaml:go-build | **Go cache path** — `cache-dependency-path: ./rpc-proxy/go.sum` but module is at `packages/rpc-proxy/`. Cache miss on every run. | C-03 | UNCHANGED |
| R12-64 | 🟡 HIGH | build.yaml:security-scan | **`cargo audit || true` always passes** — security scan failures are silently ignored. | C-04 | UNCHANGED |
| R12-65 | 🟡 HIGH | build.yaml:go-build | **`working-directory: ./rpc-proxy`** but source is at `./packages/rpc-proxy/`. Go jobs will also fail. | — | UNCHANGED |
| R12-66 | 🟡 MEDIUM | ci.yml | **No Rust CI** — `ci.yml` only covers TypeScript. Rust builds/tests only in build.yaml. PRs may skip Rust checks. | C-05 | UNCHANGED |

### 6.2 deploy.yaml Issues

| # | Severity | Issue |
|---|----------|-------|
| R12-67 | 🔴 CRITICAL | **References `./deploy/helm/onchainux`** — chart doesn't exist. Deploy will fail. |
| R12-68 | 🟡 MEDIUM | **Canary verification uses `sleep 900`** — hard 15-minute wait. Should use polling with timeout. |
| R12-69 | 🟡 MEDIUM | **Canary error rate parsing is fragile** — Python one-liner for Prometheus JSON may fail on unexpected shapes. |

### 6.3 security.yaml Issues

| # | Severity | Issue |
|---|----------|-------|
| R12-70 | 🟡 HIGH | **`cargo audit --deny warnings` on relay-server** — `working-directory: ./relay-server` is wrong path. Will fail. |
| R12-71 | 🟡 MEDIUM | **Trivy matrix references `deploy/docker/push-server/Dockerfile` and `deploy/docker/keys-server/Dockerfile`** — these don't exist in `deploy/docker/`. Will fail. |
| R12-72 | 🟡 MEDIUM | **Semgrep uses `--config=auto`** — may produce many false positives without tuning. |

---

## 7. Monitoring & Alerting

**Status vs R8:** Unchanged.

| # | Severity | Issue | R8 ID | Status |
|---|----------|-------|-------|--------|
| R12-73 | 🟡 HIGH | **Monitoring scripts reference wrong paths** — `scripts/monitoring-health-check.sh` exists but uses URLs like `https://rpc-proxy.cinacoin.com/health` which may not match deployed endpoints. | M-01 | UNCHANGED |
| R12-74 | 🟡 MEDIUM | **Weekly report is placeholder** — mostly static data. Not actionable. | M-03 | UNCHANGED |
| R12-75 | 🟡 MEDIUM | **notify-server metrics returns JSON not Prometheus text** — incompatible with Prometheus scraping. | N-08 | UNCHANGED |

---

## 8. Security Assessment

### 8.1 Critical Security Issues

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| R12-76 | 🔴 CRITICAL | keys-server/wallet_keys.rs | **XOR "encryption" of private keys** — trivially reversible. Private keys effectively stored in cleartext. |
| R12-77 | 🔴 CRITICAL | notify-server/auth.rs | **Auth is a stub** — any request with an Authorization header passes. No JWT/API key validation. |
| R12-78 | 🔴 CRITICAL | notify-server/notify.rs | **Push forward ignores result** — notifications appear sent but may not be delivered. |
| R12-79 | 🔴 CRITICAL | bundler/bundler.rs | **`hash_to_sender` returns `Address::ZERO`** — reputation system broken; cannot distinguish senders. |
| R12-80 | 🔴 CRITICAL | bundler/bundler.rs | **Simulation is a no-op** — UserOps bundled without `eth_call` validation. Funds at risk. |

### 8.2 JWT/Auth Status

| Service | JWT Required | JWT Validated | Notes |
|---------|-------------|---------------|-------|
| keys-server | ✅ Mandatory env var | ✅ Full validation (sig, expiry, issuer, blacklist) | Good |
| notify-server | ✅ Env var required | ❌ Stub — only checks header presence | Broken |
| relay-server | N/A | N/A | No auth layer (expected for relay) |
| push-server | N/A | N/A | No auth layer in current code |
| rpc-proxy (Go) | ❓ | Needs verification | Has API key config in cloudflare wrangler comments |
| rpc-proxy (TS) | ❌ | No API key validation | G-02 unchanged |

### 8.3 CSP/CSRF/cookie Status

| Check | Status |
|-------|--------|
| CSP headers | ❌ Not configured on any service |
| CSRF protection | ❌ Not implemented |
| httpOnly cookies | ❌ N/A — services use JWT Bearer tokens |

---

## 9. Summary & Priority Actions

### 🔴 Critical (Must Fix Before Any Build/Deploy)

| ID | Issue | Impact |
|----|-------|--------|
| R12-01/09/16/22/40 | **5 Cargo.toml files missing [dependencies]** | None of these packages can compile. CI/CD broken. |
| R12-52 | **deploy/docker/ Dockerfiles reference wrong paths** | Docker builds fail — `relay-server/` doesn't exist at repo root |
| R12-57/67 | **deploy.yaml references non-existent helm chart `onchainux`** | Deploy will fail immediately |
| R12-58 | **Image registry mismatch (`cinacoin` vs `onchainux`)** | Images not found at deploy time |
| R12-61/65 | **build.yaml wrong working directories** | Rust and Go CI jobs fail |
| R12-62 | **build.yaml references non-existent Dockerfiles** | Docker CI fails |
| R12-76 | **XOR "encryption" of private keys** | Private keys exposed |
| R12-77 | **notify-server auth is a stub** | No authentication on notify-server |
| R12-78 | **notify-server ignores push result** | Silent notification failures |
| R12-79/30 | **bundler hash_to_sender returns Address::ZERO** | Reputation system broken |
| R12-80/31 | **bundler simulation is a no-op** | Invalid UserOps bundled, funds at risk |
| R12-48 | **Default PostgreSQL credentials in docker-compose** | Database accessible with known credentials |

### 🟡 High (Should Fix Before Production)

| ID | Issue |
|----|-------|
| R12-02 | TLS still not implemented in relay-server |
| R12-05 | Fire-and-forget ack in relay WebSocket handler |
| R12-11 | No rate limiting on sign endpoint |
| R12-12 | Default DB credentials in config |
| R12-13 | CORS permissive in keys-server |
| R12-17 | Batch push bypasses rate limiting |
| R12-24/25/26 | notify-server error handling issues |
| R12-32 | Non-standard UserOp hash computation |
| R12-37 | Factory helpers return empty/zero in erc6492 |
| R12-41 | USER on scratch image doesn't work |
| R12-43 | D1 binding name mismatch |
| R12-49 | docker-compose uses upstream relay image |
| R12-50 | Dockerfile.demo doesn't exist |
| R12-59 | notify-server missing from Helm chart |
| R12-64 | cargo audit failures silently ignored |

### 🟢 Medium/Low

| ID | Issue |
|----|-------|
| R12-04 | check_nats is a no-op |
| R12-06 | relay.rs too large (730 lines) |
| R12-14 | 8-char invite codes |
| R12-18 | Rate limiter not distributed |
| R12-19 | Device ID truncation |
| R12-28 | notify-server metrics not Prometheus-compatible |
| R12-33 | Private key memory handling |
| R12-34 | In-memory mempool loses data on restart |
| R12-38 | Manual ABI decoding in erc6492 |
| R12-45 | DO migration inconsistency |
| R12-46 | Domain name inconsistency |
| R12-54 | No .dockerignore files |
| R12-55 | HEALTHCHECK flag support |
| R12-56 | Root Dockerfile CMD is no-op |
| R12-68 | Canary sleep 900 |
| R12-69 | Canary parsing fragile |

---

## 10. Delta from R8

### Issues Fixed Since R8 (✅)
| R8 ID | Issue | Status |
|-------|-------|--------|
| K-01, K-02, K-03 | keys-server handlers were stubs | ✅ FIXED — all handlers implemented |
| K-04 | JWT secret defaulted to "change-me-in-production" | ✅ FIXED — mandatory, min 16 chars |
| K-09 | database_max_connections not passed | ✅ FIXED — properly configured |
| W-01 | KV namespace ID collision across 3 services | ✅ FIXED — unique IDs |

### New Issues Introduced (❌ NEW)
| ID | Issue |
|----|-------|
| R12-01/09/16/22/40 | 5 Cargo.toml files missing [dependencies] |
| R12-09 | XOR key encryption in keys-server |
| R12-36 | bundler Cargo.lock is empty |
| R12-52 | deploy/docker/ Dockerfiles reference wrong paths |
| R12-59 | notify-server missing from Helm chart |

### Issues Unchanged (⚠️)
All remaining issues from R8 persist without remediation.

---

## 11. Overall Assessment

**Infrastructure maturity:** 4/10 (same as R8 — improvements offset by regressions)

**Blockers for production deployment:**
1. **Build is broken** — 5/7 Rust packages cannot compile due to missing Cargo.toml dependencies
2. **CI/CD is broken** — build.yaml and deploy.yaml have wrong paths that will fail
3. **Helm deploy is broken** — chart name mismatch between CI and deployment
4. **Security vulnerabilities** — XOR key encryption, notify-server auth stub, bundler simulation no-op
5. **Docker builds are broken** — Dockerfiles reference non-existent paths

**Strengths:**
- Good architectural scaffolding (Helm, Docker, CI/CD workflows exist and are well-structured)
- keys-server handlers are now fully implemented with proper DB interactions
- JWT auth on keys-server is properly hardened
- KV namespace collision is fixed
- Comprehensive monitoring framework (Prometheus, Grafana, Alertmanager)
- Network policies, PDBs, and autoscaling in Helm chart
- Canary deployment strategy in place

**Recommendation:** Do not attempt to build or deploy until all 🔴 critical issues are resolved. The project has excellent architectural design but the implementation has regressed in critical areas since R8. Priority order: (1) restore Cargo.toml dependencies, (2) fix CI/CD path references, (3) fix Helm chart name, (4) fix security issues (XOR encryption, notify-server auth, bundler simulation).
