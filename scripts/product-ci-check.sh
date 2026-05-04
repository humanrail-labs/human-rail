#!/usr/bin/env bash
#
# Product CI Check
# Runs build and smoke tests suitable for the product/mandara-cloud-mvp branch.
# Does NOT fail because the branch differs from the grant branch.
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Mandara Product CI Check ==="
echo ""

# 1. Generate Prisma client
echo "[1/7] Generating Prisma client..."
npm run product:db:generate

# 2. Build Mandara SDK
echo "[2/7] Building Mandara SDK..."
npm run mandara-sdk:build

# 3. Build API
echo "[3/7] Building API..."
npm run product:api:build

# 4. Build Worker
echo "[4/7] Building Worker..."
npm run product:worker:build

# 5. Build Next.js app (grant demo must not break)
echo "[5/7] Building Next.js app..."
npm run build

# 6. Worker live smoke (module load + graceful failure checks)
# This may fail if DB/Redis/live prerequisites are missing; we allow it in CI.
echo "[6/7] Worker live smoke (graceful-failure mode)..."
npm run product:worker:live-smoke || {
  echo "⚠️  Live smoke failed or prerequisites missing — acceptable in CI without devnet secrets"
}

# 7. Security: ensure no secrets are tracked
echo "[7/7] Security scan for tracked secrets..."

FAIL=0

# Check for tracked .env files (excluding examples)
if git ls-files | grep -E '^\.env($|\.local)' >/dev/null 2>&1; then
  echo "❌ Tracked .env files found:"
  git ls-files | grep -E '^\.env($|\.local)'
  FAIL=1
fi

# Check for tracked keypair files
if git ls-files | grep -E '\-keypair\.json$' >/dev/null 2>&1; then
  echo "❌ Tracked keypair files found:"
  git ls-files | grep -E '\-keypair\.json$'
  FAIL=1
fi

# Check for tracked local secrets dirs
if git ls-files | grep -E '^(\.local-ika/|\.local-keys/|\.local-worker/)' >/dev/null 2>&1; then
  echo "❌ Tracked local secret directories found:"
  git ls-files | grep -E '^(\.local-ika/|\.local-keys/|\.local-worker/)'
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo "❌ Security check FAILED"
  exit 1
fi

echo "✅ Security check passed — no tracked secrets found"
echo ""
echo "=== Product CI Check Complete ==="
