# Mandara Product Implementation Plan

> **Status:** P4A complete. Worker foundation with dry-run mode implemented. Live on-chain execution deferred to P4B.  
> **Goal:** Turn the HumanRail grant implementation into a hosted product MVP.  
> **Last updated:** 2026-05-02

---

## Principles

1. **Do not break the grant demo.** `/vault/dwallets`, grant docs, and on-chain programs remain untouched.
2. **Incremental migration.** Scripts become API endpoints and worker jobs one by one.
3. **Devnet-first.** All product infrastructure targets Ika pre-alpha devnet.
4. **No production custody claims.** Ika is mock signer; messaging must remain honest.

---

## Phase Overview

| Phase | Name | Objective | Est. Duration |
|-------|------|-----------|---------------|
| P0 | Architecture audit | Document target architecture, DB, API, phases | 1 day |
| P1 | Backend foundation | Fastify API + Prisma + Postgres + local dev setup | 3–4 days |
| P2 | Persist artifacts | Store Ika / HumanRail artifacts in DB instead of `.local-ika/` | 2 days |
| P3 | Core APIs | Organization, agent, policy, signing request CRUD | 3–4 days |
| P4 | Ika workers | Background jobs for DKG, Guard CPI, sign, poll | 4–5 days |
| P5 | Dashboard integration | Dashboard reads from API; local artifact dependency removed | 3 days |
| P6 | Agent API keys | External signing endpoint with API key auth | 3 days |
| P7 | Mandara SDK | TypeScript SDK for developers consuming the Agent API | 2–3 days |
| P8 | Webhooks + exports | Real-time events + CSV/JSON audit exports | 3 days |
| P9 | Devnet beta deploy | Hosted deployment on devnet with CI/CD | 2–3 days |
| P10 | Launch docs | Product docs, developer guide, API reference | 2 days |

---

## P0 — Product Architecture Audit

### Objective
Understand the current repo and produce a detailed product architecture plan without changing application code.

### Files Changed
- `docs/PRODUCT_ARCHITECTURE.md`
- `docs/PRODUCT_DATABASE_MODEL.md`
- `docs/PRODUCT_API_DESIGN.md`
- `docs/PRODUCT_IMPLEMENTATION_PLAN.md`
- `docs/README.md` (index update)

### Acceptance Criteria
- [x] All four product docs are created and cross-linked.
- [x] `npm run build` still passes.
- [x] `npm run final:check` still passes (with expected branch deviation noted).
- [x] No application code modified.

### Risks
- `final:check` expects the `grant/ika-guarded-dwallets` branch. We are on `product/mandara-cloud-mvp`, so the branch check will fail. This is expected and documented.

---

## P1 — Backend API + Prisma DB Foundation

### Objective
Create a working Fastify API with Prisma, Postgres, and local Docker Compose for development.

### Files Likely Changed
- `apps/api/` (new)
  - `src/server.ts` — Fastify bootstrap
  - `src/plugins/auth.ts` — session + API key auth stubs
  - `src/routes/health.ts` — health check
  - `package.json`
  - `tsconfig.json`
- `packages/db/` (new)
  - `prisma/schema.prisma` — full schema from PRODUCT_DATABASE_MODEL.md
  - `src/client.ts` — exported Prisma client
  - `package.json`
- `docker-compose.yml` (new) — Postgres + Redis
- Root `package.json` — add `workspaces` or Turborepo config (optional)

### Acceptance Criteria
- [x] `docker compose up` brings up Postgres 16 and Redis 7.
- [x] `npx prisma migrate dev` applies the schema.
- [x] Fastify server starts on `:4000` and responds to `GET /health`.
- [x] `npm run build` (root Next.js) still passes.
- [x] Grant scripts unchanged.

### Risks
- Adding workspaces to root `package.json` may break existing `file:` references if not configured carefully.
- Mitigation: test `npm install` thoroughly after any workspace change.

---

## P2 — Persist Ika / HumanRail Artifacts in DB

### Objective
Import the completed Mandara / HumanRail / Ika devnet lifecycle into the product database and expose DB-backed read APIs.

### Files Likely Changed
- `packages/db/prisma/schema.prisma` — added metadata, asset/recipient plaintext, signatureBase64 fields
- `packages/core/src/constants/devnetArtifacts.ts` (new) — public artifact constants
- `packages/core/src/devnetArtifactImport.ts` (new) — idempotent import service
- `scripts/product-import-devnet-artifacts.ts` (new) — CLI import script
- `apps/api/src/routes/agents.ts` — DB-backed list
- `apps/api/src/routes/wallets.ts` — DB-backed list
- `apps/api/src/routes/policies.ts` — DB-backed list with relations
- `apps/api/src/routes/signingRequests.ts` — DB-backed list + detail
- `apps/api/src/routes/messageApprovals.ts` (new) — DB-backed list
- `apps/api/src/routes/product.ts` (new) — devnet demo status endpoint

### Acceptance Criteria
- [x] `npm run product:import-devnet-artifacts` idempotently imports all artifacts.
- [x] `GET /api/product/devnet-demo` returns full lifecycle snapshot.
- [x] `GET /api/agents`, `/api/wallets`, `/api/policies`, `/api/signing-requests`, `/api/message-approvals` return DB data.
- [x] Running import twice does not create duplicates.
- [x] Smoke test passes after import.

### Risks
- DB schema may need adjustment after first real usage.
- Mitigation: keep Prisma migrations small and iterative.

---

## P3 — Product Create / Preview APIs

### Objective
Add product-level create and preview APIs so users can create Mandara records without manually editing the database. No on-chain execution yet.

### Files Changed
- `packages/db/prisma/schema.prisma` — optional `expiresAt`, new audit event types
- `packages/core/package.json` — added `@noble/hashes`
- `packages/core/src/schemas/agent.ts` — updated `CreateAgentSchema`
- `packages/core/src/schemas/wallet.ts` (new) — `ImportIkaDwalletSchema`
- `packages/core/src/schemas/policy.ts` — updated `CreatePolicySchema`
- `packages/core/src/schemas/signingRequest.ts` — preview and create schemas
- `packages/core/src/policy/evaluatePolicy.ts` (new) — shared policy evaluator
- `apps/api/src/lib/orgContext.ts` (new) — organization context resolver
- `apps/api/src/routes/agents.ts` — added POST
- `apps/api/src/routes/wallets.ts` — added POST `/api/wallets/import`
- `apps/api/src/routes/policies.ts` — added POST
- `apps/api/src/routes/signingRequests.ts` — added POST `/preview` and POST `/`
- `scripts/product-api-smoke.mjs` — expanded to 38 checks

### Acceptance Criteria
- [x] `POST /api/agents` creates agents with audit events.
- [x] `POST /api/wallets/import` imports existing dWallet PDAs.
- [x] `POST /api/policies` creates policies with keccak256 hash computation.
- [x] `POST /api/signing-requests/preview` evaluates policy without creating records.
- [x] `POST /api/signing-requests` creates records with `requested` or `policy_rejected` status.
- [x] Policy evaluator validates chain, asset, recipient, amount, limits, expiry, agent status, wallet state.
- [x] Org context resolver enforces membership-based access.
- [x] Smoke test passes: 38/38 checks.

### Risks
- Policy evaluation uses off-chain logic only. On-chain Guard may still reject for reasons not captured here.
- Mitigation: P4 workers will validate against on-chain state before submission.

---

## P4A — Worker Foundation (Dry-Run)

### Objective
Build the worker infrastructure for signing request execution, but keep live on-chain/Ika mutation disabled by default.

### Files Changed
- `packages/db/prisma/schema.prisma` — added `queued`, `worker_processing` statuses; new audit event types; `executionJobId`
- `apps/worker/` (new)
  - `src/index.ts` — worker bootstrap
  - `src/config.ts` — worker env + mode gates
  - `src/queues.ts` — BullMQ queue + worker setup
  - `src/jobs/signingRequestJob.ts` — processor logic
  - `src/lib/audit.ts`, `status.ts`, `logger.ts` — helpers
- `apps/api/src/services/queue.ts` (new) — BullMQ producer
- `apps/api/src/routes/signingRequests.ts` — added `POST /:id/enqueue` and `GET /:id/execution`
- `scripts/product-worker-smoke.mjs` (new) — worker smoke test
- `docs/PRODUCT_WORKER.md` (new)

### Acceptance Criteria
- [x] `POST /api/signing-requests/:id/enqueue` adds job to BullMQ queue.
- [x] Worker processes jobs in `dry-run` mode without on-chain mutation.
- [x] Worker skips terminal-state requests safely.
- [x] Worker re-evaluates policy before execution.
- [x] Audit events recorded for queued, processing, dry-run, and skipped states.
- [x] `GET /api/signing-requests/:id/execution` returns status + audit trail.
- [x] Worker smoke test passes.

### Risks
- BullMQ requires Redis. Mitigation: Redis is already in Docker Compose.

---

## P4B — Live On-Chain Execution

### Objective
Enable actual Guard CPI and Ika signing in live-devnet mode.

### Files Likely Changed
- `apps/worker/src/jobs/signingRequestJob.ts` — add live execution branch
- `apps/worker/src/services/solana.ts` (new) — transaction builder
- `apps/worker/src/services/ika.ts` (new) — gRPC client wrapper

### Acceptance Criteria
- [ ] Worker submits `approve_guarded_message` on-chain when `MANDARA_ENABLE_LIVE_EXECUTION=true`.
- [ ] Worker polls for GuardSigningRequest and MessageApproval status.
- [ ] Worker requests Ika signature via gRPC and polls for completion.
- [ ] Status transitions: `guard_approved` → `ika_pending` → `signed`.
- [ ] Failed jobs retry with exponential backoff (max 5 attempts).

### Risks
- Ika gRPC is unstable in pre-alpha. Workers must handle timeouts and devnet wipes gracefully.
- Mitigation: wrap every gRPC call in timeout + circuit breaker logic.

---

## P5 — Dashboard Uses API Instead of Local Artifacts

### Objective
The Next.js dashboard reads from the Mandara API rather than `.local-ika/` JSON files.

### Files Likely Changed
- `app/vault/dwallets/page.tsx` — add API client, preserve existing devnet demo
- `lib/api/client.ts` (new) — typed fetch wrapper for Mandara API
- `app/dashboard/mandara/` (new) — new product dashboard pages

### Acceptance Criteria
- [ ] New dashboard pages list agents, wallets, policies, and signing requests from the API.
- [ ] `/vault/dwallets` continues to work exactly as before (grant demo preserved).
- [ ] No filesystem artifact reads in new product routes.

### Risks
- CORS or auth cookie issues between dashboard (`localhost:3000`) and API (`localhost:3001`).
- Mitigation: configure Fastify CORS and ensure cookies carry `SameSite=lax`.

---

## P6 — Agent API Keys and External Signing Request Endpoint

### Objective
Allow external agents to authenticate with API keys and request signatures via HTTP.

### Files Likely Changed
- `apps/api/src/routes/v1/signature-requests.ts` (new)
- `apps/api/src/routes/v1/agent-status.ts` (new)
- `apps/api/src/middleware/api-key-auth.ts` (new)
- `apps/api/src/services/api-keys.ts` (new) — hash verification
- `app/dashboard/mandara/api-keys/` (new) — UI for creating/revoking keys

### Acceptance Criteria
- [ ] `POST /v1/signature-requests` with valid Bearer token returns 202.
- [ ] Invalid or revoked API key returns 401.
- [ ] API key scoped to agent; cannot request signatures for another agent's policies.
- [ ] Dashboard UI shows API key creation flow (show once, copy to clipboard).

### Risks
- API keys are sensitive. A leak allows an attacker to request signatures within policy bounds.
- Mitigation: keys are hash-only, support revocation, and can be scoped to specific policies.

---

## P7 — Mandara TypeScript SDK

### Objective
A developer-friendly SDK that wraps the Agent API.

### Files Likely Changed
- `packages/mandara-sdk/` (new)
  - `src/index.ts` — `MandaraClient`
  - `src/types.ts` — shared types
  - `src/errors.ts` — error classes
  - `package.json`
  - `README.md`

### Acceptance Criteria
- [ ] `MandaraClient` supports `createSignatureRequest()`, `getSignatureRequest()`, `getAgentStatus()`.
- [ ] SDK handles pagination, retries, and error parsing automatically.
- [ ] Published to npm (private scope initially: `@humanrail/mandara`).

### Risks
- API surface may still change. SDK should be versioned and follow semver.
- Mitigation: mark initial releases as `0.x` with breaking-change warnings.

---

## P8 — Webhooks and Audit Exports

### Objective
Real-time event delivery and compliance-ready data exports.

### Files Likely Changed
- `apps/api/src/routes/webhooks.ts` (new)
- `apps/api/src/services/webhooks.ts` (new) — delivery + HMAC signing
- `apps/worker/src/queues/webhooks.ts` — expanded consumer
- `app/dashboard/mandara/webhooks/` (new) — UI
- `app/dashboard/mandara/exports/` (new) — CSV/JSON export UI
- `packages/db/prisma/schema.prisma` — add `webhooks` and `webhook_deliveries` if not in P1

### Acceptance Criteria
- [ ] Users can register webhook URLs and select event types.
- [ ] Mandara delivers signed payloads within 5 seconds of status change.
- [ ] Failed deliveries retry 5 times with exponential backoff.
- [ ] Users can export audit events as CSV or JSON (date-range filtered).

### Risks
- Webhook endpoints may be slow or unavailable. Workers must not block on delivery.
- Mitigation: webhooks are always queued jobs, never synchronous.

---

## P9 — Hosted Devnet Beta Deployment

### Objective
Deploy the full stack to a hosted devnet environment.

### Files Likely Changed
- `Dockerfile` (new) — API + worker multi-stage builds
- `docker-compose.prod.yml` (new) — production-like stack
- `.github/workflows/ci.yml` (new) — lint, build, test
- `.github/workflows/deploy-devnet.yml` (new) — deploy to Fly / Railway / Render
- `apps/api/src/config.ts` — environment-based config

### Acceptance Criteria
- [ ] API and worker deploy automatically on push to `product/mandara-cloud-mvp`.
- [ ] Postgres and Redis are hosted (Supabase Postgres + Upstash Redis, or self-hosted).
- [ ] Dashboard deploys to Vercel (or similar) with `NEXT_PUBLIC_API_URL` set.
- [ ] Health checks and monitoring (basic logging) in place.

### Risks
- Ika pre-alpha devnet may be wiped during beta. Users must be warned.
- Mitigation: clear devnet-only disclaimers in UI and docs.

---

## P10 — Product Launch Docs

### Objective
Developer-facing documentation for the Mandara product.

### Files Likely Changed
- `docs/MANDARA_DEVELOPER_GUIDE.md` (new)
- `docs/MANDARA_API_REFERENCE.md` (new)
- `docs/MANDARA_QUICKSTART.md` (new)
- `docs/README.md` — update index

### Acceptance Criteria
- [ ] Quickstart guide: create org → create agent → request signature in under 10 minutes.
- [ ] API reference documents every endpoint, auth method, and error code.
- [ ] All docs mention devnet-only status and Ika pre-alpha limitations.

---

## Dependency Graph

```
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5 ──► P6 ──► P7 ──► P8 ──► P9 ──► P10
       │       │       │       │
       └───────┴───────┴───────┘
       (P1–P4 can be developed in parallel after P1 is stable)
```

- P1 must be stable before P2–P4 start.
- P4 must be stable before P5 starts.
- P6 and P7 can be developed in parallel after P5.
- P8, P9, P10 are largely independent after P6–P7.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| `npm run build` (root) | Passes in every phase |
| `npm run final:check` (grant scripts) | Passes in every phase (branch check exempted) |
| API test coverage | ≥ 60% by P6 |
| End-to-end signing latency | < 30s from API call to on-chain signature (devnet) |
| Dashboard artifact reads | Zero filesystem reads in product routes by P5 |
| Webhook delivery success | ≥ 95% after retries |

---

*End of document. Back to [`PRODUCT_ARCHITECTURE.md`](PRODUCT_ARCHITECTURE.md)*
