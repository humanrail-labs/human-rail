# Mandara Product Worker

> Background worker infrastructure for executing signing requests.  
> **Phase:** P4B — Live devnet execution with Guard CPI + Ika signing complete.  
> **Queue:** BullMQ + Redis  
> **Last updated:** 2026-05-02

---

## Architecture

```
┌──────────────┐     enqueue      ┌─────────────┐     consume      ┌──────────────┐
│  Mandara API │ ───────────────► │  BullMQ     │ ───────────────► │  Worker      │
│              │                  │  (Redis)    │                  │  (Node.js)   │
└──────────────┘                  └─────────────┘                  └──────────────┘
       │                                 │                                │
       │ write                           │ job state                      │ read/write
       ▼                                 ▼                                ▼
┌──────────────┐                  ┌─────────────┐                  ┌──────────────┐
│  Postgres    │                  │  Redis      │                  │  Postgres    │
│  (Prisma)    │                  │  (BullMQ)   │                  │  (Prisma)    │
└──────────────┘                  └─────────────┘                  └──────────────┘
```

---

## Queue

**Queue name:** `mandara.signing-requests`

**Job type:** `execute-signing-request`

**Job data:**
```ts
{
  signingRequestId: string;
  organizationId: string;
  requestedBy?: string;
  mode?: "dry-run" | "live-devnet";
}
```

**Default job options:**
- `attempts: 3`
- `backoff: { type: "exponential", delay: 2000 }`
- `removeOnComplete: { count: 100 }`
- `removeOnFail: { count: 100 }`

---

## Worker Modes

### `dry-run` (default)

- Evaluates the signing request against current DB policy/agent/wallet state.
- Does **not** call Solana or Ika.
- Updates signing request status back to `requested` with `metadata.workerDryRun = true`.
- Records `signing_request_dry_run_completed` audit event.
- Returns simulated next steps:
  ```json
  {
    "mode": "dry-run",
    "wouldExecute": true,
    "nextLiveSteps": ["approve_guarded_message", "ika_sign"]
  }
  ```

### `live-devnet`

- **Disabled by default** even when mode is set to `live-devnet`.
- Requires `MANDARA_ENABLE_LIVE_EXECUTION=true` and `MANDARA_WORKER_MODE=live-devnet`.
- When enabled, performs the full on-chain execution flow:
  1. Loads service wallet and dWallet artifact
  2. Verifies dWallet authority == Guard CPI PDA on-chain
  3. Builds and sends `approve_guarded_message` CPI transaction
  4. Verifies `GuardSigningRequest` is approved on-chain
  5. Verifies `MessageApproval` is pending on-chain
  6. Spawns Rust CLI (`ika-dkg-cli sign-approved-message`) via gRPC
  7. Polls `MessageApproval` for signature (up to 3 minutes)
  8. Updates DB with signature and final `signed` status
- Status transitions: `worker_processing` → `guard_approved` → `ika_pending` → `signed`
- If any step fails, status becomes `failed` with error metadata.

---

## Safety Gates

| Gate | Default | Description |
|------|---------|-------------|
| `MANDARA_WORKER_MODE` | `dry-run` | Controls whether worker simulates or attempts live execution |
| `MANDARA_ENABLE_LIVE_EXECUTION` | `false` | Explicit flag required before any on-chain mutation |
| `MANDARA_SERVICE_WALLET_PATH` | `""` | Path to devnet keypair; required for live mode |

Even if both gates are open, the worker:
- Verifies dWallet authority == Guard CPI PDA before executing
- Checks service wallet has sufficient SOL for fees
- Uses `spawn()` with fixed CLI args (no shell interpolation)
- Cleans up `.local-worker/` temp artifacts after execution
- Never commits temporary artifacts (`.local-worker/` is gitignored)

---

## Status Transitions

```
requested
    │
    ▼ (enqueue)
 queued
    │
    ▼ (worker picks up)
 worker_processing
    │
    ├──► policy_rejected  (if evaluation fails)
    │
    ├──► requested        (dry-run completes, metadata.workerDryRun=true)
    │
    └──► guard_approved   (live-devnet: after on-chain Guard CPI)
              │
              ▼
          ika_pending     (live-devnet: after Ika sign request)
              │
              ▼
          signed          (live-devnet: after signature committed)
              │
              ▼
          failed          (if live execution errors)
```

Terminal states: `signed`, `policy_rejected`, `failed`.
The worker skips jobs for signing requests already in terminal states.

---

## Commands

### Development

```bash
# Start API (in one terminal)
npm run product:api:dev

# Start worker (in another terminal)
npm run product:worker:dev
```

### Production

```bash
# Build worker
npm run product:worker:build

# Start worker
npm run product:worker:start
```

### Smoke Tests

```bash
# Ensure API, DB, and Redis are running
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:start

# Run worker smoke test (processes job directly, no long-running worker needed)
npm run product:worker:smoke

# Run live devnet smoke test (module load + graceful failure tests)
# Set LIVE_SMOKETEST=1 to also run the full end-to-end live test
npm run product:worker:live-smoke
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `MANDARA_ENV` | `development` | Runtime environment |
| `MANDARA_WORKER_MODE` | `dry-run` | Worker execution mode |
| `MANDARA_ENABLE_LIVE_EXECUTION` | `false` | Safety gate for live on-chain execution |
| `MANDARA_SERVICE_WALLET_PATH` | `""` | Devnet keypair path for live transactions |
| `MANDARA_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `MANDARA_IKA_GRPC_URL` | `https://pre-alpha-dev-1.ika.ika-network.net:443` | Ika gRPC endpoint |

---

## Audit Events

| Event | Actor | When |
|-------|-------|------|
| `signing_request_queued` | user | API enqueues a signing request |
| `signing_request_processing` | worker | Worker starts processing a job |
| `signing_request_dry_run_completed` | worker | Dry-run simulation finishes |
| `signing_request_execution_failed` | worker | Job fails after max retries |
| `signing_request_worker_skipped` | worker | Worker skips terminal-state request |
| `signing_request_status_updated` | worker | Generic status change |
| `guard_message_approved` | worker | Guard CPI transaction confirmed |
| `ika_message_approval_created` | worker | Ika MessageApproval account verified |
| `ika_signature_committed` | worker | Ika signature committed on-chain |

---

## Idempotency

- Enqueueing the same signing request multiple times is allowed (BullMQ creates separate jobs).
- The worker skips processing if the signing request is already in a terminal state (`signed`, `policy_rejected`, `failed`).
- Dry-run does not mutate on-chain state, so it is inherently safe to re-run.
- Live execution checks if `MessageApproval` is already `Signed` before sending the Guard CPI, and skips to polling if `Pending` + `GuardSigningRequest` approved.

---

## P4B Live Execution Details

### Architecture
1. **TypeScript:** Build and submit `approve_guarded_message` transaction
2. **TypeScript:** Verify `GuardSigningRequest` + `MessageApproval` on-chain
3. **TypeScript:** Write temporary request artifact to `.local-worker/`
4. **Spawn:** Rust CLI (`ika-dkg-cli sign-approved-message`) with fixed args
5. **TypeScript:** Poll `MessageApproval` for signature
6. **TypeScript:** Update DB records and clean up temp artifact

### Security
- CLI is spawned with `spawn()` using an array of fixed arguments — no shell string interpolation.
- The service wallet path, RPC URL, and gRPC URL are passed as discrete array elements.
- Temporary artifacts are always deleted in a `finally` block.
- `.local-worker/` is listed in `.gitignore` and must never be committed.

### Pre-alpha Disclaimer
Ika uses a single mock signer, not real MPC custody. All live execution targets Solana devnet only. Do not use mainnet keys or real assets.

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
