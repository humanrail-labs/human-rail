#!/usr/bin/env bash
set -euo pipefail

# Ensure Solana/Anchor tools are discoverable
export PATH="/home/codespace/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$PATH"

EXPECTED_PROGRAM_ID="Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"
DEFAULT_KEYPAIR="target/deploy/humanrail_dwallet_guard-keypair.json"
BACKUP_KEYPAIR=".local-keys/humanrail_dwallet_guard-keypair.json"
SO_FILE="target/deploy/humanrail_dwallet_guard.so"
DEPLOYER_KEYPAIR="${HOME}/.config/solana/id.json"

# Resolve keypair path with precedence:
# 1. DWALLET_GUARD_KEYPAIR_PATH env var
# 2. .local-keys backup (protected from cargo clean)
# 3. target/deploy default
if [ -n "${DWALLET_GUARD_KEYPAIR_PATH:-}" ]; then
  KEYPAIR_FILE="$DWALLET_GUARD_KEYPAIR_PATH"
elif [ -f "$BACKUP_KEYPAIR" ]; then
  KEYPAIR_FILE="$BACKUP_KEYPAIR"
else
  KEYPAIR_FILE="$DEFAULT_KEYPAIR"
fi

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
echo "   Keypair: $KEYPAIR_FILE"

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

# 3. If using backup keypair, ensure target/deploy has a copy for anchor
echo "3. Ensuring target/deploy keypair..."
if [ "$KEYPAIR_FILE" != "$DEFAULT_KEYPAIR" ] && [ ! -f "$DEFAULT_KEYPAIR" ]; then
  echo "   Restoring keypair from backup to target/deploy..."
  cp "$KEYPAIR_FILE" "$DEFAULT_KEYPAIR"
  chmod 600 "$DEFAULT_KEYPAIR"
fi

# 4. Check deployer wallet
echo "4. Checking deployer wallet..."
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

# 5. Build
echo "5. Building program..."
anchor build

# 6. Verify .so exists
echo "6. Verifying build artifact..."
if [ ! -f "$SO_FILE" ]; then
  echo "ERROR: Build artifact not found: $SO_FILE"
  exit 1
fi
echo "   Artifact: $SO_FILE ($(wc -c < "$SO_FILE") bytes)"

# 7. Post-build keypair verification
echo "7. Post-build keypair verification..."
POST_BUILD_PUBKEY=$(solana-keygen pubkey "$DEFAULT_KEYPAIR")
if [ "$POST_BUILD_PUBKEY" != "$EXPECTED_PROGRAM_ID" ]; then
  echo "ERROR: Build overwrote the keypair!"
  echo "  Expected: $EXPECTED_PROGRAM_ID"
  echo "  Actual:   $POST_BUILD_PUBKEY"
  echo "  Restoring from backup..."
  cp "$KEYPAIR_FILE" "$DEFAULT_KEYPAIR"
  chmod 600 "$DEFAULT_KEYPAIR"
  RESTORED_PUBKEY=$(solana-keygen pubkey "$DEFAULT_KEYPAIR")
  if [ "$RESTORED_PUBKEY" != "$EXPECTED_PROGRAM_ID" ]; then
    echo "FATAL: Backup keypair also mismatch. Aborting."
    exit 1
  fi
  echo "   Restored successfully."
else
  echo "   Keypair unchanged."
fi

# 8. Deploy
echo "8. Deploying to devnet..."
anchor deploy --provider.cluster devnet

# 9. Verify
echo "9. Verifying deployment..."
solana program show "$EXPECTED_PROGRAM_ID" --url devnet

echo ""
echo "========================================"
echo "Deploy complete"
echo "========================================"
echo ""
echo "⚠️  Preserve .local-keys/humanrail_dwallet_guard-keypair.json locally."
echo "   It is ignored by git and required for upgrades/deploys."
