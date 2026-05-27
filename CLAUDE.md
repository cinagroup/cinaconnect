# CLAUDE.md — Claude Code Configuration for Cinacoin

This file provides context and instructions for Claude Code working on the Cinacoin repository.

## Project Overview

Cinacoin is a self-hosted wallet connection toolkit — a complete replacement for Reown/WalletConnect infrastructure. It's a monorepo with:

- **packages/core-sdk/** — TypeScript SDK (EVM, Solana, Bitcoin adapters)
- **packages/relay-server/** — Rust WebSocket relay server
- **packages/rpc-proxy/** — RPC proxy service

## Tech Stack

| Component | Language | Key Dependencies |
|-----------|----------|-----------------|
| Core SDK | TypeScript (ESM) | `viem`, `zustand`, `@noble/curves`, `@noble/ciphers`, `@noble/hashes` |
| Relay Server | Rust | `actix-web`, `x25519-dalek`, `chacha20poly1305`, `redis` |
| RPC Proxy | TypeScript | Standard HTTP/WebSocket libs |

## Commands

### TypeScript (core-sdk)
```bash
cd packages/core-sdk
npm install       # install dependencies
npm run build     # compile TypeScript
npm run check     # type check only
npm run lint      # ESLint
npm test          # run vitest tests
```

### Rust (relay-server)
```bash
cd packages/relay-server
cargo build       # compile
cargo test        # run tests
cargo clippy      # lint
cargo fmt         # format
cargo run         # run server
```

## Crypto Implementation Details

### TypeScript (core-sdk)
- **X25519**: `import { x25519 } from '@noble/curves/ed25519.js'`
  - Key generation: `x25519.keygen()` → `{ secretKey, publicKey }` (both 32-byte Uint8Array)
  - DH: `x25519.getSharedSecret(privateKey, peerPublicKey)` → 32-byte shared secret
- **ChaCha20-Poly1305**: `import { chacha20poly1305 } from '@noble/ciphers/chacha.js'`
  - Encrypt: `const cipher = chacha20poly1305(key, nonce); cipher.encrypt(plaintext)`
  - Decrypt: `const cipher = chacha20poly1305(key, nonce); cipher.decrypt(ciphertext)`
  - Cipher is single-use (nonce is consumed); create a new instance for each operation
- **SHA-256**: `import { sha256 } from '@noble/hashes/sha2.js'`
  - Hash: `sha256(data)` → 32-byte Uint8Array

### Rust (relay-server)
- **X25519**: `x25519-dalek` crate (StaticSecret, PublicKey)
- **ChaCha20-Poly1305**: `chacha20poly1305` crate
- See `packages/relay-server/src/crypto.rs` for reference implementation

## Important Notes

1. **TypeScript uses ESM** — import paths must include `.js` extension (e.g., `'@noble/curves/ed25519.js'`)
2. **@noble/ciphers cipher instances are single-use** — create a new instance for each encrypt/decrypt operation
3. **Wire format is base64(nonce || ciphertext || tag)** — compatible with WalletConnect v2
4. **Never use placeholder crypto** — all implementations must be real and functional
5. **Encryption functions are synchronous** — no `async/await` needed for @noble operations

## Code Style

- **TypeScript**: ESLint + Prettier, 2-space indent, single quotes, semicolons
- **Rust**: Standard Rust style via `cargo fmt` + `cargo clippy`
- **Commit messages**: Conventional Commits format

## Testing

Always run tests before proposing changes. Crypto changes require roundtrip tests:
1. Generate keypair → derive shared secret → encrypt → decrypt → verify plaintext matches
2. Test with wrong key → verify decryption fails
3. Test deterministic operations (topic derivation, serialization)
