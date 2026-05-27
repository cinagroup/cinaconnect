# Relay Server

> `@cinacoin/relay-server` — Self-hosted WebSocket relay server in Rust.

## Overview

The Relay Server handles real-time WebSocket communication between dApps and wallets using NATS as the message broker. It replaces WalletConnect's hosted relay with your own infrastructure.

## Architecture

- **Rust** core for maximum performance
- **NATS** message broker for pub/sub
- **Redis** for session state
- **End-to-end encryption** via ChaCha20-Poly1305
- **Multi-region** deployment support

## Deployment

```bash
docker compose up relay-server
```

## Related

- [RPC Proxy](/api/rpc-proxy)
- [Keys Server](/api/keys-server)
