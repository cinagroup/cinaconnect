# Backend Integration Tests

End-to-end integration test suite for Cinacoin's 5 Cloudflare Workers services.

## Quick Start

```bash
# Run all backend integration tests
pnpm vitest run --project backend-integration

# Or use the runner script
./scripts/run-backend-integration-tests.sh

# With coverage
./scripts/run-backend-integration-tests.sh --coverage
```

## Test Structure

```
tests/backend-integration/
├── health.test.ts              # Health checks for all 5 services
├── rpc-proxy.test.ts           # Chain routing, caching, rate limiting
├── keys-server.test.ts         # Key storage, encryption, session management
├── relay-server.test.ts        # WebSocket connection, message relay
├── notify-server.test.ts       # Subscribe, send notification, unsubscribe
├── push-server.test.ts         # Register device, send push notifications
├── cross-service.test.ts       # End-to-end flows spanning multiple services
├── mocks/
│   ├── mock-apns.ts            # Simulated APNs delivery
│   ├── mock-fcm.ts             # Simulated FCM delivery
│   ├── mock-email.ts           # Simulated email provider
│   ├── mock-relay.ts           # In-memory WebSocket relay
│   └── mock-cloudflare.ts      # Mock KV Namespace & D1 Database
└── setup/                      # Shared test utilities (future)
```

## Test Scenarios

### Health Checks (18 tests)
- All 5 service classes importable
- Public API methods present on each service
- HTTP health endpoint (RelayServer)
- Session creation/validation/expiration

### RPC Proxy (9 tests)
- Chain routing configuration
- Default chain fallback
- Unsupported chain rejection
- Read-only method caching
- Rate limiting (per-IP threshold)
- HTTP method validation (POST only)

### Keys Server (19 tests)
- Key storage and retrieval
- AES-256-GCM encryption round-trip
- Key deletion and listing (metadata only)
- Session creation with permissions
- Session expiration and revocation
- Various key sizes (1–256 bytes)
- IV uniqueness per encryption

### Relay Server (11 tests)
- HTTP /health endpoint
- WebSocket connection lifecycle
- Message publishing and relay
- Topic subscription management
- Stats tracking
- Connection cleanup on close
- Unsubscribed client isolation

### Notify Server (16 tests)
- Multi-channel subscription (push/email/webhook)
- Channel merging and deduplication
- Selective unsubscription
- Notification delivery per channel
- Notification ID uniqueness
- Data payload handling

### Push Server (21 tests)
- APNs notification delivery (simulated)
- FCM notification delivery (simulated)
- Batch notification sending
- Delivery log management (append/clear/copy)
- Device registration flow
- Config validation (missing APNs/FCM)

### Cross-Service Flows (9 tests)
- Wallet Connect → Relay → Notify chain
- Key Storage → Session → Push chain
- RPC Proxy → Relay → Notification chain
- Full Wallet Lifecycle (6-step flow)
- Multi-Service Error Recovery
- Independent service instances with different keys

## Configuration

The tests are configured in two places:

1. **`vitest.config.backend-integration.ts`** — Standalone config with resolve aliases
2. **`vitest.workspace.ts`** — Integrated into the monorepo workspace (for `--project backend-integration`)

### Resolve Aliases

The `@cinacoin/*` packages are resolved to their source directories via Vite aliases:

```ts
alias: {
  '@cinacoin/rpc-proxy': 'packages/rpc-proxy/src',
  '@cinacoin/keys-server': 'packages/keys-server/src',
  '@cinacoin/relay-server': 'packages/relay-server/src',
  '@cinacoin/notify-server': 'packages/notify-server/src',
  '@cinacoin/push-server': 'packages/push-server/src',
}
```

## Mock Utilities

### Mock APNs / FCM / Email
Simulated delivery clients that track sent messages for test assertions without hitting real external services.

### Mock Relay
In-memory WebSocket server for testing relay message flows locally.

### Mock Cloudflare (KV + D1)
- **MockKVNamespace** — Simulates Cloudflare KV with TTL support
- **MockD1Database** — Simulates Cloudflare D1 with basic SQL parsing

## Requirements

- Node.js >= 18
- pnpm >= 9
- vitest 2

All tests run locally without requiring actual Cloudflare Workers deployment or external network access.

## Adding New Tests

1. Create a new `.test.ts` file in `tests/backend-integration/`
2. Import services using `@cinacoin/*` aliases
3. Run `pnpm vitest run --project backend-integration` to verify

## Scripts

| Script | Description |
|--------|-------------|
| `./scripts/run-backend-integration-tests.sh` | Full runner: install → build → test → report |
| `./scripts/run-backend-integration-tests.sh --coverage` | Include coverage report |
| `./scripts/run-backend-integration-tests.sh --report` | Show existing report only |
