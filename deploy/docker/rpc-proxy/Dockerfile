# syntax=docker/dockerfile:1
# ────────────────────────────────────────────────────────────────
# Multi-stage Go Dockerfile — RPC Proxy
# Optimized for minimal image size and security
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git ca-certificates tzdata

COPY rpc-proxy/go.mod rpc-proxy/go.sum ./
RUN go mod download

COPY rpc-proxy/ .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o /build/rpc-proxy \
    ./cmd/rpc-proxy

# ── Stage 2: Scratch Runtime ────────────────────────────────────
FROM scratch AS runtime

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=builder /build/rpc-proxy /rpc-proxy
COPY rpc-proxy/config/providers.yaml /config/providers.yaml

USER 1000:1000

EXPOSE 8545 9090

ENV RPC_PROXY_PORT=8545 \
    RPC_PROXY_SHUTDOWN_TIMEOUT_SECS=30

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/rpc-proxy", "-health"]

ENTRYPOINT ["/rpc-proxy"]
