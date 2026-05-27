# Environment Variables Reference

> Complete environment variable documentation for all Cinacoin services.

## Table of Contents

- [Global Variables](#global-variables)
- [Relay Server](#relay-server)
- [RPC Proxy](#rpc-proxy)
- [Push Server](#push-server)
- [Keys Server](#keys-server)
- [Bundler](#bundler)
- [Security Considerations](#security-considerations)

---

## Global Variables

| Variable | Description | Default | Services | Required |
|----------|-------------|---------|----------|----------|
| `RUST_LOG` | Logging level filter | `info` | All Rust services | No |
| `REGION` | Deployment region | _(auto-detected)_ | All services | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint | | All services | No |

---

## Relay Server

| Variable | Description | Default | Required | Security |
|----------|-------------|---------|----------|----------|
| `RELAY_SERVER_HOST` | HTTP/WebSocket bind address | `0.0.0.0` | Yes | Bind to localhost in dev |
| `RELAY_WS_PORT` | WebSocket port | `8080` | Yes | |
| `RELAY_HTTP_PORT` | HTTP API port | `8081` | Yes | |
| `RELAY_METRICS_PORT` | Prometheus metrics port | `9090` | No | Restrict access |
| `NATS_URL` | NATS cluster URL | | Yes | Use TLS: `tls://` |
| `REDIS_URL` | Redis connection string | | No | Use `redis://` or `rediss://` |
| `RELAY_SHUTDOWN_TIMEOUT_SECS` | Graceful shutdown timeout | `60` | No | |
| `RELAY_MAX_CONNECTIONS` | Max concurrent WebSocket connections | `10000` | No | Prevent resource exhaustion |
| `RELAY_HEARTBEAT_INTERVAL_MS` | Heartbeat interval | `30000` | No | |

### NATS Auth (via K8s Secret `nats-credentials`)

| Key | Description | Required |
|-----|-------------|----------|
| `NATS_USERNAME` | NATS authentication username | Yes |
| `NATS_PASSWORD` | NATS authentication password | Yes |
| `NATS_TLS_CERT` | NATS TLS client certificate | If TLS |
| `NATS_TLS_KEY` | NATS TLS client private key | If TLS |

---

## RPC Proxy

| Variable | Description | Default | Required | Security |
|----------|-------------|---------|----------|----------|
| `RPC_PROXY_HOST` | HTTP bind address | `0.0.0.0` | Yes | |
| `RPC_PROXY_PORT` | HTTP port | `8545` | Yes | |
| `RPC_PROXY_METRICS_PORT` | Metrics port | `9090` | No | Restrict access |
| `REDIS_URL` | Redis cache connection | | Yes | Use `rediss://` for TLS |
| `PROVIDERS_FILE` | Provider config file path | `/config/providers.yaml` | Yes | |
| `RPC_PROXY_SHUTDOWN_TIMEOUT_SECS` | Graceful shutdown timeout | `30` | No | |

### Provider API Keys (via K8s Secret `provider-api-keys`)

| Key | Description | Required |
|-----|-------------|----------|
| `ALCHEMY_KEY` | Alchemy API key | If using Alchemy |
| `INFURA_KEY` | Infura API key | If using Infura |
| `ANKR_KEY` | ANKR API key | If using ANKR |
| `QUICKNODE_URL` | QuickNode endpoint URL | If using QuickNode |

---

## Push Server

| Variable | Description | Default | Required | Security |
|----------|-------------|---------|----------|----------|
| `PUSH_SERVER_HOST` | HTTP bind address | `0.0.0.0` | Yes | |
| `PUSH_SERVER_PORT` | HTTP port | `3000` | Yes | |
| `NATS_URL` | NATS cluster URL | | Yes | Use TLS: `tls://` |
| `REDIS_URL` | Redis connection string | | Yes | Use `rediss://` for TLS |
| `APNS_KEY_ID` | Apple Push Notification Key ID | | If iOS | ⚠️ Secret |
| `APNS_TEAM_ID` | Apple Developer Team ID | | If iOS | |
| `APNS_KEY_P8` | APNs .p8 private key content | | If iOS | ⚠️ **Secret — store in K8s Secret** |
| `APNS_CERT` | APNs certificate (alternative to .p8) | | If iOS | ⚠️ **Secret** |
| `APNS_ENVIRONMENT` | APNs environment | `production` | No | Use `development` for testing |
| `FCM_PROJECT_ID` | Firebase project ID | | If Android | |
| `FCM_CREDENTIALS_JSON` | FCM service account JSON | | If Android | ⚠️ **Secret — store in K8s Secret** |
| `PUSH_SHUTDOWN_TIMEOUT_SECS` | Graceful shutdown timeout | `30` | No | |

### Push Server Secrets (K8s Secret `push-apns`)

| Key | Description |
|-----|-------------|
| `apns-key-p8` | APNs .p8 private key (base64) |
| `apns-cert` | APNs certificate (base64) |
| `key-id` | APNs Key ID |
| `team-id` | APNs Team ID |

### Push Server Secrets (K8s Secret `push-fcm`)

| Key | Description |
|-----|-------------|
| `fcm-credentials-json` | FCM service account JSON |
| `project-id` | Firebase project ID |

---

## Keys Server

| Variable | Description | Default | Required | Security |
|----------|-------------|---------|----------|----------|
| `KEYS_SERVER_HOST` | HTTP bind address | `0.0.0.0` | Yes | |
| `KEYS_SERVER_PORT` | HTTP port | `3001` | Yes | |
| `DATABASE_URL` | PostgreSQL connection string | | Yes | ⚠️ **Contains credentials** |
| `DATABASE_MAX_CONNECTIONS` | Max DB connections | `10` | No | Tune based on server resources |
| `MASTER_ENCRYPTION_KEY` | Master key for data encryption | | Yes | ⚠️ **Critical secret** |
| `ENCRYPTION_KEY_ID` | Encryption key identifier | | No | For key rotation |
| `KEYS_SHUTDOWN_TIMEOUT_SECS` | Graceful shutdown timeout | `30` | No | |

### Database URL Format

```
postgres://username:password@hostname:port/database?sslmode=require
```

### Keys Server Secrets (K8s Secret `keys-db`)

| Key | Description |
|-----|-------------|
| `database-url` | Full PostgreSQL connection string (with password) |

### Keys Server Secrets (K8s Secret `keys-encryption`)

| Key | Description |
|-----|-------------|
| `master-key` | Master encryption key (hex-encoded, 256-bit) |
| `key-id` | Current key rotation identifier |

---

## Bundler

| Variable | Description | Default | Required | Security |
|----------|-------------|---------|----------|----------|
| `BUNDLER_HOST` | HTTP bind address | `0.0.0.0` | Yes | |
| `BUNDLER_PORT` | HTTP port | `4337` | Yes | |
| `BUNDLER_METRICS_PORT` | Metrics port | `9090` | No | Restrict access |
| `ENTRY_POINT_ADDRESS` | ERC-4337 EntryPoint contract address | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` | Yes | |
| `CHAIN_ID` | Blockchain chain ID | `1` | Yes | |
| `RPC_URL` | Ethereum RPC endpoint | | Yes | ⚠️ Contains API key |
| `BUNDLER_PRIVATE_KEY` | Bundler wallet private key | | Yes | ⚠️ **Critical secret** |
| `MAX_OPS_PER_BUNDLE` | Max UserOps per bundle | `4` | No | |
| `BUNDLER_SHUTDOWN_TIMEOUT_SECS` | Graceful shutdown timeout | `60` | No | |
| `GAS_BUFFER_PERCENT` | Gas estimation buffer | `20` | No | |
| `MIN_BALANCE_ETH` | Minimum bundler wallet balance (ETH) | `0.01` | No | |

### Bundler Secrets (K8s Secret `bundler-wallet`)

| Key | Description |
|-----|-------------|
| `private-key` | Bundler wallet private key (hex, no 0x prefix) |

---

## Security Considerations

### Required Secrets

The following variables **must** be stored in Kubernetes Secrets, never in ConfigMaps or plain environment variables:

| Variable | Secret Name | Reason |
|----------|-------------|--------|
| `DATABASE_URL` | `keys-db` | Contains database password |
| `MASTER_ENCRYPTION_KEY` | `keys-encryption` | Encrypts all stored data |
| `BUNDLER_PRIVATE_KEY` | `bundler-wallet` | Controls real assets on-chain |
| `APNS_KEY_P8` | `push-apns` | Apple developer credential |
| `FCM_CREDENTIALS_JSON` | `push-fcm` | Google service account |
| Provider API keys | `provider-api-keys` | Rate-limited API access |

### Best Practices

1. **Never commit `.env` files** — ensure `.env` is in `.gitignore`
2. **Use K8s Secrets** — never pass secrets as plain environment variables in production
3. **Rotate keys regularly** — especially `MASTER_ENCRYPTION_KEY` and `BUNDLER_PRIVATE_KEY`
4. **Use TLS** — for all database, NATS, and Redis connections
5. **Least privilege** — database users should have only required permissions
6. **Audit logs** — enable audit logging for all secret access
7. **Pre-commit hooks** — use `gitleaks` or `trufflehog` to prevent secret leaks

### Development vs Production

| Variable | Development | Production |
|----------|------------|------------|
| `RUST_LOG` | `debug` | `info` or `warn` |
| `DATABASE_URL` | `postgres://localhost:5432/dev` | K8s Secret with TLS |
| `NATS_URL` | `nats://localhost:4222` | `tls://nats-cluster:4222` |
| `REDIS_URL` | `redis://localhost:6379` | `rediss://redis-cluster:6379` |
| `BUNDLER_PRIVATE_KEY` | Test key (testnet only) | K8s Secret (mainnet) |

### Secret Rotation Schedule

| Secret | Rotation Period | Method |
|--------|----------------|--------|
| `BUNDLER_PRIVATE_KEY` | On demand | Manual (requires on-chain action) |
| `MASTER_ENCRYPTION_KEY` | Quarterly | Re-encrypt all data |
| Provider API keys | Quarterly | Generate new key, update Secret |
| `DATABASE_URL` password | Monthly | Rotate DB password |
| APNs/FCM credentials | Annually | Regenerate in developer console |
