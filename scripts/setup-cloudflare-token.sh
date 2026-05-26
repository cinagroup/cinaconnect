#!/bin/bash
set -e

# Cloudflare Token Setup Script
# Sets up Cloudflare API token for wrangler deployment

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"  # Set via environment or .env

echo "Setting up Cloudflare API token..."

# Configure wrangler to use the token
mkdir -p ~/.config/wrangler
cat > ~/.config/wrangler/default.toml <<EOF
api_token = "$CLOUDFLARE_API_TOKEN"
EOF

echo "✓ Cloudflare API token configured in ~/.config/wrangler/default.toml"
echo ""
echo "Token configured. You can now run deployment commands:"
echo "  ./deploy/deploy-all.sh"
echo "  ./deploy/deploy-cloudflare-workers.sh"
echo ""
echo "Note: To list your Cloudflare accounts, run:"
echo "  wrangler whoami"