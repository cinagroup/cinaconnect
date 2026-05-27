# Bundler

> `@cinacoin/bundler` — Self-hosted ERC-4337 Bundler implementation in Rust.

## Installation

```bash
# Requires Rust toolchain
cargo build --release -p bundler
```

## Overview

The Bundler receives UserOperations from dApps, packs them efficiently, and submits them to the EntryPoint contract on-chain.

## Features

- UserOperation pool management
- Smart packing and batching
- Gas price optimization
- Multi-chain support
- Monitoring and analytics

## Related

- [AA SDK](/api/aa-sdk)
- [Paymaster](/api/paymaster)
