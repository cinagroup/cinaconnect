# syntax=docker/dockerfile:1
# ────────────────────────────────────────────────────────────────
# Multi-stage Rust Dockerfile — Push Server
# Production-optimized: distroless final image, <50MB
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────
FROM rust:1.80-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
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

# Copy dynamically linked libraries + binary from builder
COPY --from=builder /app/target/release/push-server .

# Expose port
EXPOSE 3000

ENV RUST_LOG=info \
    PUSH_SERVER_HOST=0.0.0.0 \
    PUSH_SERVER_PORT=3000 \
    PUSH_SHUTDOWN_TIMEOUT_SECS=30

# Health check using built-in health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/app/push-server", "--health-check"]

# Entrypoint handles SIGTERM for graceful shutdown
ENTRYPOINT ["/app/push-server"]
