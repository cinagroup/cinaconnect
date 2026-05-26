#!/bin/bash
# Quick health check script for all CinaConnect Cloudflare Workers

echo "🏥 CinaConnect Workers Health Check"
echo "===================================="
echo ""

SERVICES=(
  "RPC Proxy:cinaconnect-rpc-proxy"
  "Keys Server:cinaconnect-keys-server"
  "Relay Server:cinaconnect-relay-server"
  "Notify Server:cinaconnect-notify-server"
  "Push Server:cinaconnect-push-server"
)

FAILURES=0

for service in "${SERVICES[@]}"; do
  NAME="${service%%:*}"
  WORKER="${service##*:}"
  URL="https://${WORKER}.cinagroup.workers.dev/health"

  echo -n "$NAME... "
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  if [ "$RESPONSE" = "200" ]; then
    echo -e "\033[0;32m✓ OK\033[0m (HTTP $RESPONSE)"
  else
    echo -e "\033[0;31m✗ FAIL\033[0m (HTTP $RESPONSE)"
    FAILURES=$((FAILURES + 1))
  fi
done

echo ""
if [ $FAILURES -eq 0 ]; then
  echo "🎉 All services are healthy!"
else
  echo "⚠️  $FAILURES service(s) failed health check"
  exit 1
fi