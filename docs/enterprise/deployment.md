# Cinacoin Enterprise Deployment Guide

> Complete guide for deploying Cinacoin in self-hosted enterprise environments. Covers Docker Compose, Kubernetes, load balancing, SSL/TLS, backup strategies, and monitoring.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Load Balancer Configuration](#load-balancer-configuration)
6. [SSL/TLS Setup with Let's Encrypt](#ssltls-setup-with-lets-encrypt)
7. [Database Backup Strategy](#database-backup-strategy)
8. [Monitoring with Prometheus & Grafana](#monitoring-with-prometheus--grafana)
9. [Operational Runbook](#operational-runbook)

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              Load Balancer                  │
                    │         (Nginx / HAProxy / ALB)             │
                    │         TLS termination (443)               │
                    └────────────┬──────────────┬────────────────┘
                                 │              │
                    ┌────────────▼────┐  ┌──────▼──────────────┐
                    │   Ingress /     │  │  Ingress /          │
                    │   Frontend      │  │  Frontend           │
                    │   Node × 2      │  │  Node × 2           │
                    └────────┬────────┘  └────────┬────────────┘
                             │                    │
              ┌──────────────┼────────────────────┼──────────────┐
              │              │                    │              │
     ┌────────▼─────┐ ┌─────▼──────┐  ┌──────────▼───┐  ┌──────▼────────┐
     │  API Server  │ │ API Server │  │  WebSocket   │  │  WebSocket    │
     │   Node × 2   │ │  Node × 2  │  │  Signaling   │  │  Signaling    │
     │              │ │            │  │  Node × 2    │  │  Node × 2     │
     └──────┬───────┘ └─────┬──────┘  └──────┬───────┘  └──────┬────────┘
            │               │                 │                 │
            └───────┬───────┘                 └────────┬────────┘
                    │                                  │
     ┌──────────────▼──────────────┐  ┌───────────────▼──────────────┐
     │   PostgreSQL Primary        │  │   Redis Cluster              │
     │   + Read Replicas           │  │   (Session / Cache)          │
     └─────────────────────────────┘  └──────────────────────────────┘
                                      ┌──────────────────────────────┐
                                      │   TURN/STUN Server           │
                                      │   (coturn)                   │
                                      └──────────────────────────────┘
```

### Components

| Component | Technology | Purpose |
|---|---|---|
| Load Balancer | Nginx / HAProxy / AWS ALB | TLS termination, traffic routing |
| Web Frontend | Node.js / Static assets | SPA serving, SSR |
| API Server | Node.js / .NET | REST API, business logic |
| WebSocket Signaling | Node.js | WebRTC signaling, real-time |
| Database | PostgreSQL 15+ | Primary data store |
| Cache / Sessions | Redis 7+ | Session management, pub/sub |
| TURN/STUN | coturn | NAT traversal for WebRTC |
| Monitoring | Prometheus + Grafana | Metrics, alerting |
| Object Storage | MinIO / S3 | Media files, backups |

---

## Prerequisites

- **OS**: Ubuntu 22.04 LTS / RHEL 9+ / Debian 12+
- **Docker**: 24.0+ / Docker Compose v2+
- **Kubernetes**: 1.27+ (if using K8s deployment)
- **CPU**: 4+ cores minimum, 8+ recommended
- **RAM**: 16 GB minimum, 32 GB recommended
- **Storage**: 100 GB SSD minimum
- **Network**: Public IP, DNS configured, ports 80/443/3478/5349 open
- **Domain**: `app.cinacoin.com` (or custom)

---

## Docker Compose Deployment

### docker-compose.yml

```yaml
# docker-compose.yml — Cinacoin Enterprise
version: "3.9"

x-common-env: &common-env
  NODE_ENV: production
  CINA_CONNECT_DB_HOST: postgres
  CINA_CONNECT_DB_PORT: 5432
  CINA_CONNECT_DB_NAME: cinacoin
  CINA_CONNECT_DB_USER: ${DB_USER}
  CINA_CONNECT_DB_PASSWORD: ${DB_PASSWORD}
  CINA_CONNECT_REDIS_HOST: redis
  CINA_CONNECT_REDIS_PORT: 6379
  CINA_CONNECT_REDIS_PASSWORD: ${REDIS_PASSWORD}
  CINA_CONNECT_JWT_SECRET: ${JWT_SECRET}
  CINA_CONNECT_SESSION_SECRET: ${SESSION_SECRET}
  CINA_CONNECT_TURN_HOST: ${TURN_HOST}
  CINA_CONNECT_TURN_PORT: 3478
  CINA_CONNECT_TURN_SECRET: ${TURN_SECRET}

services:
  # ─── Frontend ─────────────────────────────────────────
  frontend:
    image: cinacoin/frontend:${CC_VERSION:-latest}
    restart: unless-stopped
    environment:
      <<: *common-env
      API_URL: https://${DOMAIN}/api
      WS_URL: wss://${DOMAIN}/ws
    ports:
      - "3000:3000"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - cinacoin-net

  # ─── API Server ───────────────────────────────────────
  api:
    image: cinacoin/api:${CC_VERSION:-latest}
    restart: unless-stopped
    environment:
      <<: *common-env
      PORT: 3001
      CORS_ORIGINS: https://${DOMAIN}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - cinacoin-net

  # ─── WebSocket Signaling ──────────────────────────────
  signaling:
    image: cinacoin/signaling:${CC_VERSION:-latest}
    restart: unless-stopped
    environment:
      <<: *common-env
      PORT: 3002
      TURN_HOST: ${TURN_HOST}
      TURN_PORT: 3478
    ports:
      - "3002:3002"
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - cinacoin-net

  # ─── PostgreSQL ───────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cinacoin
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d cinacoin"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - cinacoin-net

  # ─── Redis ────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - cinacoin-net

  # ─── TURN/STUN (coturn) ──────────────────────────────
  coturn:
    image: coturn/coturn:latest
    restart: unless-stopped
    network_mode: host
    environment:
      TURN_USER: ${TURN_USER}
      TURN_PASSWORD: ${TURN_PASSWORD}
      TURN_REALM: ${DOMAIN}
    volumes:
      - ./config/turnserver.conf:/etc/turnserver.conf:ro
    depends_on:
      - redis

  # ─── Nginx Reverse Proxy ──────────────────────────────
  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/certs:/etc/nginx/certs:ro
      - ./config/htpasswd:/etc/nginx/htpasswd:ro
    depends_on:
      - frontend
      - api
      - signaling
    networks:
      - cinacoin-net

  # ─── Prometheus ───────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.48.0
    restart: unless-stopped
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - cinacoin-net

  # ─── Grafana ──────────────────────────────────────────
  grafana:
    image: grafana/grafana:10.2.0
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_SERVER_ROOT_URL: https://${DOMAIN}/grafana
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana-dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./config/grafana-datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3100:3000"
    depends_on:
      - prometheus
    networks:
      - cinacoin-net

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  cinacoin-net:
    driver: bridge
```

### .env

```bash
# .env — Cinacoin Enterprise (DO NOT COMMIT)
DOMAIN=app.cinacoin.com
CC_VERSION=2.1.0

DB_USER=cinacoin
DB_PASSWORD=<generate-secure-password>

REDIS_PASSWORD=<generate-secure-password>

JWT_SECRET=<generate-256-bit-secret>
SESSION_SECRET=<generate-256-bit-secret>

TURN_HOST=turn.cinacoin.com
TURN_USER=cinacoin
TURN_PASSWORD=<generate-secure-password>
TURN_SECRET=<generate-256-bit-secret>

GRAFANA_PASSWORD=<generate-secure-password>
```

### Generate Secrets

```bash
# Generate all secrets at once
openssl rand -base64 32  # DB_PASSWORD
openssl rand -base64 32  # REDIS_PASSWORD
openssl rand -base64 48  # JWT_SECRET
openssl rand -base64 48  # SESSION_SECRET
openssl rand -base64 32  # TURN_PASSWORD
openssl rand -base64 48  # TURN_SECRET
openssl rand -base64 32  # GRAFANA_PASSWORD
```

### Deploy

```bash
# Pull images
docker compose pull

# Run database migrations
docker compose run --rm api npm run db:migrate

# Start all services
docker compose up -d

# Verify
docker compose ps
docker compose logs --tail=50

# Stop
docker compose down

# Full reset (destroys data)
docker compose down -v
```

---

## Kubernetes Deployment

### Namespace & ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cinacoin
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cinacoin-config
  namespace: cinacoin
data:
  NODE_ENV: "production"
  CINA_CONNECT_DB_HOST: "postgres-service"
  CINA_CONNECT_DB_PORT: "5432"
  CINA_CONNECT_DB_NAME: "cinacoin"
  CINA_CONNECT_REDIS_HOST: "redis-service"
  CINA_CONNECT_REDIS_PORT: "6379"
  CINA_CONNECT_TURN_HOST: "turn.cinacoin.com"
  CINA_CONNECT_TURN_PORT: "3478"
  API_URL: "https://app.cinacoin.com/api"
  WS_URL: "wss://app.cinacoin.com/ws"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cinacoin-secrets
  namespace: cinacoin
type: Opaque
stringData:
  DB_PASSWORD: "<base64-encoded>"
  REDIS_PASSWORD: "<base64-encoded>"
  JWT_SECRET: "<base64-encoded>"
  SESSION_SECRET: "<base64-encoded>"
  TURN_SECRET: "<base64-encoded>"
  GRAFANA_PASSWORD: "<base64-encoded>"
```

### API Server Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cinacoin-api
  namespace: cinacoin
  labels:
    app: cinacoin-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cinacoin-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: cinacoin-api
    spec:
      containers:
        - name: api
          image: cinacoin/api:2.1.0
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: cinacoin-config
            - secretRef:
                name: cinacoin-secrets
          env:
            - name: PORT
              value: "3001"
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: cinacoin-api-service
  namespace: cinacoin
spec:
  selector:
    app: cinacoin-api
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
```

### Frontend Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cinacoin-frontend
  namespace: cinacoin
  labels:
    app: cinacoin-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cinacoin-frontend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: cinacoin-frontend
    spec:
      containers:
        - name: frontend
          image: cinacoin/frontend:2.1.0
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: cinacoin-config
            - secretRef:
                name: cinacoin-secrets
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: cinacoin-frontend-service
  namespace: cinacoin
spec:
  selector:
    app: cinacoin-frontend
  ports:
    - port: 3000
      targetPort: 3000
  type: ClusterIP
```

### Signaling Deployment

```yaml
# k8s/signaling-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cinacoin-signaling
  namespace: cinacoin
  labels:
    app: cinacoin-signaling
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cinacoin-signaling
  template:
    metadata:
      labels:
        app: cinacoin-signaling
    spec:
      containers:
        - name: signaling
          image: cinacoin/signaling:2.1.0
          ports:
            - containerPort: 3002
          envFrom:
            - configMapRef:
                name: cinacoin-config
            - secretRef:
                name: cinacoin-secrets
          resources:
            requests:
              cpu: 200m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 10
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: cinacoin-signaling-service
  namespace: cinacoin
spec:
  selector:
    app: cinacoin-signaling
  ports:
    - port: 3002
      targetPort: 3002
  type: ClusterIP
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cinacoin-ingress
  namespace: cinacoin
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.cinacoin.com
      secretName: cinacoin-tls
  rules:
    - host: app.cinacoin.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: cinacoin-api-service
                port:
                  number: 3001
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: cinacoin-signaling-service
                port:
                  number: 3002
          - path: /
            pathType: Prefix
            backend:
              service:
                name: cinacoin-frontend-service
                port:
                  number: 3000
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cinacoin-api-hpa
  namespace: cinacoin
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cinacoin-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Apply

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/signaling-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Verify
kubectl get pods -n cinacoin
kubectl get svc -n cinacoin
kubectl get ingress -n cinacoin
```

---

## Load Balancer Configuration

### Nginx (Standalone Load Balancer)

```nginx
# /etc/nginx/nginx.conf

upstream frontend_pool {
    least_conn;
    server frontend-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server frontend-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server frontend-3:3000 weight=1 max_fails=3 fail_timeout=30s backup;
    keepalive 32;
}

upstream api_pool {
    least_conn;
    server api-1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server api-2:3001 weight=1 max_fails=3 fail_timeout=30s;
    server api-3:3001 weight=1 max_fails=3 fail_timeout=30s backup;
    keepalive 64;
}

upstream signaling_pool {
    ip_hash;  # Sticky sessions for WebSocket
    server signaling-1:3002 weight=1 max_fails=3 fail_timeout=30s;
    server signaling-2:3002 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name app.cinacoin.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.cinacoin.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=5r/s;

    # Frontend
    location / {
        proxy_pass http://frontend_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://api_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Signaling
    location /ws {
        limit_req zone=ws_limit burst=10 nodelay;
        proxy_pass http://signaling_pool;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Health check endpoint (not rate limited)
    location /health {
        proxy_pass http://frontend_pool;
        access_log off;
    }
}
```

### HAProxy

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 50000
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5s
    timeout client  30s
    timeout server  3600s
    retries 3

frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/cinacoin.pem
    mode http

    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }

    # Routing
    acl is_api path_beg /api
    acl is_ws path_beg /ws

    use_backend api_servers if is_api
    use_backend signaling_servers if is_ws
    default_backend frontend_servers

backend frontend_servers
    balance leastconn
    option httpchk GET /health
    server frontend1 frontend-1:3000 check inter 10s fall 3 rise 2
    server frontend2 frontend-2:3000 check inter 10s fall 3 rise 2
    server frontend3 frontend-3:3000 check inter 10s fall 3 rise 2 backup

backend api_servers
    balance leastconn
    option httpchk GET /health
    server api1 api-1:3001 check inter 10s fall 3 rise 2
    server api2 api-2:3001 check inter 10s fall 3 rise 2

backend signaling_servers
    balance source  # Sticky for WebSocket
    option httpchk GET /health
    server sig1 signaling-1:3002 check inter 10s fall 3 rise 2
    server sig2 signaling-2:3002 check inter 10s fall 3 rise 2
```

---

## SSL/TLS Setup with Let's Encrypt

### Certbot (Standalone)

```bash
# Install certbot
sudo apt update && sudo apt install -y certbot

# Stop Nginx temporarily
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
  -d app.cinacoin.com \
  --email admin@cinacoin.com \
  --agree-tos \
  --non-interactive

# Restart Nginx
sudo systemctl start nginx

# Auto-renewal (cron)
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && systemctl reload nginx
```

### Certbot + Nginx Plugin

```bash
sudo apt install -y python3-certbot-nginx

# Obtain and auto-configure
sudo certbot --nginx \
  -d app.cinacoin.com \
  --email admin@cinacoin.com \
  --agree-tos \
  --redirect \
  --hsts \
  --staple-ocsp
```

### Kubernetes (cert-manager)

```yaml
# k8s/cert-manager-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@cinacoin.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

### SSL Best Practices

```nginx
# Add to Nginx server block
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/certs/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

---

## Database Backup Strategy

### Automated Backups Script

```bash
#!/bin/bash
# scripts/backup.sh — Cinacoin Database Backup

set -euo pipefail

BACKUP_DIR="/var/backups/cinacoin/postgres"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="cinacoin"
DB_USER="${DB_USER:-cinacoin}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Full dump with compression
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/cinacoin_${DATE}.dump"

# Verify backup
if pg_restore --list "$BACKUP_DIR/cinacoin_${DATE}.dump" > /dev/null 2>&1; then
    echo "[$(date)] Backup verified: cinacoin_${DATE}.dump"
    SIZE=$(du -sh "$BACKUP_DIR/cinacoin_${DATE}.dump" | cut -f1)
    echo "[$(date)] Size: $SIZE"
else
    echo "[$(date)] ERROR: Backup verification failed!" >&2
    exit 1
fi

# Upload to S3 / MinIO (optional)
if command -v aws &> /dev/null && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
    aws s3 cp "$BACKUP_DIR/cinacoin_${DATE}.dump" \
      "s3://${BACKUP_S3_BUCKET}/postgres/cinacoin_${DATE}.dump" \
      --storage-class STANDARD_IA
    echo "[$(date)] Uploaded to S3: ${BACKUP_S3_BUCKET}"
fi

# Rotate old backups
find "$BACKUP_DIR" -name "cinacoin_*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete."
```

### Cron Schedule

```cron
# /etc/cron.d/cinacoin-backup

# Daily at 2:00 AM
0 2 * * * root /opt/cinacoin/scripts/backup.sh >> /var/log/cinacoin/backup.log 2>&1

# Weekly full backup on Sunday at 1:00 AM
0 1 * * 0 root /opt/cinacoin/scripts/backup-full.sh >> /var/log/cinacoin/backup-full.log 2>&1
```

### Point-in-Time Recovery (PITR)

```bash
# Enable WAL archiving in postgresql.conf
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
# archive_timeout = 60

# Restore to specific point
pg_restore -h localhost -U cinacoin -d cinacoin \
  --verbose \
  --no-owner \
  /var/backups/cinacoin/postgres/cinacoin_20260517_020000.dump

# Or restore to specific timestamp
pg_basebackup -D /var/lib/postgresql/recovery -Fp -Xs -P
# Edit recovery.signal and set recovery_target_time in postgresql.auto.conf
```

### Backup Monitoring

```bash
#!/bin/bash
# scripts/check-backup.sh — Verify recent backup exists

BACKUP_DIR="/var/backups/cinacoin/postgres"
MAX_AGE_HOURS=26

LATEST=$(find "$BACKUP_DIR" -name "cinacoin_*.dump" -printf '%T@ %p\n' | sort -n | tail -1)

if [ -z "$LATEST" ]; then
    echo "CRITICAL: No backups found!"
    exit 2
fi

LATEST_TIME=$(echo "$LATEST" | awk '{print $1}')
NOW=$(date +%s)
AGE=$(( (NOW - LATEST_TIME) / 3600 ))

if [ "$AGE" -gt "$MAX_AGE_HOURS" ]; then
    echo "WARNING: Latest backup is ${AGE}h old (threshold: ${MAX_AGE_HOURS}h)"
    exit 1
fi

echo "OK: Latest backup is ${AGE}h old"
exit 0
```

---

## Monitoring with Prometheus & Grafana

### Prometheus Configuration

```yaml
# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "cinacoin-api"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["api:3001"]
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  - job_name: "cinacoin-frontend"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["frontend:3000"]

  - job_name: "cinacoin-signaling"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["signaling:3002"]

  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]

  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]
```

### Alert Rules

```yaml
# config/alert_rules.yml
groups:
  - name: cinacoin-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High HTTP 5xx error rate on {{ $labels.instance }}"
          description: "{{ $value | humanizePercentage }} of requests are failing"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High p95 latency on {{ $labels.instance }}"
          description: "p95 latency is {{ $value }}s"

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL exporter cannot connect to database"

      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis exporter cannot connect"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Only {{ $value | humanizePercentage }} disk space remaining"

      - alert: WebRTCConnectionFailures
        expr: rate(webrtc_connection_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "WebRTC connection failures increasing"
          description: "{{ $value }} errors/sec on {{ $labels.instance }}"
```

### Grafana Dashboard (JSON)

```json
{
  "dashboard": {
    "title": "Cinacoin Enterprise Overview",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Active WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_connections_active",
            "legendFormat": "Active"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "timeseries",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "{{state}}"
          }
        ]
      },
      {
        "title": "WebRTC Active Calls",
        "type": "stat",
        "targets": [
          {
            "expr": "webrtc_active_peers",
            "legendFormat": "Active"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "{{instance}}"
          }
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "instance",
          "type": "query",
          "query": "label_values(up, instance)"
        }
      ]
    }
  }
}
```

### Grafana Datasource Provisioning

```yaml
# config/grafana-datasources/datasources.yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Node Exporter (Host Metrics)

```yaml
# Add to docker-compose.yml
node-exporter:
  image: prom/node-exporter:v1.7.0
  restart: unless-stopped
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  command:
    - '--path.procfs=/host/proc'
    - '--path.sysfs=/host/sys'
    - '--path.rootfs=/rootfs'
  ports:
    - "9100:9100"
  networks:
    - cinacoin-net
```

---

## Operational Runbook

### Health Checks

```bash
# Check all services
curl -sf https://app.cinacoin.com/health && echo "Frontend: OK"
curl -sf https://app.cinacoin.com/api/health && echo "API: OK"
curl -sf https://app.cinacoin.com/ws/health && echo "Signaling: OK"

# Check database
docker exec cinacoin-postgres-1 pg_isready -U cinacoin

# Check Redis
docker exec cinacoin-redis-1 redis-cli -a "$REDIS_PASSWORD" ping

# Check TURN
turnutils_uclient -u cinacoin -w "$TURN_PASSWORD" turn.cinacoin.com
```

### Rolling Update

```bash
# Docker Compose
docker compose pull
docker compose up -d --no-deps api frontend signaling
docker compose ps

# Kubernetes
kubectl set image deployment/cinacoin-api api=cinacoin/api:2.2.0 -n cinacoin
kubectl rollout status deployment/cinacoin-api -n cinacoin
```

### Emergency Rollback

```bash
# Docker Compose
docker compose up -d --no-deps api=cinacoin/api:2.0.0

# Kubernetes
kubectl rollout undo deployment/cinacoin-api -n cinacoin
```

### Log Access

```bash
# Docker Compose
docker compose logs -f --tail=100 api
docker compose logs -f --tail=100 signaling

# Kubernetes
kubectl logs -f deployment/cinacoin-api -n cinacoin --tail=100
kubectl logs -f deployment/cinacoin-signaling -n cinacoin --tail=100
```

---

*Last updated: 2026-05-17 | Cinacoin Enterprise Platform Team*
