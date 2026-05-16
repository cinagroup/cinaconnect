# syntax=docker/dockerfile:1
# ────────────────────────────────────────────────────────────────
# Multi-stage Rust Dockerfile — Bundler (ERC-4337)
# Optimized for minimal image size (<50MB) and security
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────
FROM rust:1.80-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY bundler/Cargo.toml bundler/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release --locked 2>/dev/null || true

COPY bundler/src ./src
RUN cargo build --release --locked

# ── Stage 2: Distroless Runtime ─────────────────────────────────
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

WORKDIR /app

COPY --from=builder /build/target/release/bundler .

EXPOSE 4337 9090

ENV RUST_LOG=info \
    BUNDLER_HOST=0.0.0.0 \
    BUNDLER_SHUTDOWN_TIMEOUT_SECS=60

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD ["/app/bundler", "--health-check"]

ENTRYPOINT ["/app/bundler"]
