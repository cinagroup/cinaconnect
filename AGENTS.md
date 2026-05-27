# AGENTS.md — Cinacoin AI Agent Instructions

This file contains instructions for AI agents working on the Cinacoin project.

## Project Overview

Cinacoin is a self-hosted wallet connection toolkit — a complete replacement for Reown/WalletConnect infrastructure. It provides:

- **Core SDK** (`packages/core-sdk/`) — TypeScript client library for WalletConnect-compatible wallet connections
- **Relay Server** (`packages/relay-server/`) — Rust WebSocket relay with E2E encryption
- **RPC Proxy** (`packages/rpc-proxy/`) — Self-hosted blockchain RPC proxy

## Crypto Architecture

### Key Exchange
- **Algorithm**: X25519 (Curve25519 Diffie-Hellman)
- **TypeScript**: `@noble/curves` via `x25519` from `@noble/curves/ed25519.js`
- **Rust**: `x25519-dalek` crate
- **Key format**: 32-byte raw Uint8Array (TS) / `[u8; 32]` (Rust)

### Encryption
- **Algorithm**: ChaCha20-Poly1305 (IETF variant, RFC 8439)
- **TypeScript**: `@noble/ciphers` via `chacha20poly1305` from `@noble/ciphers/chacha.js`
- **Rust**: `chacha20poly1305` crate
- **Nonce**: 12 bytes (96 bits)
- **Key**: 32 bytes (256 bits from X25519 shared secret)
- **Wire format**: base64(nonce || ciphertext || tag)

### Hashing
- **Algorithm**: SHA-256
- **TypeScript**: `@noble/hashes` via `sha256` from `@noble/hashes/sha2.js`
- **Rust**: `sha2` crate

## Important Constraints

1. **Never use placeholder cryptography** — all crypto operations must use real implementations
2. **Never use XOR for encryption** — use ChaCha20-Poly1305
3. **Never use AES-GCM as a fallback** when ChaCha20-Poly1305 is required for protocol compatibility
4. **Never commit secrets** — keys, credentials, or private data
5. **Always run tests** before proposing changes: `npm test` (core-sdk) or `cargo test` (relay-server)

## Import Conventions

### TypeScript (ESM with .js extensions)
```ts
import { x25519 } from '@noble/curves/ed25519.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { sha256 } from '@noble/hashes/sha2.js';
```

### Rust
```rust
use x25519_dalek::{PublicKey, StaticSecret};
use chacha20poly1305::{ChaCha20Poly1305, aead::{Aead, KeyInit}};
```

## Testing

### Core SDK
```bash
cd packages/core-sdk
npm test          # run all tests
npm run check     # TypeScript type check
npm run lint      # ESLint
```

### Relay Server
```bash
cd packages/relay-server
cargo test        # run all tests
cargo clippy      # lint
cargo fmt         # format
```

## File Locations

- Core SDK crypto: `packages/core-sdk/src/crypto/`
- Relay server crypto: `packages/relay-server/src/crypto.rs`
- Package configs: `packages/*/package.json` (TS) and `packages/*/Cargo.toml` (Rust)
