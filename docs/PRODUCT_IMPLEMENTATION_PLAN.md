# Mandara Product Implementation Plan

> **Status:** P10 complete. Devnet beta launch package finalized: disk cleanup, product docs, landing copy, onboarding guide, demo script, pricing, final audit.  
> **Goal:** Turn the HumanRail grant implementation into a hosted product MVP.  
> **Last updated:** 2026-05-04

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
| P9 | Devnet beta deployment | Dockerfiles, CI, Render deployment, health checks | 2 days |
| P10 | Product launch package | Launch docs, landing copy, demo script, pricing, audit | 2 days |
| P11 | Frontend rebuild | Product landing page, console dashboard, onboarding wizard for non-technical users | 2 days |
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
- `apps/worker/src/services/liveDevnetExecution.ts` (new) — full live execution service
- `apps/worker/src/solana/` (new) — PDA derivations, instruction builders, parsers

### Acceptance Criteria
- [x] Worker submits `approve_guarded_message` on-chain when `MANDARA_ENABLE_LIVE_EXECUTION=true`.
- [x] Worker polls for GuardSigningRequest and MessageApproval status.
- [x] Worker requests Ika signature via gRPC and polls for completion.
- [x] Status transitions: `guard_approved` → `ika_pending` → `signed`.
- [x] Failed jobs retry with exponential backoff (max 5 attempts).

### Risks
- Ika gRPC is unstable in pre-alpha. Workers must handle timeouts and devnet wipes gracefully.
- Mitigation: wrap every gRPC call in timeout + circuit breaker logic.

---

## P4C — Verify Live End-to-End

### Objective
Run and verify one real end-to-end product-worker live devnet execution.

### Files Changed
- `scripts/product-live-smoke.mjs` — hardened for live e2e (fixed `state` case)
- `scripts/product-worker-live-direct.ts` (new) — direct live execution script
- `docs/PRODUCT_LIVE_EXECUTION_PROOF.md` (new) — execution proof document
- `docs/PRODUCT_WORKER.md` — updated for P4B/P4C completion
- `docs/PRODUCT_LIVE_EXECUTION.md` — updated with proof and troubleshooting

### Acceptance Criteria
- [x] New product SigningRequest created.
- [x] Worker processes in live-devnet mode.
- [x] Worker sends `approve_guarded_message` on-chain.
- [x] Ika MessageApproval created and signed.
- [x] DB updated to `signed` with signature hex/base64.
- [x] API execution endpoint returns final signature.
- [x] Audit events record full lifecycle.
- [x] Unique message used to avoid PDA collision.
- [x] Devnet only; no production custody language.

### Proof
See [`docs/PRODUCT_LIVE_EXECUTION_PROOF.md`](PRODUCT_LIVE_EXECUTION_PROOF.md):
- Tx: `2o8RbzEMFAUMyTUtZSyhihtLu3eUU7eK6nJTu4SGPTbEcZ15VGLRRR62iBbh5KWYwGA84kntGxr2jLCDP3SPJuVu`
- GuardSigningRequest PDA: `BgYUiMvdXHJEF1mT1tFYZ6HXPB9APrkGohCG4zivYQnu`
- MessageApproval PDA: `B7LedZy8bvkdgZUaD9km29BtBwHkPuoP3sWmsQ8YXVDz`
- Signature (hex): `8a4c890ad6b0b4744da2b3baa559928b193aae9872802e870669db511a3fc2ae73e299318377df7415bbf0af3554a50b1535d2411c3389f3763a86004d5f0b32`

---

## P5 — Dashboard Uses API Instead of Local Artifacts

### Objective
The Next.js dashboard reads from the Mandara API rather than `.local-ika/` JSON files.

### Files Changed
- `lib/mandara-api/config.ts` (new) — public frontend API config
- `lib/mandara-api/client.ts` (new) — typed fetch wrapper
- `lib/mandara-api/types.ts` (new) — TypeScript interfaces
- `lib/hooks/use-mandara-product.ts` (new) — React hook for dashboard data
- `components/vault/product-dashboard.tsx` (new) — dashboard UI component
- `app/vault/dwallets/page-client.tsx` — added Product Dashboard tab as default
- `scripts/product-dashboard-smoke.mjs` (new) — API-level smoke test
- `docs/PRODUCT_DASHBOARD.md` (new)

### Acceptance Criteria
- [x] Product Dashboard tab lists agents, wallets, policies, and signing requests from the API.
- [x] Create / preview / enqueue signing requests through the UI.
- [x] Execution detail panel with polling support.
- [x] `/vault/dwallets` grant demo preserved under "Grant Proof" tab.
- [x] No filesystem artifact reads in product dashboard.
- [x] Dashboard smoke test passes.

### Risks
- CORS or auth cookie issues between dashboard (`localhost:3000`) and API (`localhost:4000`).
- Mitigation: Fastify CORS already configured; dev auth uses header.

---

## P6 — Agent API Keys and External Signing Request Endpoint

### Objective
Allow external agents to authenticate with API keys and request signatures via HTTP.

### Files Changed
- `packages/db/prisma/schema.prisma` — added `agent_api_key_used` audit event type
- `packages/core/src/schemas/apiKey.ts` (new) — `CreateAgentApiKeySchema`, `ExternalSignatureRequestInputSchema`
- `apps/api/src/lib/apiKeys.ts` (new) — `generateAgentApiKey`, `hashAgentApiKey`, `verifyAgentApiKey`
- `apps/api/src/lib/rateLimit.ts` (new) — placeholder rate-limit structure
- `apps/api/src/plugins/agentAuth.ts` (new) — Bearer token auth plugin
- `apps/api/src/routes/agents.ts` — added `POST/GET /api/agents/:id/api-keys`, `DELETE /api/agents/:id/api-keys/:keyId`
- `apps/api/src/routes/v1/signatureRequests.ts` (new) — `/v1/agent/status`, `/v1/signature-requests/preview`, `/v1/signature-requests`, `/v1/signature-requests/:id`
- `apps/api/src/server.ts` — registered agent auth plugin and v1 routes
- `lib/mandara-api/client.ts` — added API key client methods
- `lib/mandara-api/types.ts` — added API key types
- `lib/hooks/use-mandara-product.ts` — added `listApiKeys`, `createApiKey`, `revokeApiKey`
- `components/vault/product-dashboard.tsx` — added Agent API Keys management card
- `scripts/product-agent-api-smoke.mjs` (new) — full external API smoke test
- `docs/PRODUCT_AGENT_API.md` (new)

### Acceptance Criteria
- [x] `POST /v1/signature-requests` with valid Bearer token returns 201.
- [x] Invalid or revoked API key returns 401.
- [x] API key scoped to agent; cannot request signatures for another agent's policies.
- [x] Dashboard UI shows API key creation flow (show once, copy to clipboard).
- [x] Keys are stored as SHA-256 hashes only; raw key shown once.
- [x] Policy ambiguity handled (multiple active policies requires explicit `policyId`).
- [x] Rejected requests return 422 with `POLICY_REJECTED`; not persisted.
- [x] Agent API smoke test passes.

### Risks
- API keys are sensitive. A leak allows an attacker to request signatures within policy bounds.
- Mitigation: keys are hash-only, support revocation, and can be scoped to specific policies.

---

## P7 — Mandara TypeScript SDK

### Objective
A developer-friendly SDK that wraps the Agent API.

### Files Changed
- `packages/mandara-sdk/` (new)
  - `src/index.ts` — exports
  - `src/client.ts` — `MandaraClient` with getAgentStatus, previewSignatureRequest, requestSignature, getSignatureRequest, waitForSignature
  - `src/types.ts` — TypeScript interfaces
  - `src/errors.ts` — `MandaraApiError`, `MandaraTimeoutError`, `MandaraValidationError`
  - `src/utils.ts` — `isSigned`, `isRejected`, `assertSigned`
  - `package.json`, `tsconfig.json`
- `examples/mandara-sdk/` (new) — `basic-request.ts`, `preview-only.ts`, `wait-for-signature.ts`
- `scripts/mandara-sdk-smoke.ts` (new) — SDK smoke test
- `scripts/create-dev-agent-api-key.mjs` (new) — helper to create a dev API key
- `docs/MANDARA_SDK.md` (new)
- `package.json` — added `mandara-sdk:build`, `mandara-sdk:smoke`, `product:create-dev-agent-key`

### Acceptance Criteria
- [x] `MandaraClient` supports `getAgentStatus()`, `previewSignatureRequest()`, `requestSignature()`, `getSignatureRequest()`, `waitForSignature()`.
- [x] SDK handles API envelope parsing, network errors, and non-2xx responses via `MandaraApiError`.
- [x] `waitForSignature` polls with configurable timeout and interval; throws on terminal rejected states.
- [x] Utility functions: `isSigned`, `isRejected`, `assertSigned`.
- [x] Examples cover basic request, preview-only, and wait-for-signature flows.
- [x] SDK smoke test passes when `MANDARA_AGENT_API_KEY` is set.
- [x] Helper script creates a dev API key with one command.
- [x] Node 18+ compatible (uses global fetch); custom fetch supported.

### Risks
- API surface may still change. SDK is marked `0.1.0` and private.
- Mitigation: mark initial releases as `0.x` with breaking-change warnings.

---

## P8 — Webhooks and Audit Exports

### Objective
Real-time event delivery and compliance-ready data exports.

### Files Changed
- `packages/db/prisma/schema.prisma` — added `WebhookDeliveryStatus` enum, updated `WebhookDelivery` model, added audit event types
- `packages/core/src/schemas/webhook.ts` (new) — `CreateWebhookSchema`, `UpdateWebhookSchema`, `WebhookEventPayloadSchema`
- `packages/core/src/schemas/auditExport.ts` (new) — `AuditExportQuerySchema`
- `packages/core/src/webhooks/signing.ts` (new) — `generateWebhookSecret`, `signWebhookPayload`, `verifyWebhookSignature`
- `apps/api/src/services/webhookQueue.ts` (new) — BullMQ queue producer for webhooks
- `apps/api/src/services/webhookEvents.ts` (new) — API-side webhook scheduler
- `apps/api/src/routes/webhooks.ts` (new) — `GET/POST/PATCH/DELETE /api/webhooks`
- `apps/api/src/routes/auditEvents.ts` — added `GET /api/audit-events/export`
- `apps/api/src/routes/signingRequests.ts` — emits `signature.requested`, `signature.queued`, `signature.policy_rejected` webhooks
- `apps/api/src/routes/v1/signatureRequests.ts` — emits webhooks for external API requests
- `apps/api/src/server.ts` — registered webhook routes
- `apps/worker/src/services/webhookEvents.ts` (new) — worker-side scheduler
- `apps/worker/src/services/webhookDelivery.ts` (new) — delivery processor with HMAC signing
- `apps/worker/src/queues.ts` — added `mandara.webhook-deliveries` queue + `createWebhookWorker`
- `apps/worker/src/index.ts` — starts webhook worker
- `apps/worker/src/jobs/signingRequestJob.ts` — emits `signature.policy_rejected`, `signature.failed`
- `apps/worker/src/services/liveDevnetExecution.ts` — emits `signature.guard_approved`, `signature.ika_pending`, `signature.signed`
- `lib/mandara-api/client.ts` — added webhook and audit export methods
- `lib/mandara-api/types.ts` — added `Webhook`, `WebhookDelivery`, `CreateWebhookInput`
- `lib/hooks/use-mandara-product.ts` — exposed webhook and audit export methods
- `components/vault/webhook-management.tsx` (new) — dashboard webhook UI
- `components/vault/audit-export.tsx` (new) — dashboard audit export UI
- `components/vault/product-dashboard.tsx` — added webhook and audit export cards
- `scripts/product-webhook-smoke.mjs` (new) — full webhook + audit export smoke test
- `docs/PRODUCT_WEBHOOKS.md` (new)
- `docs/PRODUCT_AUDIT_EXPORTS.md` (new)

### Acceptance Criteria
- [x] Users can register webhook URLs and select event types via dashboard or API.
- [x] Mandara delivers signed payloads when signing requests change status.
- [x] Failed deliveries retry with exponential backoff (BullMQ attempts).
- [x] Users can export audit events as CSV or JSON (date-range filtered).
- [x] Webhook smoke test passes.
- [x] All existing smoke tests still pass.

### Risks
- Webhook endpoints may be slow or unavailable. Workers must not block on delivery.
- Mitigation: webhooks are always queued jobs, never synchronous.

---

## P9 — Hosted Devnet Beta Deployment

### Objective
Prepare the full stack for hosted devnet beta deployment: Docker images, compose stack, CI/CD, deployment docs, operations runbook, and beta checklist.

### Files Changed
- `Dockerfile.api` (new) — API multi-stage build
- `Dockerfile.worker` (new) — Worker dry-run image
- `Dockerfile.worker.devnet` (new) — Worker live-devnet image with Rust CLI binary
- `.dockerignore` (new) — exclude secrets and build artifacts
- `docker-compose.beta.yml` (new) — production-like local stack
- `.github/workflows/mandara-product-ci.yml` (new) — CI for product branch
- `scripts/product-ci-check.sh` (new) — CI-safe check script
- `scripts/product-readiness-check.sh` (new) — pre-deployment validation
- `apps/worker/src/config.ts` — added `MANDARA_WORKER_HEALTH_PORT`, `MANDARA_IKA_CLI_PATH`
- `apps/worker/src/health.ts` (new) — optional HTTP health server
- `apps/worker/src/index.ts` — integrated health server with graceful shutdown
- `apps/worker/src/services/liveDevnetExecution.ts` — supports pre-built Rust CLI path
- `apps/api/src/routes/health.ts` — added Redis connectivity check
- `apps/api/src/server.ts` — hardened error handler (no stack trace leak in production)
- `docs/PRODUCT_DEPLOYMENT.md` (new) — deployment architecture, platform guides, env vars
- `docs/PRODUCT_OPERATIONS_RUNBOOK.md` (new) — day-2 operations and incident response
- `docs/BETA_LAUNCH_CHECKLIST.md` (new) — pre-beta readiness checklist
- `docs/README.md` — added new doc links
- `package.json` — added `product:ci` and `product:readiness` scripts

### Acceptance Criteria
- [x] `Dockerfile.api` builds and starts API on port 4000.
- [x] `Dockerfile.worker` builds and starts worker in dry-run mode.
- [x] `Dockerfile.worker.devnet` builds with multi-stage Rust CLI and supports live execution.
- [x] `docker-compose.beta.yml` stacks Postgres, Redis, API, and worker with health checks.
- [x] Worker exposes optional HTTP health server (`/health`, `/ready`) on `MANDARA_WORKER_HEALTH_PORT`.
- [x] API `/ready` checks Postgres and Redis connectivity.
- [x] API error handler does not leak stack traces in production.
- [x] CI workflow runs on push/PR to `product/mandara-cloud-mvp`.
- [x] `product:readiness` script validates Dockerfiles, docs, env vars, and builds.
- [x] Deployment docs cover Render, Fly, Railway, VPS, and Vercel.
- [x] Operations runbook covers start/stop, health checks, queue inspection, incident response.
- [x] Beta checklist identifies all blockers before open beta.
- [x] No secrets baked into images; service wallet mounted as volume.
- [x] Devnet-only disclaimers present in all docs and API responses.
- [x] `npm run build` (root Next.js) still passes.
- [x] Grant demo and product dashboard remain intact.

### Risks
- Ika pre-alpha devnet may be wiped during beta. Users must be warned.
- Mitigation: clear devnet-only disclaimers in UI and docs; operations runbook includes artifact recovery steps.

---

## P10 — Product Launch Package

### Objective
Finalize the Mandara devnet beta launch package: clean disk hygiene, product launch docs, landing page copy, developer onboarding, customer demo script, pricing hypothesis, final product audit, and launch readiness checks.

### Files Changed
- `scripts/clean-dev-disk.sh` (new) — safe dev environment cleanup
- `scripts/product-launch-check.sh` (new) — launch readiness validation
- `docs/PRODUCT_LAUNCH_PACKAGE.md` (new) — product positioning, problem, solution, users, use cases, demo proof
- `docs/LANDING_PAGE_COPY.md` (new) — hero headlines, feature sections, FAQ, footer
- `docs/DEVELOPER_ONBOARDING.md` (new) — 10-minute guide from zero to first signature
- `docs/CUSTOMER_DEMO_SCRIPT.md` (new) — 10-min and 3-min demo scripts with objection handling
- `docs/PRICING_HYPOTHESIS.md` (new) — beta pricing model (Dev Sandbox, Builder, Team, Enterprise)
- `docs/PRODUCT_FINAL_AUDIT.md` (new) — build results, security status, beta blockers, go/no-go
- `docs/BETA_LAUNCH_CHECKLIST.md` — updated with P9/P10 completion status
- `docs/README.md` — added Product Launch section
- `.dockerignore` — added `examples` and additional cache exclusions to reduce build context
- `package.json` — added `clean:dev-disk` and `product:launch-check` scripts

### Acceptance Criteria
- [x] Disk cleanup performed safely; critical artifacts preserved.
- [x] Docker context reduced by excluding `examples`, logs, and test scripts.
- [x] `product:ci` passes after cleanup.
- [x] `product:readiness` passes after cleanup.
- [x] Product launch package doc covers name, tagline, problem, solution, users, use cases, demo proof, next milestones.
- [x] Landing page copy includes hero options, feature sections, how-it-works, FAQ, footer.
- [x] Developer onboarding guide gets a developer to first signature in 10 minutes with exact commands.
- [x] Customer demo script includes 10-minute flow, 3-minute exec flow, and objection handling.
- [x] Pricing hypothesis defines Dev Sandbox (free), Builder, Team, Enterprise tiers with mainnet transition notes.
- [x] Final product audit documents build results, security status, open risks, beta blockers, and go/no-go recommendation.
- [x] Beta checklist updated: P9/P10 items marked ✅, risky items remain ⚠️/⬜.
- [x] All new docs mention devnet-only status and Ika pre-alpha limitations.
- [x] No production custody language anywhere.
- [x] `npm run build` (root Next.js) still passes.
- [x] Grant demo and product dashboard remain intact.

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
