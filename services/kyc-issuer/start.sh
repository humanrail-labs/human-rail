#!/bin/sh
set -e

# If ISSUER_KEYPAIR_JSON is set, write it to a file so config.ts can load it
if [ -n "$ISSUER_KEYPAIR_JSON" ]; then
  mkdir -p /app/.keys
  echo "$ISSUER_KEYPAIR_JSON" > /app/.keys/issuer.json
  chmod 600 /app/.keys/issuer.json
  export ISSUER_KEYPAIR_PATH=/app/.keys/issuer.json
  echo "✅ Wrote issuer keypair to /app/.keys/issuer.json"
fi

exec node dist/server.js
