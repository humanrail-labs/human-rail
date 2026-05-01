#!/usr/bin/env bash
set -euo pipefail

# Ensure Solana tools are discoverable
export PATH="/home/codespace/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$PATH"

PROGRAM_ID="Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"
RPC_URL="https://api.devnet.solana.com"

echo "========================================"
echo "HumanRail dWallet Guard — Verify Deploy"
echo "========================================"
echo ""

echo "Program ID: $PROGRAM_ID"
echo "RPC:        $RPC_URL"
echo ""

# Fetch account info via RPC
echo "Fetching account info..."
ACCOUNT_INFO=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$PROGRAM_ID\",{\"encoding\":\"base64\",\"commitment\":\"confirmed\"}]}")

# Check for errors
if echo "$ACCOUNT_INFO" | grep -q '"error"'; then
  echo "ERROR: RPC returned an error"
  echo "$ACCOUNT_INFO" | python3 -m json.tool 2>/dev/null || echo "$ACCOUNT_INFO"
  exit 1
fi

# Check if account exists
VALUE=$(echo "$ACCOUNT_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('value','null'))" 2>/dev/null || echo "null")

if [ "$VALUE" = "null" ] || [ -z "$VALUE" ] || [ "$VALUE" = "None" ]; then
  echo "RESULT: Program is NOT deployed."
  echo "  Account $PROGRAM_ID does not exist on devnet."
  echo ""
  echo "To deploy, run:"
  echo "  bash scripts/deploy-dwallet-guard.sh"
  echo ""
  exit 1
fi

# Extract executable flag
EXECUTABLE=$(echo "$ACCOUNT_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('value',{}).get('executable','false'))" 2>/dev/null || echo "false")
LAMPORTS=$(echo "$ACCOUNT_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('value',{}).get('lamports',0))" 2>/dev/null || echo "0")
OWNER=$(echo "$ACCOUNT_INFO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('value',{}).get('owner',''))" 2>/dev/null || echo "")

echo "Account found on devnet:"
echo "  Lamports:    $LAMPORTS"
echo "  Executable:  $EXECUTABLE"
echo "  Owner:       $OWNER"
echo ""

if [ "$EXECUTABLE" = "True" ] || [ "$EXECUTABLE" = "true" ]; then
  echo "RESULT: Program is DEPLOYED and EXECUTABLE."
  echo ""
  echo "solana program show output:"
  solana program show "$PROGRAM_ID" --url devnet || true
  echo ""
  exit 0
else
  echo "RESULT: Account exists but is NOT executable."
  echo "  This should not happen for a deployed program."
  exit 1
fi
