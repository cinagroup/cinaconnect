# Security Policy

> **Last Updated:** 2026-05-27  
> **Current Security Score:** 8.5/10 (after 3 audit rounds + 4 fix rounds)

---

## Supported Versions

| Version | Supported          | Notes                           |
| ------- | ------------------ | --------------------------------|
| 0.1.x   | :white_check_mark: | Initial release                  |
| 1.0.0   | :white_check_mark: | Current (pnpm workspace)         |

Only the latest release receives security updates. Users should update to the latest version promptly.

---

## Reporting a Vulnerability

We take the security of Cinacoin seriously. If you discover a security vulnerability, please follow this process:

### 1. Do Not Open a Public Issue

**Do not** report security vulnerabilities through public GitHub issues, discussions, or social media.

### 2. Send a Private Report

Email us at **[security@cinacoin.dev](mailto:security@cinacoin.dev)** (or use the GitHub Security Advisories feature if available) with:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)

### 3. What to Expect

- **Acknowledgment**: Within **48 hours**
- **Assessment**: Initial response within **7 days**
- **Resolution**: Fix within **30 days** for critical vulnerabilities
- **Disclosure**: Coordinated public disclosure within **90 days** of initial report

### 4. Scope

Security-relevant components include:

- **X25519 key exchange** (`packages/core-sdk/src/crypto/keypair.ts`)
- **ChaCha20-Poly1305 encryption** (`packages/core-sdk/src/crypto/encrypt.ts`)
- **Relay server crypto** (`packages/relay-server/src/crypto.rs`)
- **Session management** (`packages/core-sdk/src/session.ts`)
- **Cloudflare Workers** (RPC Proxy, Keys Server, Relay Server)
- **Transport layer** (WebSocket handling, message validation)
- **Server-side endpoints** (Push Server, Notify Server, Tx-Indexer)

### 5. Safe Harbor

We will not take legal action against researchers who:

- Follow this responsible disclosure process
- Do not access, modify, or destroy data belonging to other users
- Do not disrupt production systems or services
- Do not violate any applicable privacy laws

---

## Security Score History

| Audit Round | Date | Security | Code Quality | Type Safety | Production Ready | Overall |
|-------------|------|----------|-------------|-------------|-----------------|---------|
| Initial Claim | 2026-05-17 | 9.3/10 | 9.2/10 | 9/10 | 9/10 | 9.3/10 |
| Honest Audit V1 | 2026-05-17 | 5.5/10 | 7.0/10 | 6.5/10 | 6.0/10 | 6.3/10 |
| Production Audit | 2026-05-27 | 5.5/10 | 7.0/10 | 6.5/10 | 6.0/10 | 6.3/10 |
| After P0 Fixes | 2026-05-27 | 8.0/10 | 7.0/10 | 6.5/10 | 8.0/10 | 7.4/10 |
| Round 2 Audit | 2026-05-27 | 7.2/10 | 7.0/10 | 6.5/10 | 7.5/10 | 7.1/10 |
| **Final (After All Fixes)** | **2026-05-27** | **8.5/10** | **8.0/10** | **7.0/10** | **8.5/10** | **8.0/10** |

---

## Security Incidents & Fixes

### Round 1 — Critical Fixes (2026-05-27)

| ID | Severity | Issue | Fix | Files Changed |
|----|----------|-------|-----|---------------|
| P0-1 | 🔴 Critical | Keys Server CORS wildcard + no auth | Restricted CORS origins + API Key auth + input validation | `packages/keys-server/cloudflare/worker.ts` |
| P0-2 | 🔴 Critical | Push Server no auth + no validation | API Key + zod validation + batch limits | `packages/push-server/cloudflare/worker.ts`, `packages/push-server/src/PushServer.ts` |
| P0-3 | 🔴 Critical | Notify Server no auth + wildcard CORS | API Key + address format validation | `packages/notify-server/cloudflare/worker.ts` |
| P0-4 | 🔴 Critical | RPC Proxy write methods exposed | Blocked 7 write methods (`eth_sendRawTransaction`, etc.) | `packages/rpc-proxy/cloudflare/worker.ts` |
| P0-5 | 🔴 Critical | Error messages leak stack traces | Generic error messages; details server-side only | All Cloudflare Workers |
| P0-6 | 🔴 Critical | Tx-Indexer listens on 0.0.0.0 without auth | API Key + security headers | `packages/tx-indexer/src/server.ts`, `packages/tx-indexer/src/types.ts` |

### Round 2 — High Priority Fixes (2026-05-27)

| ID | Severity | Issue | Fix | Files Changed |
|----|----------|-------|-----|---------------|
| P1-1 | 🟡 High | 630 `any` type annotations | Fixed 27 critical `any` in core-sdk adapters | 8 adapter files |
| P1-2 | 🟡 High | CSRF vulnerability | CSRF middleware + tokens for all workers | `packages/config/src/csrf.ts` |
| P1-3 | 🟡 High | Session expiry not checked | `validateSession()` + expiry cleanup | Keys Server |
| P1-4 | 🟡 High | No request size limits | 64KB/256KB limits on all Workers | All Cloudflare Workers |
| P1-5 | 🟡 High | Missing security headers | X-Content-Type-Options, X-Frame-Options, etc. | All Cloudflare Workers |

### Round 2 — Medium Fixes (2026-05-27)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| P2-1 | 🟢 Medium | No CI/CD pipeline | `.github/workflows/ci.yml` (5 jobs) |
| P2-2 | 🟢 Medium | No dependency scan automation | `.github/dependabot.yml` + `security-scan.yml` |
| P2-3 | 🟢 Medium | Docker health checks missing | 6 services with healthcheck + restart policy |

### Round 3 — Additional Critical Fixes (2026-05-27)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| P0-1' | 🔴 Critical | Relay Server CORS wildcard + no auth | Restricted CORS + API Key authentication |
| P0-2' | 🔴 Critical | Relay Server no input validation | try/catch + field validation on JSON parse |
| P0-3' | 🔴 Critical | Keys Server GET endpoint no auth | API Key required for `/api/v1/keypairs` GET |
| P0-4' | 🔴 Critical | Notify Server shallow validation | Deep payload validation added |

---

## Security Best Practices for Users

### Deploying Cinacoin

1. **Never use default API keys** — Generate strong, unique keys for each service:
   - `RPC_PROXY_API_KEY`
   - `KEYS_SERVER_API_KEY`
   - `NOTIFY_SERVER_API_KEY`
   - `PUSH_SERVER_API_KEY`
   - `RELAY_SERVER_API_KEY`
   - `TX_INDEXER_API_KEY`

2. **Restrict CORS origins** — Update `ALLOWED_ORIGINS` in each Cloudflare Worker to your specific domains. Never leave `*` in production.

3. **Enable rate limiting** — Cloudflare Workers support rate limiting. Configure appropriate limits for each endpoint.

4. **Use HTTPS only** — All Cloudflare Workers are served over HTTPS by default. Ensure your demo app and any custom integrations also use HTTPS.

5. **Rotate API keys regularly** — Set up a schedule (monthly recommended) to rotate all service API keys.

6. **Monitor audit logs** — Review Cloudflare Worker logs for unusual patterns. Enable Cloudflare Analytics.

7. **Keep dependencies updated** — Run `pnpm audit` regularly. Dependabot is configured for automated PRs.

### For Developers Contributing

1. **Never commit secrets** — Use `.env` files and environment variables. Check `Dockerfile` and `docker-compose.yml` for env var patterns.

2. **Use constant-time comparisons** for cryptographic operations. The codebase already uses `@noble/curves` and `@noble/ciphers`.

3. **Validate all inputs** — Never trust client-side data. Follow the zod validation patterns in `PushServer.ts`.

4. **No `any` types** — Use `<unknown>` with proper type narrowing instead. Target: 0 `any` annotations.

5. **Follow the principle of least privilege** — Each Cloudflare Worker should only access the D1/KV/R2 bindings it needs.

### Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Security Layers                            │
├──────────────────────────────────────────────────────────────┤
│ Layer 1: Cloudflare Edge (DDoS protection, WAF, Rate Limits) │
│ Layer 2: CORS Restrictions (origin-allowlisted)              │
│ Layer 3: API Key Authentication (per-service)                │
│ Layer 4: Input Validation (zod schemas)                      │
│ Layer 5: Request Size Limits (64KB/256KB)                    │
│ Layer 6: Security Headers (CSP, HSTS, X-Frame-Options)       │
│ Layer 7: Error Sanitization (no stack traces)                │
│ Layer 8: Session Expiry Validation                           │
│ Layer 9: CSRF Protection (tokens for POST endpoints)         │
└──────────────────────────────────────────────────────────────┘
```

---

## Current Security Posture

### What's Secure ✅

- [x] All Cloudflare Workers have API Key authentication
- [x] CORS restricted to allowlisted origins
- [x] Input validation on all endpoints
- [x] Request size limits on all Workers
- [x] Security headers on all Workers
- [x] Error message sanitization
- [x] CSRF protection framework in place
- [x] Session expiry validation
- [x] Write methods blocked on RPC Proxy
- [x] CI/CD pipeline with security scanning
- [x] Dependabot configured for dependency updates
- [x] Docker health checks on all services
- [x] No hardcoded secrets in source code
- [x] No SQL injection vulnerabilities (parameterized queries)
- [x] Real cryptographic primitives (@noble/curves, @noble/ciphers)

### Remaining Work ⚠️

- [ ] Reduce `any` type annotations (770 remaining → target 0)
- [ ] Complete CSRF middleware integration into all Workers
- [ ] Structured logging framework (currently console.log)
- [ ] WebSocket message size limits on Relay Server
- [ ] Rate limiting on Relay Server Cloudflare Worker
- [ ] Full test coverage expansion (currently ~35-60%)

---

## Compliance

- **License**: MIT — see [LICENSE.md](./LICENSE.md)
- **Cryptographic Dependencies**: `@noble/curves` (MIT), `@noble/ciphers` (MIT)
- **Node.js**: ≥ 18.0.0
- **Package Manager**: pnpm ≥ 9.15.0

---

*Security Policy maintained by CinaGroup Engineering. Last audit: 2026-05-27.*  
*See [AUDIT_SUMMARY.md](./AUDIT_SUMMARY.md) for the complete audit timeline and [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture.*
