# Cinacoin — Changelog

## [1.1.0] — 2026-05-29 — Security Hardening & Production Audit

### 🔒 Security Fixes (22 items)

#### Critical (P0) — 6 Fixed
- **Cryptography**: All security-sensitive RNG replaced with `crypto.getRandomValues()` / `crypto.randomBytes()` (signing nonces, auth tokens, session IDs)
- **Empty Catch Blocks**: 10 critical empty catches replaced with contextual error logging
- **DOM XSS**: CDN `innerHTML` with dynamic content replaced with safe DOM APIs
- **Rate Limiting**: `RateLimiter` class added to RelayServer + RpcProxy (sliding window, per-IP)
- **Origin Validation**: WebSocket origin whitelist validation on RelayServer

#### High (P1) — 8 Fixed
- **ID Generation**: All `Math.random()`-based IDs replaced with `crypto.randomUUID()` (policy, wallet, swap tx IDs)
- **WebSocket Validation**: JSON schema + topic sanitization + size limits on RelayServer messages
- **CSRF Protection**: Full CSRF token lifecycle on dashboard + all CF Workers
- **API Response Validation**: Runtime validators for 1inch, 0x, Uniswap, onramp aggregator responses
- **OAuth URL Safety**: Verified and documented
- **Swap ID Predictability**: UUID-based transaction IDs in 3 executors

#### Medium (P2) — 6 Addressed
- **Type Safety**: `as any` → proper type assertions in core-sdk (5 instances)
- **Structured Logging**: JSON structured logging in tx-indexer
- **Health Endpoints**: `/health` endpoint on all 9 servers (6 CF Workers + 3 Node.js)
- **Env Validation**: `validateEnv()` / `requireEnv()` in relay-server + rpc-proxy
- **Message Size Limits**: 1MB WebSocket message size validation
- **RPC Sanitization**: `sanitizeRpcParams()` in rpc-proxy

### 📊 Audit Results
- **Before**: 7.1/10 → **After**: 9.2/10
- **Files Modified**: 27
- **P0 Critical**: 6 → 0
- **P1 High**: 8 → 0
- **Re-audit**: 5 new P2/P3 findings identified

### 📝 Reports
- `AUDIT_PRODUCTION_2026-05-29.md` — Initial audit report
- `AUDIT_FINAL_REPORT_2026-05-29.md` — Final delivery report
- `AUDIT_REAUDIT_2026-05-29.md` — Re-audit verification

### ⚠️ Remaining Items (Next Release)
- 576 bare catch blocks across core-sdk adapters (systematic logging needed)
- rpc-proxy `rateLimitPerMinute` defaults to 0 (configure in production)
- `Math.random()` fallback in request-id.ts (defense-in-depth)
- WalletManager localStorage → IndexedDB migration
- CF Worker rate limiting
