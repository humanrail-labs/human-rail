#!/bin/bash
# Verify Anchor.toml [programs.devnet] IDs match declare_id!() in source.
set -euo pipefail

DRIFT=0
declare -A PROGRAM_DIRS=(
  [agent_registry]="programs/agent_registry/src/lib.rs"
  [data_blink]="programs/data_blink/src/lib.rs"
  [delegation]="programs/delegation/src/lib.rs"
  [document_registry]="programs/document_registry/src/lib.rs"
  [human_pay]="programs/human_pay/src/lib.rs"
  [human_registry]="programs/human_registry/src/lib.rs"
  [receipts]="programs/receipts/src/lib.rs"
)

for prog in "${!PROGRAM_DIRS[@]}"; do
  src="${PROGRAM_DIRS[$prog]}"

  # Extract first match from Anchor.toml
  anchor_id=$(grep -A20 '\[programs.devnet\]' Anchor.toml | grep "^${prog} " | head -1 | sed 's/.*= *"\(.*\)"/\1/')

  # Extract from declare_id!() — handles both declare_id!("...") and pubkey!("...")
  source_id=$(grep -E 'declare_id!|pubkey!' "$src" | head -1 | sed 's/.*[!(]"\([A-Za-z0-9]*\)".*/\1/')

  if [ -z "$anchor_id" ]; then
    echo "⚠️  ${prog}: not found in Anchor.toml [programs.devnet]"
    continue
  fi
  if [ -z "$source_id" ]; then
    echo "⚠️  ${prog}: no declare_id! found in ${src}"
    continue
  fi

  if [ "$anchor_id" != "$source_id" ]; then
    echo "❌ DRIFT: ${prog}"
    echo "   Anchor.toml: ${anchor_id}"
    echo "   ${src}:      ${source_id}"
    DRIFT=1
  else
    echo "✅ ${prog}: ${anchor_id}"
  fi
done

if [ $DRIFT -ne 0 ]; then
  echo ""
  echo "❌ Program ID drift detected! Run: git restore Anchor.toml programs/*/src/lib.rs"
  exit 1
fi

echo ""
echo "✅ All program IDs consistent"
