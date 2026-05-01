#!/usr/bin/env bash
set -euo pipefail

# Ensure Solana/Anchor tools are discoverable
export PATH="/home/codespace/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$PATH"

EXPECTED_PROGRAM_ID="Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2"

echo "========================================"
echo "HumanRail dWallet Guard — Build Check"
echo "========================================"
echo ""

echo "Tool versions:"
echo "  rustc:    $(rustc --version)"
echo "  cargo:    $(cargo --version)"
echo "  solana:   $(solana --version 2>/dev/null || echo 'not in PATH')"
echo "  anchor:   $(anchor --version 2>/dev/null || echo 'not in PATH')"
echo "  avm:      $(avm --version 2>/dev/null || echo 'not in PATH')"
echo ""

echo "Program ID (from keypair):"
if [ -f target/deploy/humanrail_dwallet_guard-keypair.json ]; then
  solana-keygen pubkey target/deploy/humanrail_dwallet_guard-keypair.json
else
  echo "  (no keypair found)"
fi
echo ""

echo "declare_id! in source:"
grep "declare_id" programs/humanrail-dwallet-guard/src/lib.rs || true
echo ""

echo "SBF build check:"
if [ -f target/deploy/humanrail_dwallet_guard.so ]; then
  ls -la target/deploy/humanrail_dwallet_guard.so
else
  echo "  (no .so found)"
fi
echo ""

echo "IDL check:"
if [ -f target/idl/humanrail_dwallet_guard.json ]; then
  echo "  IDL generated: target/idl/humanrail_dwallet_guard.json ($(wc -c < target/idl/humanrail_dwallet_guard.json) bytes)"
else
  echo "  (no IDL found)"
fi
echo ""

echo "Running anchor build (no deploy)..."
cd "$(dirname "$0")/.."
anchor build 2>&1 | tail -5 || true
echo ""

echo "Post-build keypair verification:"
if [ -f target/deploy/humanrail_dwallet_guard-keypair.json ]; then
  ACTUAL_PUBKEY=$(solana-keygen pubkey target/deploy/humanrail_dwallet_guard-keypair.json)
  if [ "$ACTUAL_PUBKEY" != "$EXPECTED_PROGRAM_ID" ]; then
    echo "  ERROR: Keypair mismatch after build!"
    echo "    Expected: $EXPECTED_PROGRAM_ID"
    echo "    Actual:   $ACTUAL_PUBKEY"
    if [ -f .local-keys/humanrail_dwallet_guard-keypair.json ]; then
      echo "  Restoring from .local-keys backup..."
      cp .local-keys/humanrail_dwallet_guard-keypair.json target/deploy/humanrail_dwallet_guard-keypair.json
      chmod 600 target/deploy/humanrail_dwallet_guard-keypair.json
      RESTORED=$(solana-keygen pubkey target/deploy/humanrail_dwallet_guard-keypair.json)
      if [ "$RESTORED" = "$EXPECTED_PROGRAM_ID" ]; then
        echo "  Restored successfully."
      else
        echo "  FATAL: Backup keypair also mismatch."
        exit 1
      fi
    else
      echo "  FATAL: No backup keypair found in .local-keys/"
      exit 1
    fi
  else
    echo "  Keypair matches expected program ID."
  fi
else
  echo "  (no keypair found after build)"
fi
echo ""

echo "========================================"
echo "Check complete"
echo "========================================"
