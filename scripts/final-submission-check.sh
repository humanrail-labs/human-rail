#!/usr/bin/env bash
set -uo pipefail

# HumanRail Final Submission Check — Phase 7
# Verifies repo readiness for grant submission

echo "═══════════════════════════════════════════════════════════"
echo "  Mandara by HumanRail — Final Submission Check"
echo "═══════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

function check_pass() {
  echo "  ✅ PASS: $1"
  ((PASS++)) || true
}

function check_fail() {
  echo "  ❌ FAIL: $1"
  ((FAIL++)) || true
}

# ── 1. Git status ──
echo "[1/12] Git status..."
if git diff --quiet && git diff --cached --quiet; then
  check_pass "Working tree is clean"
else
  check_fail "Working tree has uncommitted changes"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "grant/ika-guarded-dwallets" ]; then
  check_pass "On correct branch: $BRANCH"
else
  check_fail "Not on grant/ika-guarded-dwallets branch (currently: $BRANCH)"
fi

# ── 2. Orphaned program ID check ──
echo ""
echo "[2/12] Checking for stale program ID..."
STALE_COUNT=$(grep -r "G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v target | grep -v ".git" | wc -l)
if [ "$STALE_COUNT" -eq 0 ]; then
  check_pass "No stale program ID references found"
else
  check_fail "Found $STALE_COUNT stale program ID references"
fi

# ── 3. Secret/keypair audit ──
echo ""
echo "[3/12] Checking for committed secrets..."
TRACKED_LOCAL=$(git ls-files | grep -E "^\.local-ika|^\.local-keys" | wc -l)
if [ "$TRACKED_LOCAL" -eq 0 ]; then
  check_pass "No .local-ika or .local-keys files tracked"
else
  check_fail "Found $TRACKED_LOCAL tracked local files"
fi

TRACKED_KEYPAIR=$(git ls-files | grep -E "target/deploy/.*keypair\.json" | wc -l)
if [ "$TRACKED_KEYPAIR" -eq 0 ]; then
  check_pass "No deploy keypairs tracked"
else
  check_fail "Found $TRACKED_KEYPAIR tracked deploy keypairs"
fi

# ── 4. npm build ──
echo ""
echo "[4/12] Running npm run build..."
if npm run build > /tmp/build.log 2>&1; then
  check_pass "npm run build succeeded"
else
  check_fail "npm run build failed (see /tmp/build.log)"
fi

# ── 5. Verify Guard program ──
echo ""
echo "[5/12] Verifying Guard program deployment..."
if npm run verify:dwallet-guard > /tmp/verify.log 2>&1; then
  check_pass "Guard program verified"
else
  check_fail "Guard program verification failed (see /tmp/verify.log)"
fi

# ── 6. Devnet inspect ──
echo ""
echo "[6/12] Running devnet inspect..."
if npm run devnet:inspect-ika > /tmp/inspect.log 2>&1; then
  check_pass "devnet:inspect-ika completed"
else
  check_fail "devnet:inspect-ika failed (see /tmp/inspect.log)"
fi

# ── 7. Lifecycle verify ──
echo ""
echo "[7/12] Verifying Ika lifecycle..."
if npm run ika:verify-lifecycle > /tmp/lifecycle.log 2>&1; then
  check_pass "ika:verify-lifecycle passed"
else
  check_fail "ika:verify-lifecycle failed (see /tmp/lifecycle.log)"
fi

# ── 8. Agent tool test ──
echo ""
echo "[8/12] Running agent cross-chain tool tests..."
if npm run test:agent-cross-chain-tool > /tmp/agent-test.log 2>&1; then
  check_pass "test:agent-cross-chain-tool passed"
else
  check_fail "test:agent-cross-chain-tool failed (see /tmp/agent-test.log)"
fi

# ── 9. Guard program build check ──
echo ""
echo "[9/12] Checking Guard program build..."
if npm run check:dwallet-guard > /tmp/check-guard.log 2>&1; then
  check_pass "check:dwallet-guard passed"
else
  check_fail "check:dwallet-guard failed (see /tmp/check-guard.log)"
fi

# ── 10. Rust CLI check ──
echo ""
echo "[10/12] Checking Rust CLI compilation..."
if cargo check --manifest-path tools/ika-dkg-cli/Cargo.toml > /tmp/rust-check.log 2>&1; then
  check_pass "Rust CLI compiles"
else
  check_fail "Rust CLI compilation failed (see /tmp/rust-check.log)"
fi

# ── 11. Required docs exist ──
echo ""
echo "[11/12] Checking required docs..."
for doc in \
  "docs/GRANT_SUBMISSION.md" \
  "docs/JUDGING_CRITERIA.md" \
  "docs/DEMO_VIDEO_SCRIPT.md" \
  "docs/FINAL_AUDIT.md" \
  "docs/IKA_INTEGRATION_RUNBOOK.md"; do
  if [ -f "$doc" ]; then
    check_pass "Doc exists: $doc"
  else
    check_fail "Missing doc: $doc"
  fi
done

# ── 12. README check ──
echo ""
echo "[12/12] Checking README..."
if grep -q "Mandara by HumanRail" README.md; then
  check_pass "README contains Mandara branding"
else
  check_fail "README missing Mandara branding"
fi

if grep -q "Programmable mandates for cross-chain AI agents" README.md; then
  check_pass "README contains tagline"
else
  check_fail "README missing tagline"
fi

# ── Summary ──
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Final Check Summary"
echo "═══════════════════════════════════════════════════════════"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "  ✅ ALL CHECKS PASSED — READY FOR SUBMISSION"
  exit 0
else
  echo "  ❌ SOME CHECKS FAILED — review failures above"
  exit 1
fi
