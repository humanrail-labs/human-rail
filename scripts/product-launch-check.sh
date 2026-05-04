#!/usr/bin/env bash
#
# Product Launch Readiness Check
# Validates that all P10 launch artifacts exist and CI passes.
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════════════"
echo "  Mandara Product Launch Check"
echo "═══════════════════════════════════════════════════════════"
echo ""

FAIL=0

# 1. CI and readiness
echo "[1/5] Running product CI..."
bash scripts/product-ci-check.sh || { echo "❌ product:ci failed"; FAIL=1; }

echo ""
echo "[2/5] Running product readiness..."
bash scripts/product-readiness-check.sh || { echo "❌ product:readiness failed"; FAIL=1; }

# 3. Launch docs exist
echo ""
echo "[3/5] Checking launch docs..."
LAUNCH_DOCS=(
  docs/PRODUCT_LAUNCH_PACKAGE.md
  docs/LANDING_PAGE_COPY.md
  docs/DEVELOPER_ONBOARDING.md
  docs/CUSTOMER_DEMO_SCRIPT.md
  docs/PRICING_HYPOTHESIS.md
  docs/PRODUCT_FINAL_AUDIT.md
  docs/BETA_LAUNCH_CHECKLIST.md
)

for doc in "${LAUNCH_DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✅ $doc"
  else
    echo "  ❌ $doc missing"
    FAIL=1
  fi
done

# 4. Scripts exist
echo ""
echo "[4/5] Checking scripts..."
for script in scripts/clean-dev-disk.sh scripts/product-launch-check.sh; do
  if [ -f "$script" ] && [ -x "$script" ]; then
    echo "  ✅ $script"
  else
    echo "  ❌ $script missing or not executable"
    FAIL=1
  fi
done

# 5. Security: no tracked secrets
echo ""
echo "[5/5] Security scan..."
SECRET_FAIL=0

if git ls-files | grep -E '^\.env($|\.local)' >/dev/null 2>&1; then
  echo "  ❌ Tracked .env files found"
  SECRET_FAIL=1
fi

if git ls-files | grep -E '\-keypair\.json$' >/dev/null 2>&1; then
  echo "  ❌ Tracked keypair files found"
  SECRET_FAIL=1
fi

if git ls-files | grep -E '^(\.local-ika/|\.local-keys/|\.local-worker/)' >/dev/null 2>&1; then
  echo "  ❌ Tracked local secret directories found"
  SECRET_FAIL=1
fi

if [ "$SECRET_FAIL" -eq 0 ]; then
  echo "  ✅ No tracked secrets"
else
  FAIL=1
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
if [ "$FAIL" -eq 1 ]; then
  echo "  ❌ Product Launch Check FAILED"
  echo "═══════════════════════════════════════════════════════════"
  exit 1
fi

echo "  ✅ Product Launch Check PASSED"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Go/no-go summary from audit
echo "Go/No-Go Summary (from PRODUCT_FINAL_AUDIT.md):"
echo "  ✅ Internal devnet beta: GO"
echo "  ⬜ External closed beta: NO-GO (needs auth, encrypted webhooks, rate limits, Sentry)"
echo "  ⬜ Open beta: NO-GO"
echo "  ⬜ Mainnet: NO-GO"
echo ""
