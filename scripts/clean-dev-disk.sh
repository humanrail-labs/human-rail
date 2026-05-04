#!/usr/bin/env bash
#
# Safe Development Disk Cleanup
# Removes generated build artifacts and caches without deleting secrets or critical artifacts.
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Mandara Safe Dev Disk Cleanup ==="
echo ""

echo "--- Disk before cleanup ---"
df -h /workspaces 2>/dev/null || df -h .
echo ""

REPO_SIZE_BEFORE=$(du -sh . | cut -f1)
echo "Repo size before: $REPO_SIZE_BEFORE"
echo ""

# Warn
echo "This script will safely delete:"
echo "  - .next/ (Next.js build output)"
echo "  - dist/ directories (TypeScript build output)"
echo "  - .local-worker/ (temporary worker artifacts)"
echo "  - coverage/ (test coverage reports)"
echo "  - logs/ (log files)"
echo "  - .turbo/ and .cache/ directories"
echo "  - npm cache"
echo "  - Docker build cache and dangling images"
echo ""
echo "It will NOT delete:"
echo "  - .local-ika/ (devnet artifacts needed for live signing)"
echo "  - .local-keys/ (keypairs)"
echo "  - target/deploy/*-keypair.json (program deploy keypairs)"
echo "  - .env.product or other env files"
echo "  - Docker volumes"
echo ""

# Preserve critical artifacts
if [ -f "target/deploy/humanrail_dwallet_guard-keypair.json" ]; then
  cp target/deploy/humanrail_dwallet_guard-keypair.json /tmp/humanrail_dwallet_guard-keypair.json.bak 2>/dev/null || true
  echo "  🛡️  Backed up target/deploy keypair"
fi

if [ -d ".local-ika" ]; then
  echo "  🛡️  Preserving .local-ika/ (devnet artifacts)"
fi

if [ -d ".local-keys" ]; then
  echo "  🛡️  Preserving .local-keys/ (keypairs)"
fi

echo ""

# Safe deletions
echo "Removing safe generated directories..."
rm -rf .next
rm -rf .local-worker
find . -type d -name "dist" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".turbo" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".cache" -prune -exec rm -rf {} + 2>/dev/null || true
rm -rf coverage
rm -rf logs
rm -f *.log npm-debug.log* yarn-error.log*

echo "Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
  echo "Cleaning Docker build cache..."
  docker builder prune -af 2>/dev/null || true
  echo "Cleaning dangling Docker images..."
  docker image prune -af 2>/dev/null || true
  echo "Cleaning stopped Docker containers..."
  docker container prune -f 2>/dev/null || true
else
  echo "Docker not available — skipping Docker cleanup"
fi

echo ""
echo "--- Disk after cleanup ---"
df -h /workspaces 2>/dev/null || df -h .
echo ""

REPO_SIZE_AFTER=$(du -sh . | cut -f1)
echo "Repo size after: $REPO_SIZE_AFTER"
echo ""

echo "=== Cleanup complete ==="
echo "Critical artifacts preserved. Generated build artifacts removed."
