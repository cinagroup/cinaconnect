# Bundler API

> `@cinacoin/bundler` — ERC-4337 UserOperation Bundler, built in Rust.

## Overview

The Cinacoin Bundler collects UserOperations from the mempool, validates them, bundles them efficiently, and submits them to the EntryPoint contract on-chain. It is a self-hosted alternative to services like Pimlico.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Bundler (Rust)                  │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Mempool │  │ Validator│  │  Gas Oracle    │  │
│  │  (Redis) │◄─┤ + Sim    │◄─┤  (Multi-source)│  │
│  └─────┬────┘  └────┬─────┘  └────────────────┘  │
│        │            │                             │
│        ▼            ▼                             │
│  ┌─────────────────────────────────────────┐     │
│  │         Bundle Engine                   │     │
│  │  • Batch UserOps                        │     │
│  │  • Gas optimization                     │     │
│  │  • Reputation tracking                  │     │
│  └──────────────────┬──────────────────────┘     │
│                     │                            │
│                     ▼                            │
│            EntryPoint Contract                   │
└──────────────────────────────────────────────────┘
```

## Configuration

### BundlerConfig

```rust
struct BundlerConfig {
    /// EntryPoint contract address
    entry_point_address: Address,
    /// Chain ID
    chain_id: u64,
    /// Maximum UserOps per bundle transaction
    max_ops_per_bundle: u32,
    /// Minimum profit margin (basis points)
    min_profit_bps: u32,
    /// Bundle interval (ms)
    bundle_interval_ms: u64,
    /// RPC endpoint
    rpc_url: String,
    /// Bundler signer private key
    signer_key: String,
    /// Simulation settings
    simulation: SimulationConfig,
}
```

### SimulationConfig

```rust
struct SimulationConfig {
    /// Enable pre-transaction simulation
    enabled: bool,
    /// Maximum gas allowed in simulation
    max_simulation_gas: u64,
}
```

## UserOperation (ERC-4337 v0.7)

```rust
struct UserOperation {
    sender: Address,                    // Smart account address
    nonce: U256,                        // Anti-replay nonce
    init_code: Bytes,                   // Account deployment code
    call_data: Bytes,                   // Execution calldata
    call_gas_limit: U256,              // Gas for execution
    verification_gas_limit: U256,      // Gas for verification
    pre_verification_gas: U256,        // Bundler overhead compensation
    max_fee_per_gas: U256,             // EIP-1559 max fee
    max_priority_fee_per_gas: U256,    // EIP-1559 priority fee
    paymaster: Address,                // Paymaster (Address::ZERO if self-paying)
    paymaster_verification_gas_limit: U256,
    paymaster_post_op_gas_limit: U256,
    paymaster_data: Bytes,
    signature: Bytes,                   // Account signature
}
```

### Helper Methods

| Method | Return | Description |
|--------|--------|-------------|
| `total_gas_limit()` | `U256` | Sum of all gas limits |
| `max_cost()` | `U256` | Maximum cost at current gas prices |
| `has_paymaster()` | `bool` | Whether a paymaster is used |

## Bundler API

### `submit_user_op(user_op: UserOperation) -> Result<B256, BundlerError>`

Submit a UserOperation to the bundler's mempool.

The bundler performs full validation including:

1. **Reputation check** — sender must not be banned or throttled
2. **Per-sender pending limit** — prevents spam
3. **State override simulation** — validates the UserOp against contract state
4. **Signature verification** — ensures the UserOp is properly signed

```rust
let op_hash = bundler.submit_user_op(user_op).await?;
println!("UserOp accepted: {}", op_hash);
```

### `maybe_bundle() -> Result<(), BundlerError>`

Attempt to bundle pending UserOps and submit to the chain.

The bundle engine:

1. Fetches pending UserOps (up to `max_ops_per_bundle`)
2. Gets current gas prices from the oracle
3. Simulates `handleOps` with state override
4. Sends the transaction to EntryPoint
5. Updates mempool status

### `estimate_gas(user_op: &UserOperation) -> Result<GasEstimation, BundlerError>`

Estimate gas for a UserOperation.

```rust
let estimation = bundler.estimate_gas(&user_op).await?;
println!("call_gas_limit: {}", estimation.call_gas_limit);
println!("max_fee_per_gas: {}", estimation.max_fee_per_gas);
```

### `supported_entry_points() -> Vec<Address>`

Returns the list of supported EntryPoint contract addresses.

## GasEstimation

```rust
struct GasEstimation {
    call_gas_limit: U256,
    verification_gas_limit: U256,
    pre_verification_gas: U256,
    max_fee_per_gas: U256,
    max_priority_fee_per_gas: U256,
}
```

## UserOpStatus

```rust
enum UserOpStatus {
    Pending,     // In mempool, waiting to be bundled
    Bundled,     // Included in a bundle transaction
    Included,    // Confirmed on-chain
    Rejected,    // Failed validation
}
```

## TrackedUserOp

```rust
struct TrackedUserOp {
    user_op: UserOperation,
    hash: B256,
    status: UserOpStatus,
    received_at: DateTime<Utc>,
    bundle_tx_hash: Option<B256>,
}
```

## UserOpReceipt

```rust
struct UserOpReceipt {
    user_op_hash: B256,
    sender: Address,
    nonce: U256,
    actual_gas_cost: U256,
    actual_gas_used: U256,
    success: bool,
    logs: Vec<Value>,
    receipt: Value,
}
```

## RPC Endpoints

The bundler exposes a JSON-RPC interface compatible with the ERC-4337 standard:

| Method | Description |
|--------|-------------|
| `eth_sendUserOperation` | Submit a UserOp |
| `eth_estimateUserOperationGas` | Estimate gas |
| `eth_getUserOperationReceipt` | Get execution receipt |
| `eth_getUserOperationByHash` | Get UserOp by hash |
| `eth_supportedEntryPoints` | List supported EntryPoints |

## Reputation System

The bundler tracks sender reputation to prevent abuse:

| Status | Condition | Effect |
|--------|-----------|--------|
| `Ok` | Normal operation | No limits |
| `Throttled` | Recent violations | Limited pending ops |
| `Banned` | Repeated violations | Rejected |

Violations are recorded for validation failures, simulation failures, and other protocol violations.

## Error Types

| Error | Description |
|-------|-------------|
| `ValidationFailed(reason)` | UserOp failed validation |
| `PoolError(msg)` | Mempool internal error |
| `NoOpsToBundle` | No pending UserOps available |
| `RpcError(msg)` | RPC communication error |
| `SimulationFailed(msg)` | Pre-bundle simulation failed |
| `EncodingError(msg)` | Transaction encoding error |
| `SenderBanned(address)` | Sender is banned |
| `SenderThrottled(address)` | Sender is rate-limited |

## Deployment

```bash
# Environment variables
export BUNDLER_ENTRY_POINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032
export BUNDLER_CHAIN_ID=1
export BUNDLER_RPC_URL=https://eth-rpc.example.com
export BUNDLER_SIGNER_KEY=0x...
export BUNDLER_MAX_OPS_PER_BUNDLE=10
export BUNDLER_MIN_PROFIT_BPS=50
export BUNDLER_BUNDLE_INTERVAL_MS=5000

# Run
cargo run --release
```

## Metrics

The bundler exposes Prometheus metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `bundler_ops_submitted` | Counter | Total UserOps submitted |
| `bundler_ops_rejected` | Counter | Total UserOps rejected |
| `bundler_bundles_sent` | Counter | Total bundle transactions |
| `bundler_bundle_size` | Histogram | UserOps per bundle |
| `bundler_pending_ops` | Gauge | Current pending UserOps |
| `bundler_active_senders` | Gauge | Unique active senders |
