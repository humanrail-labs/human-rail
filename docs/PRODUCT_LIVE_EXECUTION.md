# Mandara Live Devnet Execution

> Documentation for the P4B live on-chain signing worker.  
> **Scope:** Solana devnet only.  
> **Last updated:** 2026-05-02

---

## Overview

The live execution service (`apps/worker/src/services/liveDevnetExecution.ts`) performs the full HumanRail Guard CPI + Ika signing flow for a queued signing request.

It is **disabled by default** and requires multiple explicit safety gates to be opened before any on-chain mutation occurs.

---

## Safety Gates

| Gate | Env Var | Required Value | Purpose |
|------|---------|----------------|---------|
| Worker mode | `MANDARA_WORKER_MODE` | `live-devnet` | Selects live execution branch |
| Live enable | `MANDARA_ENABLE_LIVE_EXECUTION` | `true` | Additional boolean gate |
| Service wallet | `MANDARA_SERVICE_WALLET_PATH` | valid file path | Devnet keypair for transaction fees |

If any gate is missing or invalid, the worker throws a clear error **before** any on-chain interaction.

---

## Execution Flow

```
Load DB signing request
    │
    ▼
Load service wallet + dWallet artifact
    │
    ▼
Verify dWallet on-chain
    ├── authority == Guard CPI PDA ?
    └── state == Active ?
    │
    ▼
Derive PDAs
    ├── GuardSigningRequest PDA
    └── MessageApproval PDA
    │
    ▼
Idempotency check
    ├── Already Signed → return idempotent success
    └── Already Pending + GSR approved → skip Guard CPI
    │
    ▼
Build + send approve_guarded_message tx
    │
    ▼
Verify GuardSigningRequest approved on-chain
    │
    ▼
Verify MessageApproval Pending on-chain
    │
    ▼
Write temp request artifact → .local-worker/
    │
    ▼
Spawn ika-dkg-cli (Rust gRPC sign)
    │
    ▼
Poll MessageApproval for signature (≤ 3 min)
    │
    ▼
Update DB → status = signed
    │
    ▼
Clean up temp artifact (always, via finally)
```

---

## Security Checklist

- [x] **No shell interpolation** — `spawn()` with fixed array args only
- [x] **No dynamic command construction** — all args are hardcoded strings or env vars passed as discrete elements
- [x] **Temp artifact cleanup** — `.local-worker/` files deleted in `finally` block
- [x] **Gitignored temp dir** — `.local-worker/` is in `.gitignore`
- [x] **Authority verification** — dWallet authority must equal Guard CPI PDA before execution
- [x] **State verification** — dWallet must be `Active`
- [x] **Balance check** — service wallet must have ≥ 0.001 SOL
- [x] **Devnet-only RPC** — default RPC is `https://api.devnet.solana.com`
- [x] **Double gate** — both `MANDARA_WORKER_MODE=live-devnet` AND `MANDARA_ENABLE_LIVE_EXECUTION=true` required

---

## Pre-alpha Disclaimer

> **Ika is pre-alpha.** It uses a single mock signer, not a real MPC network.  
> **Do not use mainnet keys.** The service wallet must be a devnet-only keypair.  
> **Do not commit keys.** All keypair files and `.local-*` directories are gitignored.

---

## Running Live Smoke Test

Prerequisites:
- Postgres and Redis running (`npm run product:docker:up`)
- API running (`npm run product:api:start`)
- `.local-ika/dwallet.json` exists (from DKG)
- `MANDARA_SERVICE_WALLET_PATH` points to a valid devnet keypair with SOL

```bash
# Module load + graceful failure tests only
npm run product:worker:live-smoke

# Full end-to-end live test
LIVE_SMOKETEST=1 npm run product:worker:live-smoke
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `dWallet artifact not found` | `.local-ika/dwallet.json` missing | Run DKG first (`npm run ika:create-dwallet`) |
| `Service wallet not found` | `MANDARA_SERVICE_WALLET_PATH` invalid | Set path to a valid devnet keypair JSON |
| `dWallet authority mismatch` | Authority not transferred to Guard CPI | Run `npm run ika:transfer-authority` |
| `Ika sign CLI exited with code != 0` | gRPC timeout or mock signer unavailable | Retry after Ika devnet recovers |
| `Timeout waiting for MessageApproval` | Ika network slow or wiped | Check Ika devnet status; may need to recreate dWallet |

---

*Back to [`PRODUCT_WORKER.md`](PRODUCT_WORKER.md)*
