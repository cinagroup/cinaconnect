# syntax=docker/dockerfile:1
# ────────────────────────────────────────────────────────────────
# Multi-stage Rust Dockerfile — Keys Server
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

COPY --from=builder /app/target/release/keys-server .

EXPOSE 3001

ENV RUST_LOG=info \
    KEYS_SERVER_HOST=0.0.0.0 \
    KEYS_SERVER_PORT=3001 \
    KEYS_SHUTDOWN_TIMEOUT_SECS=30

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/app/keys-server", "--health-check"]

ENTRYPOINT ["/app/keys-server"]
