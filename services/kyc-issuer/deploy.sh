#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

APP_NAME="humanrail-kyc-issuer"
REGION="cdg"

echo "=== Step 1: Create app (if not exists) ==="
fly apps create "$APP_NAME" --org personal 2>/dev/null || echo "App already exists"

echo ""
echo "=== Step 2: Create volume (if not exists) ==="
fly volumes create kyc_data --app "$APP_NAME" --region "$REGION" --size 1 --yes 2>/dev/null || echo "Volume already exists"

echo ""
echo "=== Step 3: Set secrets ==="
echo "You must set these secrets (one-time):"
echo ""
echo "  fly secrets set \\"
echo "    SOLANA_RPC_URL=\"https://devnet.helius-rpc.com/?api-key=YOUR_KEY\" \\"
echo "    VERIFF_API_KEY=\"your-veriff-api-key\" \\"
echo "    VERIFF_API_SECRET=\"your-veriff-api-secret\" \\"
echo "    ISSUER_KEYPAIR_JSON='[1,2,3,...your 64-byte secret key array...]' \\"
echo "    FRONTEND_ORIGIN=\"https://your-replit-app.replit.app\" \\"
echo "    --app $APP_NAME"
echo ""
read -p "Have you already set secrets? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Set secrets first, then re-run this script."
  exit 1
fi

echo ""
echo "=== Step 4: Deploy ==="
fly deploy --app "$APP_NAME" --region "$REGION"

echo ""
echo "=== Step 5: Verify ==="
sleep 5
curl -sf "https://$APP_NAME.fly.dev/health" && echo "" && echo "✅ Deployed and healthy!" || echo "❌ Health check failed — check logs: fly logs --app $APP_NAME"
