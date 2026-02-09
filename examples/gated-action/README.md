# Gated Action — Human-Verified Access Control

Shows how to gate any dApp action behind HumanRail's humanity verification.

## Pattern
```typescript
const result = await checkHumanGate(walletPubkey);
if (!result.allowed) {
  // show "verify your humanity" prompt
  return;
}
// proceed with swap, mint, transfer, etc.
```

## Run
```bash
# Check a known verified wallet
npx tsx gated-action.ts 8yyhW3phGQo3oiMd5RFuBMEh3bSYZgDLRXYNx8wReTQ4

# Check an unverified wallet
npx tsx gated-action.ts 11111111111111111111111111111112
```

## Customize

Edit the constants at the top of `gated-action.ts`:

| Constant | Default | Description |
|---|---|---|
| `MINIMUM_SCORE` | 50 | Minimum humanity_score to pass |
| `REQUIRE_ACTIVE` | true | Require ≥1 attestation |

## Integration Guide

For full integration patterns, see [docs/integration/cookbook.md](../../docs/integration/cookbook.md).
