#!/bin/bash
# Pre-deploy safety check: ensure test-only features are disabled
set -euo pipefail

if grep -q 'test-skip-sig-verify' Anchor.toml; then
  echo "❌ FATAL: test-skip-sig-verify is enabled in Anchor.toml"
  echo "   Remove the human_registry feature line before deploying!"
  exit 1
fi

echo "✅ No test-only features found — safe to deploy"
