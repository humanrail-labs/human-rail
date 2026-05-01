#!/usr/bin/env bash
set -euo pipefail

# HumanRail Ika dWallet DKG — Phase 5B
# Creates a real Ika dWallet on Solana devnet via gRPC DKG.
#
# Usage:
#   npm run ika:create-dwallet
#   npm run ika:create-dwallet -- --curve secp256k1
#   npm run ika:create-dwallet -- --keypair ~/.config/solana/id.json
#
# Pre-alpha disclaimer: Ika uses a single mock signer, not real MPC.
# Devnet data is wiped periodically. Not production custody.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLI_MANIFEST="${REPO_ROOT}/tools/ika-dkg-cli/Cargo.toml"

# Check cargo
if ! command -v cargo &>/dev/null; then
  echo "ERROR: cargo not found. Install Rust: https://rustup.rs"
  exit 1
fi

# Check keypair
KEYPAIR="${HOME}/.config/solana/id.json"
if [ ! -f "$KEYPAIR" ]; then
  echo "ERROR: Solana keypair not found at $KEYPAIR"
  echo "Set one up with: solana-keygen new"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  HumanRail Ika dWallet DKG — Phase 5B"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "CLI manifest: ${CLI_MANIFEST}"
echo "Keypair:      ${KEYPAIR}"
echo ""

# Ensure protoc is available for ika-grpc build
if [ -z "${PROTOC:-}" ]; then
  if [ -x /home/codespace/.local/protoc/bin/protoc ]; then
    export PROTOC=/home/codespace/.local/protoc/bin/protoc
  elif command -v protoc &>/dev/null; then
    export PROTOC="$(command -v protoc)"
  fi
fi

if [ -z "${PROTOC:-}" ] || [ ! -x "$PROTOC" ]; then
  echo "ERROR: protoc not found. Install it first:"
  echo "  curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v30.2/protoc-30.2-linux-x86_64.zip"
  echo "  unzip -o protoc-30.2-linux-x86_64.zip -d ~/.local/protoc"
  exit 1
fi

echo "protoc:       $PROTOC"

# Build and run
# shellcheck disable=SC2068
cargo run --manifest-path "$CLI_MANIFEST" -- create-dwallet \
  --keypair "$KEYPAIR" \
  --rpc-url https://api.devnet.solana.com \
  --grpc-url https://pre-alpha-dev-1.ika.ika-network.net:443 \
  --output "${REPO_ROOT}/.local-ika/dwallet.json" \
  $@

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Next steps"
echo "═══════════════════════════════════════════════════════════"
echo "  1. Inspect the dWallet:"
echo "     npm run devnet:inspect-ika"
echo ""
echo "  2. Transfer authority to Guard CPI PDA (Phase 5C):"
echo "     (coming next)"
echo ""
echo "  3. The artifact is stored in .local-ika/dwallet.json"
echo "     This file is gitignored and needed for Phase 5C/5D."
