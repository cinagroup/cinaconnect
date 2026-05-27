# Cinacoin — Cloudflare Workers Monitoring & Alerting Guide

## Overview

This document covers the complete monitoring and alerting setup for the 5 Cinacoin Cloudflare Workers services:

| Service | Worker Name | URL |
|---------|-------------|-----|
| RPC Proxy | `cinacoin-rpc-proxy` | `https://rpc-proxy.cinacoin.com` |
| Keys Server | `cinacoin-keys-server` | `https://keys-server.cinacoin.com` |
| Relay Server | `cinacoin-relay-server` | `wss://relay.cinacoin.com` |
| Notify Server | `cinacoin-notify-server` | `https://notify.cinacoin.com` |
| Push Server | `cinacoin-push-server` | `https://push.cinacoin.com` |

---

## 1. Cloudflare Workers Analytics

### 1.1 Built-in Analytics (No Setup Required)

Cloudflare Workers provides built-in analytics accessible via:

- **Dashboard**: https://dash.cloudflare.com → Workers & Pages → [Worker] → Analytics
- **API**: Use the GraphQL Analytics API for programmatic access

Key metrics available out of the box:
- **Requests** — Total request count over time
- **CPU Time** — Worker CPU consumption (limited to 10ms/30ms on free/paid plans)
- **Response Time** — P50/P90/P99 latency
- **Errors** — 4xx and 5xx error counts
- **Bandwidth** — Bytes in/out
- **Subrequests** — Internal `fetch()` calls

### 1.2 Query Analytics via GraphQL

```bash
# Get worker analytics for the last 24 hours
curl -X POST "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "
      query {
        viewer {
          accounts(filter: {accountTag: \"$CF_ACCOUNT_ID\"}) {
            workersInvocationsAdaptive(
              limit: 100
              filter: {
                scriptName: \"cinacoin-rpc-proxy\"
                date_gt: \"$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"
              }
            ) {
              sum {
                requests
                errors
                cpuTime
                subrequests
              }
              quantile {
                p50: responseTime
                p90: responseTime
                p99: responseTime
              }
              avg {
                responseTime
              }
              dimensions {
                datetimeHour
              }
            }
          }
        }
      }
    "
  }'
```

### 1.3 Script for Monitoring

Use `scripts/monitoring-health-check.sh` for periodic health checks of all services.

---

## 2. Alerts Configuration

### 2.1 Cloudflare Built-in Alerts

Configure these in the Cloudflare Dashboard → Workers & Pages → Manage → Alerting.

#### Error Rate Alerts

| Alert | Condition | Threshold | Notification |
|-------|-----------|-----------|--------------|
| High Error Rate (Warning) | 5xx error rate > 1% over 5 min | > 1% | Webhook/Slack |
| High Error Rate (Critical) | 5xx error rate > 5% over 5 min | > 5% | Webhook/Slack + Email |
| Any Error Spike | 10+ errors in 1 min | > 10/min | Webhook/Slack |

#### Latency Alerts

| Alert | Condition | Threshold | Notification |
|-------|-----------|-----------|--------------|
| High Latency (Warning) | P95 > 500ms over 5 min | > 500ms | Webhook/Slack |
| High Latency (Critical) | P95 > 2000ms over 5 min | > 2000ms | Webhook/Slack + Email |
| Timeout Spike | > 10 requests hitting CPU limit/min | > 10/min | Webhook/Slack |

#### Invocation Alerts

| Alert | Condition | Threshold | Notification |
|-------|-----------|--------------|
| Invocation Volume Drop | Requests < 10% of baseline for 15 min | < 10% of avg | Webhook/Slack |
| Invocation Spike | Requests > 300% of baseline for 5 min | > 300% of avg | Webhook/Slack |
| CPU Time Exhaustion | > 80% of CPU budget used in 5 min | > 80% | Webhook/Slack |

### 2.2 Configure Alerts via API

```bash
# Create a webhook notification endpoint
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/alerting/v3/endpoints" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Webhook",
    "type": "webhooks",
    "settings": {
      "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    }
  }'

# Create alert policy for high error rate
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/alerting/v3/policies" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Worker High Error Rate",
    "alert_type": "workers_alerts",
    "enabled": true,
    "filters": {
      "select": "sum",
      "where": {
        "scriptName": "cinacoin-rpc-proxy",
        "status": "5xx"
      },
      "threshold": 100,
      "timeSpan": "5m"
    },
    "mechanisms": [
      {
        "id": "<webhook-endpoint-id>",
        "type": "webhook"
      }
    ]
  }'
```

### 2.3 Alert Policy Configuration

See `deploy/monitoring/cf-alerts.json` for the complete alert definitions in machine-readable format.

---

## 3. Log Forwarding Setup

### 3.1 Workers Logpush

Workers can forward logs to external services via Logpush:

```bash
# Create a Logpush job to send worker logs to a remote destination
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/logpush/jobs" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cinacoin-workers-logpush",
    "logpull_options": "fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestURI,EdgeEndTimestamp,EdgeResponseBytes,EdgeResponseStatus,EdgeStartTimestamp,RayID,ScriptName,WorkerCPUTime,WorkerStatus",
    "destination_conf": "s3://cinacoin-logs/workers/{DATE}?region=auto&access-key-id=$S3_ACCESS_KEY&secret-access-key=$S3_SECRET_KEY",
    "dataset": "workers_trace_events",
    "enabled": true,
    "filter": "{\"where\": {\"scriptName\": {\"in\": [\"cinacoin-rpc-proxy\",\"cinacoin-keys-server\",\"cinacoin-relay-server\",\"cinacoin-notify-server\",\"cinacoin-push-server\"]}}}"
  }'
```

### 3.2 Supported Destinations

| Destination | Config Format | Use Case |
|-------------|--------------|----------|
| AWS S3 / R2 | `s3://bucket/path?...` | Long-term log storage |
| Google Cloud Storage | `gs://bucket/path?...` | GCP analytics pipelines |
| Datadog | `datadog://endpoint` | Full observability platform |
| Splunk | `splunk://endpoint?...` | Enterprise log management |
| HTTPS Endpoint | `https://host/path` | Custom webhook ingestion |
| Sumo Logic | `sumologic://endpoint` | Cloud log analytics |

### 3.3 Structured Logging in Workers

Add structured logging to your workers for better log analysis:

```typescript
// Example: Add structured logs to your worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now()
    const rayId = request.headers.get('cf-ray-id') ?? 'unknown'

    try {
      const response = await handleRequest(request, env)

      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        rayId,
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        duration_ms: Date.now() - startTime,
        scriptName: 'cinacoin-rpc-proxy'
      }))

      return response
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        rayId,
        method: request.method,
        path: new URL(request.url).pathname,
        error: String(error),
        duration_ms: Date.now() - startTime,
        scriptName: 'cinacoin-rpc-proxy'
      }))

      return new Response('Internal Server Error', { status: 500 })
    }
  }
}
```

---

## 4. Metrics Dashboards

### 4.1 Cloudflare Workers Dashboard

Use the dashboard template at `deploy/monitoring/dashboards/cf-workers-dashboard.json` to create a custom dashboard in the Cloudflare Dashboard.

### 4.2 Dashboard Widgets

| Widget | Metric | Time Range | Description |
|--------|--------|------------|-------------|
| Total Requests | `sum(requests)` | 24h | Total invocations across all services |
| Error Rate | `sum(errors) / sum(requests)` | 24h | 5xx error percentage |
| P95 Latency | `quantile(0.95, responseTime)` | 24h | 95th percentile response time |
| CPU Time | `sum(cpuTime)` | 24h | Total CPU consumption |
| Requests by Service | `sum(requests)` grouped by `scriptName` | 24h | Traffic distribution |
| Errors by Service | `sum(errors)` grouped by `scriptName` | 24h | Error distribution |
| Subrequest Count | `sum(subrequests)` | 24h | External API call volume |
| Bandwidth | `sum(bytes)` | 24h | Data transfer volume |

### 4.3 Grafana (Alternative)

For teams using Grafana, existing dashboards are in `deploy/monitoring/grafana/dashboards/`:
- `rpc-dashboard.json` — RPC Proxy metrics
- `relay-dashboard.json` — Relay Server metrics
- `cost-dashboard.json` — Cost tracking

### 4.4 Quick Dashboard via API

```bash
# Create a custom dashboard view
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/dashboards" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cinacoin Workers — Production",
    "widgets": [
      {
        "title": "Requests by Service (24h)",
        "query": "sum(requests) by scriptName",
        "visualization": "bar",
        "time_range": "24h"
      },
      {
        "title": "Error Rate by Service (24h)",
        "query": "sum(errors) / sum(requests) by scriptName",
        "visualization": "line",
        "time_range": "24h"
      },
      {
        "title": "P95 Latency (24h)",
        "query": "quantile(0.95, responseTime) by scriptName",
        "visualization": "line",
        "time_range": "24h"
      },
      {
        "title": "CPU Time (24h)",
        "query": "sum(cpuTime) by scriptName",
        "visualization": "area",
        "time_range": "24h"
      }
    ]
  }'
```

---

## 5. Automated Monitoring (CI/CD)

### 5.1 GitHub Actions Workflow

The `.github/workflows/monitoring.yml` workflow runs:
- **Scheduled health checks** every 5 minutes
- **Alert notifications** to Slack/webhook when services are down
- **Weekly monitoring reports** every Monday at 09:00 UTC

### 5.2 Required Secrets

Set these in your GitHub repository → Settings → Secrets and variables:

| Secret | Description |
|--------|-------------|
| `MONITORING_WEBHOOK_URL` | Slack/incoming webhook URL for alerts |
| `CF_API_TOKEN` | Cloudflare API token (for GraphQL queries) |
| `CF_ACCOUNT_ID` | Cloudflare account ID |

---

## 6. Runbook

### Service Down Response

1. **Check status**: `bash scripts/monitoring-health-check.sh`
2. **Check Cloudflare status page**: https://www.cloudflarestatus.com/
3. **Check worker logs**: `wrangler tail <worker-name>`
4. **Redeploy if needed**: `./deploy/deploy-all.sh -s <service>`

### High Error Rate Response

1. Check error logs for the affected service
2. Review recent deployments: `wrangler deployments list`
3. Rollback if needed: `wrangler rollback -s <worker-name>`
4. Check upstream dependencies (blockchain nodes, external APIs)

### High Latency Response

1. Check CPU time usage — may need to optimize worker code
2. Check subrequest latency — upstream services may be slow
3. Consider enabling caching (KV/R2) for frequent requests
4. Review D1 query performance if applicable

---

## 7. Scripts Reference

| Script | Purpose | Trigger |
|--------|---------|---------|
| `scripts/monitoring-health-check.sh` | Check all 5 services, output JSON report | CI/CD, cron, manual |
| `scripts/monitoring-alert.sh` | Send alerts to webhook/Slack | Called by health check |
| `scripts/check-cloudflare-workers.sh` | Simple curl-based health check | Manual |
| `deploy/check-health.sh` | Detailed health check with retries | Manual, staging checks |

---

*Last updated: 2026-05-18*
