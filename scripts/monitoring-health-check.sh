#!/usr/bin/env bash
# monitoring-health-check.sh — JSON health check for all 5 CinaCoin Cloudflare Workers
# Outputs a structured JSON report suitable for CI/CD, cron, or alerting scripts.
# Usage: bash monitoring-health-check.sh [--json] [--timeout SECS] [--retries N]

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────
TIMEOUT=10
RETRIES=3
JSON_OUTPUT=false

# ── Parse args ───────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)       JSON_OUTPUT=true; shift ;;
    --timeout)    TIMEOUT="$2";       shift 2 ;;
    --retries)    RETRIES="$2";       shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--json] [--timeout SECS] [--retries N]"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Service definitions ─────────────────────────────────────────
# Name|URL|Protocol
SERVICES=(
  "rpc-proxy|https://rpc-proxy.cinacoin.com/health|https"
  "keys-server|https://keys-server.cinacoin.com/health|https"
  "relay-server|https://relay.cinacoin.com/health|https"
  "notify-server|https://notify.cinacoin.com/health|https"
  "push-server|https://push.cinacoin.com/health|https"
)

# ── Health check function ───────────────────────────────────────
check_service() {
  local name="$1"
  local url="$2"
  local attempt=0
  local http_code="000"
  local response_time_ms=0
  local status="unhealthy"
  local error_msg=""

  while [[ $attempt -lt $RETRIES ]]; do
    attempt=$((attempt + 1))

    # Capture HTTP status code and response time
    local start_ms=$(( $(date +%s%N) / 1000000 ))
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      --connect-timeout "$TIMEOUT" \
      --max-time "$TIMEOUT" \
      "$url" 2>/dev/null) || http_code="000"
    local end_ms=$(( $(date +%s%N) / 1000000 ))
    response_time_ms=$((end_ms - start_ms))

    if [[ "$http_code" =~ ^[23][0-9][0-9]$ ]]; then
      status="healthy"
      error_msg=""
      break
    fi

    error_msg="HTTP $http_code"
    if [[ $attempt -lt $RETRIES ]]; then
      sleep 1
    fi
  done

  # Build JSON entry
  if [[ "$status" == "healthy" ]]; then
    printf '{"name":"%s","url":"%s","status":"healthy","http_code":%s,"response_time_ms":%d,"attempts":%d,"error":""}' \
      "$name" "$url" "$http_code" "$response_time_ms" "$attempt"
  else
    printf '{"name":"%s","url":"%s","status":"unhealthy","http_code":%s,"response_time_ms":%d,"attempts":%d,"error":"%s"}' \
      "$name" "$url" "$http_code" "$response_time_ms" "$attempt" "$error_msg"
  fi
}

# ── Run checks ──────────────────────────────────────────────────
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SERVICES_JSON=()
HEALTHY_COUNT=0
UNHEALTHY_COUNT=0

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name url protocol <<< "$entry"

  if [[ "$JSON_OUTPUT" != true ]]; then
    echo -n "Checking $name... "
  fi

  result=$(check_service "$name" "$url")
  SERVICES_JSON+=("$result")

  svc_status=$(echo "$result" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [[ "$svc_status" == "healthy" ]]; then
    HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    [[ "$JSON_OUTPUT" != true ]] && echo "✅ healthy"
  else
    UNHEALTHY_COUNT=$((UNHEALTHY_COUNT + 1))
    [[ "$JSON_OUTPUT" != true ]] && echo "❌ unhealthy"
  fi
done

# ── Build full report ───────────────────────────────────────────
TOTAL=${#SERVICES[@]}
if [[ $UNHEALTHY_COUNT -eq 0 ]]; then
  OVERALL_STATUS="healthy"
else
  OVERALL_STATUS="unhealthy"
fi

# Construct services array
services_array=""
for i in "${!SERVICES_JSON[@]}"; do
  if [[ $i -gt 0 ]]; then
    services_array="$services_array,"
  fi
  services_array="$services_array${SERVICES_JSON[$i]}"
done

REPORT=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "overall_status": "$OVERALL_STATUS",
  "summary": {
    "total": $TOTAL,
    "healthy": $HEALTHY_COUNT,
    "unhealthy": $UNHEALTHY_COUNT
  },
  "services": [$services_array]
}
EOF
)

# ── Output ──────────────────────────────────────────────────────
if [[ "$JSON_OUTPUT" == true ]]; then
  echo "$REPORT"
else
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo " CinaCoin Health Check Report"
  echo "═══════════════════════════════════════════════════════"
  echo " Timestamp:  $TIMESTAMP"
  echo " Overall:    $OVERALL_STATUS"
  echo " Healthy:    $HEALTHY_COUNT / $TOTAL"
  echo " Unhealthy:  $UNHEALTHY_COUNT / $TOTAL"
  echo "═══════════════════════════════════════════════════════"
  echo ""

  for entry in "${SERVICES_JSON[@]}"; do
    svc_name=$(echo "$entry" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    svc_status=$(echo "$entry" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    svc_http=$(echo "$entry" | grep -o '"http_code":[0-9]*' | cut -d: -f2)
    svc_rt=$(echo "$entry" | grep -o '"response_time_ms":[0-9]*' | cut -d: -f2)
    svc_error=$(echo "$entry" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    svc_attempts=$(echo "$entry" | grep -o '"attempts":[0-9]*' | cut -d: -f2)

    if [[ "$svc_status" == "healthy" ]]; then
      echo "  ✅ $svc_name — HTTP $svc_http (${svc_rt}ms, $svc_attempts attempts)"
    else
      echo "  ❌ $svc_name — HTTP $svc_error (${svc_rt}ms, $svc_attempts attempts)"
    fi
  done

  echo ""
fi

# ── Exit code ───────────────────────────────────────────────────
if [[ $UNHEALTHY_COUNT -gt 0 ]]; then
  exit 1
fi
exit 0
