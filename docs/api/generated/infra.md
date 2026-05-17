# Infrastructure API — Generated Overview

> Auto-generated reference for CinaConnect infrastructure components. For the hand-written guides, see [Bundler API](../../api/bundler.md) and [Paymaster](../../api/paymaster.md).

## Components

### Bundler (Rust)

| Package | Language | Entry |
|---------|----------|-------|
| `@cinaconnect/bundler` | Rust | `packages/bundler/src/main.rs` |

| Module | File | Description |
|--------|------|-------------|
| `bundler` | `bundler.rs` | Core bundler: submit, validate, bundle |
| `config` | `config.rs` | Bundler configuration |
| `gas_oracle` | `gas_oracle.rs` | Multi-source gas price oracle |
| `mempool` | `mempool.rs` | UserOp mempool (Redis-backed) |
| `metrics` | `metrics.rs` | Prometheus metrics |
| `reputation` | `reputation.rs` | Sender reputation tracking |
| `rpc` | `rpc.rs` | JSON-RPC server (ERC-4337 compatible) |
| `types` | `types.rs` | Core types: UserOperation, GasEstimation, etc. |
| `validation` | `validation.rs` | UserOp validation + simulation |

### Paymaster (Solidity)

| Package | Language | Entry |
|---------|----------|-------|
| `@cinaconnect/paymaster` | Solidity | `packages/paymaster/contracts/` |

| Contract | File | Description |
|----------|------|-------------|
| `CinaConnectPaymaster` | `CinaConnectPaymaster.sol` | Base paymaster implementation |
| `VerifyingPaymaster` | `VerifyingPaymaster.sol` | Off-chain signature verification |
| `TokenPaymaster` | `TokenPaymaster.sol` | ERC-20 token gas payment |
| `UpgradeablePaymaster` | `UpgradeablePaymaster.sol` | UUPS upgradeable variant |
| `PaymasterLib` | `libraries/PaymasterLib.sol` | Shared utility functions |
| `IPaymaster` | `interfaces/IPaymaster.sol` | ERC-4337 paymaster interface |

### Relay Server (Rust)

| Package | Language | Entry |
|---------|----------|-------|
| `@cinaconnect/relay-server` | Rust | `packages/relay-server/` |

### RPC Proxy (Rust)

| Package | Language | Entry |
|---------|----------|-------|
| `@cinaconnect/rpc-proxy` | Rust | `packages/rpc-proxy/` |

### Deployment (Helm)

| Component | Template |
|-----------|----------|
| Bundler | `deploy/helm/cinaconnect/templates/bundler/` |
| Relay | `deploy/helm/cinaconnect/templates/relay/` |
| RPC Proxy | `deploy/helm/cinaconnect/templates/rpc-proxy/` |
| NATS | `deploy/helm/cinaconnect/templates/nats/` |
| Redis | `deploy/helm/cinaconnect/templates/redis/` |
| Keys Server | `deploy/helm/cinaconnect/templates/keys-server/` |
| Push Server | `deploy/helm/cinaconnect/templates/push-server/` |
| Monitoring | `deploy/helm/cinaconnect/templates/monitoring/` |

## See Also

- [Bundler Hand-Written Docs](../../api/bundler.md) — Full Bundler API reference
- [Paymaster Hand-Written Docs](../../api/paymaster.md) — Full Paymaster contract docs
- [Environment Variables](../../deployment/environment-variables.md) — Deployment configuration
- [Runbooks](../../../deploy/runbooks/) — Operational runbooks
