#!/usr/bin/env bash
#
# Product Readiness Check
# Verifies that all artifacts required for devnet beta deployment exist.
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Mandara Product Readiness Check ==="
echo ""

FAIL=0

# 1. Run product CI
echo "[1/6] Running product CI..."
bash scripts/product-ci-check.sh || FAIL=1

# 2. Dockerfiles exist
echo "[2/6] Checking Dockerfiles..."
for f in Dockerfile.api Dockerfile.worker Dockerfile.worker.devnet; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f missing"
    FAIL=1
  fi
done

# 3. Docker Compose beta exists
echo "[3/6] Checking docker-compose.beta.yml..."
if [ -f "docker-compose.beta.yml" ]; then
  echo "  ✅ docker-compose.beta.yml"
else
  echo "  ❌ docker-compose.beta.yml missing"
  FAIL=1
fi

# 4. Deployment docs exist
echo "[4/6] Checking deployment docs..."
for f in docs/PRODUCT_DEPLOYMENT.md docs/PRODUCT_OPERATIONS_RUNBOOK.md docs/BETA_LAUNCH_CHECKLIST.md; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f missing"
    FAIL=1
  fi
done

# 5. Env example includes required vars
echo "[5/6] Checking .env.product.example..."
REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "MANDARA_API_PORT"
  "MANDARA_API_HOST"
  "MANDARA_ENV"
  "MANDARA_CORS_ORIGIN"
  "MANDARA_WORKER_MODE"
  "MANDARA_ENABLE_LIVE_EXECUTION"
  "MANDARA_SERVICE_WALLET_PATH"
  "MANDARA_SOLANA_RPC_URL"
  "MANDARA_IKA_GRPC_URL"
  "MANDARA_HUMANRAIL_GUARD_PROGRAM_ID"
  "MANDARA_IKA_DWALLET_PROGRAM_ID"
)
ENV_EXAMPLE=".env.product.example"
ENV_FAIL=0
for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "$var" "$ENV_EXAMPLE" 2>/dev/null; then
    : # ok
  else
    echo "  ❌ $var missing from $ENV_EXAMPLE"
    ENV_FAIL=1
    FAIL=1
  fi
done
if [ "$ENV_FAIL" -eq 0 ]; then
  echo "  ✅ All required vars present in $ENV_EXAMPLE"
fi

# 6. Docker build validation (if Docker is available)
echo "[6/6] Checking Docker builds..."
if command -v docker >/dev/null 2>&1; then
  echo "  Building API image..."
  if docker build -f Dockerfile.api -t mandara-api:readiness . >/dev/null 2>&1; then
    echo "  ✅ API image builds"
  else
    echo "  ❌ API image build failed"
    FAIL=1
  fi

  echo "  Building worker image..."
  if docker build -f Dockerfile.worker -t mandara-worker:readiness . >/dev/null 2>&1; then
    echo "  ✅ Worker image builds"
  else
    echo "  ❌ Worker image build failed"
    FAIL=1
  fi

  echo "  Validating docker-compose.beta.yml..."
  if docker compose -f docker-compose.beta.yml config >/dev/null 2>&1; then
    echo "  ✅ docker-compose.beta.yml is valid"
  else
    echo "  ❌ docker-compose.beta.yml validation failed"
    FAIL=1
  fi
else
  echo "  ⚠️  Docker not available — skipping image build validation"
fi

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "❌ Product Readiness Check FAILED"
  exit 1
fi

echo "✅ Product Readiness Check PASSED"
echo "=== Ready for devnet beta deployment ==="
