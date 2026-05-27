#!/usr/bin/env bash
# monitoring-alert.sh — Send alerts to webhook/Slack when CinaCoin
# Cloudflare Workers services are unhealthy.
#
# Usage:
#   bash monitoring-alert.sh \
#     --webhook-url "https://hooks.slack.com/services/xxx/yyy/zzz" \
#     --level critical \
#     --report health-report.json
#
# Or with inline data:
#   bash monitoring-alert.sh \
#     --webhook-url "https://hooks.slack.com/services/xxx/yyy/zzz" \
#     --level warning \
#     --message "High latency detected on RPC Proxy"

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────
WEBHOOK_URL=""
LEVEL="warning"        # warning | critical
REPORT_FILE=""
MESSAGE=""
SERVICE_NAME=""
ENVIRONMENT="production"

# ── Parse args ───────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --webhook-url) WEBHOOK_URL="$2";    shift 2 ;;
    --level)       LEVEL="$2";          shift 2 ;;
    --report)      REPORT_FILE="$2";    shift 2 ;;
    --message)     MESSAGE="$2";        shift 2 ;;
    --service)     SERVICE_NAME="$2";   shift 2 ;;
    --environment) ENVIRONMENT="$2";    shift 2 ;;
    -h|--help)
      echo "Usage: $0 --webhook-url URL [--level warning|critical] [--report FILE] [--message TEXT] [--service NAME] [--environment ENV]"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$WEBHOOK_URL" ]]; then
  echo "Error: --webhook-url is required" >&2
  exit 1
fi

# ── Color / icon helpers ─────────────────────────────────────────
if [[ "$LEVEL" == "critical" ]]; then
  ALERT_EMOJI="🚨"
  ALERT_COLOR="#FF0000"
  ALERT_LABEL="CRITICAL"
elif [[ "$LEVEL" == "warning" ]]; then
  ALERT_EMOJI="⚠️"
  ALERT_COLOR="#FFA500"
  ALERT_LABEL="WARNING"
else
  ALERT_EMOJI="ℹ️"
  ALERT_COLOR="#808080"
  ALERT_LABEL="INFO"
fi

# ── Build alert payload ─────────────────────────────────────────
build_slack_payload() {
  local title="$1"
  local details="$2"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "$ALERT_EMOJI CinaCoin Monitoring Alert — $ALERT_LABEL",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Environment:*\n$ENVIRONMENT"
        },
        {
          "type": "mrkdwn",
          "text": "*Severity:*\n$ALERT_LABEL"
        },
        {
          "type": "mrkdwn",
          "text": "*Time:*\n$ts"
        },
        {
          "type": "mrkdwn",
          "text": "*Service:*\n${SERVICE_NAME:-All services}"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$title"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$details"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Dashboard",
            "emoji": true
          },
          "url": "https://dash.cloudflare.com"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Run Health Check",
            "emoji": true
          },
          "url": "https://github.com/cinacoin/cinacoin/actions/workflows/monitoring.yml"
        }
      ]
    }
  ]
}
EOF
}

build_generic_webhook_payload() {
  local title="$1"
  local details="$2"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  cat <<EOF
{
  "alert_level": "$ALERT_LABEL",
  "environment": "$ENVIRONMENT",
  "timestamp": "$ts",
  "service": "${SERVICE_NAME:-all}",
  "title": "$title",
  "details": "$details",
  "source": "cinacoin-monitoring",
  "runbook_url": "https://github.com/cinacoin/cinacoin/blob/main/deploy/monitoring.md"
}
EOF
}

# ── Detect webhook type from URL ─────────────────────────────────
is_slack_webhook() {
  [[ "$WEBHOOK_URL" == *"hooks.slack.com"* ]] || \
  [[ "$WEBHOOK_URL" == *"slack.com/services"* ]]
}

# ── Determine what to alert about ───────────────────────────────
if [[ -n "$REPORT_FILE" && -f "$REPORT_FILE" ]]; then
  # Parse from report file
  if command -v jq &>/dev/null; then
    OVERALL=$(jq -r '.overall_status' "$REPORT_FILE" 2>/dev/null || echo "unknown")
    UNHEALTHY_NAMES=$(jq -r '.services[] | select(.status != "healthy") | .name' "$REPORT_FILE" 2>/dev/null || echo "")
    UNHEALTHY_COUNT=$(jq '.summary.unhealthy' "$REPORT_FILE" 2>/dev/null || echo "0")
    TOTAL=$(jq '.summary.total' "$REPORT_FILE" 2>/dev/null || echo "0")

    if [[ -z "$SERVICE_NAME" ]]; then
      SERVICE_NAME=$(echo "$UNHEALTHY_NAMES" | tr '\n' ', ' | sed 's/,$//')
    fi

    TITLE="$UNHEALTHY_COUNT of $TOTAL CinaCoin services are unhealthy"

    DETAILS="The following services are down or unhealthy:\n"
    while IFS= read -r svc; do
      [[ -z "$svc" ]] && continue
      svc_status=$(jq -r --arg s "$svc" '.services[] | select(.name == $s) | .status' "$REPORT_FILE" 2>/dev/null)
      svc_error=$(jq -r --arg s "$svc" '.services[] | select(.name == $s) | .error' "$REPORT_FILE" 2>/dev/null)
      svc_url=$(jq -r --arg s "$svc" '.services[] | select(.name == $s) | .url' "$REPORT_FILE" 2>/dev/null)
      DETAILS="$DETAILS\n• \`$svc\` — $svc_error ($svc_url)"
    done <<< "$UNHEALTHY_NAMES"

    DETAILS="$DETAILS\n\nRun: \`bash scripts/monitoring-health-check.sh\` for a full report."
  else
    # No jq — use raw report content
    TITLE="Health check report available at $REPORT_FILE"
    DETAILS="Unable to parse report (jq not installed). See attached report."
  fi

elif [[ -n "$MESSAGE" ]]; then
  TITLE="$MESSAGE"
  DETAILS="Alert triggered by monitoring system."
else
  TITLE="CinaCoin service alert"
  DETAILS="No specific details provided."
fi

# ── Send alert ───────────────────────────────────────────────────
echo "$ALERT_EMOJI [$ALERT_LABEL] $TITLE"

if is_slack_webhook; then
  PAYLOAD=$(build_slack_payload "$TITLE" "$DETAILS")

  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>/dev/null) || response="000"

  if [[ "$response" =~ ^2[0-9][0-9]$ ]]; then
    echo "✅ Alert sent to Slack successfully (HTTP $response)"
    exit 0
  else
    echo "❌ Failed to send Slack alert (HTTP $response)" >&2
    exit 1
  fi

else
  # Generic webhook
  PAYLOAD=$(build_generic_webhook_payload "$TITLE" "$DETAILS")

  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>/dev/null) || response="000"

  if [[ "$response" =~ ^2[0-9][0-9]$ ]]; then
    echo "✅ Alert sent to webhook successfully (HTTP $response)"
    exit 0
  else
    echo "❌ Failed to send webhook alert (HTTP $response)" >&2
    exit 1
  fi
fi
