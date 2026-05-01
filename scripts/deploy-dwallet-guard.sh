#!/usr/bin/env bash
set -euo pipefail

# Ensure Solana/Anchor tools are discoverable
export PATH="/home/codespace/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$PATH"

EXPECTED_PROGRAM_ID="G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF"
KEYPAIR_FILE="target/deploy/humanrail_dwallet_guard-keypair.json"
SO_FILE="target/deploy/humanrail_dwallet_guard.so"
DEPLOYER_KEYPAIR="${HOME}/.config/solana/id.json"

echo "========================================"
echo "HumanRail dWallet Guard — Deploy"
echo "========================================"
echo ""

# 1. Check keypair exists
echo "1. Checking program keypair..."
if [ ! -f "$KEYPAIR_FILE" ]; then
  echo "ERROR: Keypair not found: $KEYPAIR_FILE"
  echo "The program ID cannot be deployed without the original keypair."
  exit 1
fi
echo "   Keypair found: $KEYPAIR_FILE"

# 2. Verify keypair pubkey matches expected program ID
echo "2. Verifying keypair pubkey..."
ACTUAL_PROGRAM_ID=$(solana-keygen pubkey "$KEYPAIR_FILE")
if [ "$ACTUAL_PROGRAM_ID" != "$EXPECTED_PROGRAM_ID" ]; then
  echo "ERROR: Keypair pubkey mismatch!"
  echo "  Expected: $EXPECTED_PROGRAM_ID"
  echo "  Actual:   $ACTUAL_PROGRAM_ID"
  exit 1
fi
echo "   Pubkey matches expected program ID: $EXPECTED_PROGRAM_ID"

# 3. Check deployer wallet
echo "3. Checking deployer wallet..."
solana config set --url devnet --keypair "$DEPLOYER_KEYPAIR" >/dev/null
DEPLOYER=$(solana address)
echo "   Deployer: $DEPLOYER"
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo "   Balance:  ${BALANCE} SOL"

# Minimum ~1.5 SOL needed for program deployment
REQUIRED_BALANCE="1.5"
if [ "$(echo "$BALANCE < $REQUIRED_BALANCE" | bc -l 2>/dev/null || awk "BEGIN{print ($BALANCE < $REQUIRED_BALANCE)?1:0}")" = "1" ]; then
  echo ""
  echo "ERROR: Insufficient devnet SOL for deployment."
  echo "  Required: ≥${REQUIRED_BALANCE} SOL"
  echo "  Actual:   ${BALANCE} SOL"
  echo ""
  echo "To fund the deployer wallet, run:"
  echo "  solana airdrop 2 --url devnet"
  echo ""
  echo "If the faucet is rate-limited, use:"
  echo "  https://faucet.solana.com/?address=${DEPLOYER}"
  echo ""
  exit 1
fi

# 4. Build
echo "4. Building program..."
anchor build

# 5. Verify .so exists
echo "5. Verifying build artifact..."
if [ ! -f "$SO_FILE" ]; then
  echo "ERROR: Build artifact not found: $SO_FILE"
  exit 1
fi
echo "   Artifact: $SO_FILE ($(wc -c < "$SO_FILE") bytes)"

# 6. Deploy
echo "6. Deploying to devnet..."
anchor deploy --provider.cluster devnet

# 7. Verify
echo "7. Verifying deployment..."
solana program show "$EXPECTED_PROGRAM_ID" --url devnet

echo ""
echo "========================================"
echo "Deploy complete"
echo "========================================"
