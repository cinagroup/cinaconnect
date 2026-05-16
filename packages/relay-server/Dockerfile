# syntax=docker/dockerfile:1
# ────────────────────────────────────────────────────────────────
# Multi-stage Rust Dockerfile — Relay Server
# Production-optimized: distroless final image, <50MB
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────
FROM rust:1.80-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency compilation
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --locked 2>/dev/null || true

# Copy actual source and build
COPY . .
RUN cargo build --release --locked

# ── Stage 2: Distroless Runtime ─────────────────────────────────
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

WORKDIR /app

COPY --from=builder /app/target/release/relay-server .

EXPOSE 8080 8081 9090

ENV RUST_LOG=info \
    RELAY_SERVER_HOST=0.0.0.0 \
    RELAY_SHUTDOWN_TIMEOUT_SECS=60

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD ["/app/relay-server", "--health-check"]

ENTRYPOINT ["/app/relay-server"]
