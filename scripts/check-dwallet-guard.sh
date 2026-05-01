#!/usr/bin/env bash
set -euo pipefail

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

echo "========================================"
echo "Check complete"
echo "========================================"
