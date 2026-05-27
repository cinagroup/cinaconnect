# syntax=docker/dockerfile:1
# ────────────────────────────────────────────────────────────────
# Multi-stage Rust Dockerfile — Relay Server
# Optimized for minimal image size (<50MB) and security
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────
FROM rust:1.80-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY relay-server/Cargo.toml relay-server/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release --locked 2>/dev/null || true

COPY relay-server/src ./src
RUN cargo build --release --locked

# ── Stage 2: Distroless Runtime ─────────────────────────────────
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

WORKDIR /app

COPY --from=builder /build/target/release/relay-server .

EXPOSE 8080 8081 9090

ENV RUST_LOG=info \
    RELAY_SERVER_HOST=0.0.0.0 \
    RELAY_SHUTDOWN_TIMEOUT_SECS=60

# ── TLS Configuration ──────────────────────────────────────────
# Set RELAY_TLS_CERT and RELAY_TLS_KEY env vars at runtime to enable TLS.
# The relay-server binary MUST validate at startup that when both variables
# are set, the certificate and key files exist and are readable.
# Required validation logic (in relay-server Rust binary):
#   if let (Ok(cert), Ok(key)) = (env("RELAY_TLS_CERT"), env("RELAY_TLS_KEY")) {
#       assert!(Path::new(&cert).exists(), "TLS cert file not found: {}", cert);
#       assert!(Path::new(&key).exists(), "TLS key file not found: {}", key);
#   }
# Helm chart mounts certificates via Secret at /app/certs/.
ENV RELAY_TLS_CERT=/app/certs/tls.crt \
    RELAY_TLS_KEY=/app/certs/tls.key

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD ["/app/relay-server", "--health-check"]

ENTRYPOINT ["/app/relay-server"]
