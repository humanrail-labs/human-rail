# Mandara Product Worker

> Background worker infrastructure for executing signing requests.  
> **Phase:** P4A — Worker foundation with dry-run mode. Live execution deferred to P4B.  
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
- Requires `MANDARA_ENABLE_LIVE_EXECUTION=true`.
- In P4A, live execution is **not implemented**.
- If enabled, the worker returns:
  ```json
  {
    "mode": "live-devnet",
    "wouldExecute": false,
    "reason": "Live execution not implemented until P4B"
  }
  ```

---

## Safety Gates

| Gate | Default | Description |
|------|---------|-------------|
| `MANDARA_WORKER_MODE` | `dry-run` | Controls whether worker simulates or attempts live execution |
| `MANDARA_ENABLE_LIVE_EXECUTION` | `false` | Explicit flag required before any on-chain mutation |

Even if both gates are open, P4A worker refuses live execution and logs a clear message. P4B will implement the actual Guard CPI and Ika signing flow.

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
    └──► guard_approved   (P4B: after on-chain Guard CPI)
              │
              ▼
          ika_pending     (P4B: after Ika sign request)
              │
              ▼
          signed          (P4B: after signature committed)
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

### Smoke Test

```bash
# Ensure API, DB, and Redis are running
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:start

# Run worker smoke test (processes job directly, no long-running worker needed)
npm run product:worker:smoke
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
| `signing_request_status_updated` | worker | Generic status change (future) |

---

## Idempotency

- Enqueueing the same signing request multiple times is allowed (BullMQ creates separate jobs).
- The worker skips processing if the signing request is already in a terminal state (`signed`, `policy_rejected`, `failed`).
- Dry-run does not mutate on-chain state, so it is inherently safe to re-run.

---

## P4A Limitations

- **No live Solana transaction submission.** Guard CPI is not called.
- **No Ika gRPC signing.** Ika mock signer is not invoked.
- **No polling loop.** Worker processes jobs as they arrive; no continuous on-chain polling yet.
- **Devnet only.** All infrastructure targets Ika pre-alpha devnet.

---

## P4B Roadmap

- Implement `approve_guarded_message` on-chain transaction in live-devnet mode.
- Implement Ika gRPC sign request and polling.
- Add `guard_approved` → `ika_pending` → `signed` status transitions.
- Add on-chain PDA tracking (GuardSigningRequest, MessageApproval).
- Add retry logic for Ika gRPC timeouts.

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
