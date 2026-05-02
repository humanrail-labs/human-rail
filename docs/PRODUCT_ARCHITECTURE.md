# Mandara Product Architecture

> **Product:** Mandara by HumanRail  
> **Positioning:** Hosted control plane for AI agents that need policy-governed cross-chain signing.  
> **Status:** P0 — Architecture audit and planning phase. No backend code changes yet.  
> **Last updated:** 2026-05-02

---

## 1. Product Name and Positioning

**Mandara** is the product layer that makes the HumanRail Protocol + Ika infrastructure usable by developers and teams.

- **HumanRail** provides identity, agent authority, policy, freeze, and audit (on-chain).
- **Ika** provides dWallet signing and custody infrastructure (cross-chain, pre-alpha).
- **Mandara** is the hosted control plane: organizations, dashboards, API keys, webhooks, and async job workers.

A developer using Mandara should be able to:

1. Sign up and create an organization.
2. Create an AI agent.
3. Create or connect an Ika dWallet.
4. Define a signing policy (chain, asset, recipient, limits, expiry).
5. Give the agent an API key.
6. Have the agent call the Mandara API to request a signature.
7. Watch Mandara check policy through the HumanRail Guard on-chain.
8. See Ika sign if approved.
9. View the full audit trail in the dashboard.

---

## 2. Current Protocol Assets Reused

The grant implementation is complete and must remain intact. The following assets are carried forward into the product:

| Asset | Location | Reuse in Product |
|-------|----------|------------------|
| HumanRail dWallet Guard program | `programs/humanrail-dwallet-guard/` | Deployed on devnet; no changes needed for P0–P3 |
| Ika client + parsers | `lib/ika/` | Reused by frontend and backend workers |
| dWallet Guard instructions | `lib/dwallet-guard/instructions.ts` | Reused by frontend and API |
| SDK (`@humanrail/sdk`) | `packages/sdk/` | Consumed by API, dashboard, and agent runtime |
| Agent runtime (`@humanrail/agent`) | `packages/agent/` | Evolves into Mandara agent SDK; server mode reused |
| Rust DKG / Sign CLI | `tools/ika-dkg-cli/` | Reused by backend workers until Ika ops are fully wrapped |
| Grant demo route | `/vault/dwallets` | Preserved unchanged |
| Grant docs | `docs/GRANT_SUBMISSION.md`, etc. | Preserved unchanged |

---

## 3. Target Product Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER / TEAM                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │  Dashboard  │  │  Mandara    │  │  Agent (external process)   │  │
│  │  (Next.js)  │  │  TS SDK     │  │  calls Mandara API          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬──────────────┘  │
│         │                │                        │                  │
│         └────────────────┼────────────────────────┘                  │
│                          ▼                                          │
│              ┌─────────────────────┐                                │
│              │   Mandara API       │                                │
│              │   (Fastify)         │                                │
│              │   · org / user auth │                                │
│              │   · agent CRUD      │                                │
│              │   · policy CRUD     │                                │
│              │   · signing req     │                                │
│              └──────────┬──────────┘                                │
│                         │                                           │
│         ┌───────────────┼───────────────┐                          │
│         ▼               ▼               ▼                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │  Postgres  │  │   Redis    │  │  Solana    │                    │
│  │  (Prisma)  │  │  (BullMQ)  │  │   devnet   │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
│                                                         │          │
└─────────────────────────────────────────────────────────┼──────────┘
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         WORKER LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Ika Worker (BullMQ)                                        │    │
│  │  · Polls signing requests from DB                           │    │
│  │  · Calls HumanRail Guard on-chain                           │    │
│  │  · Spawns Rust CLI or uses gRPC directly                    │    │
│  │  · Updates signature status in DB                           │    │
│  │  · Emits webhooks                                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend Services

### 4.1 Mandara API (`apps/api/` — proposed)

- **Framework:** Fastify (lightweight, Zod-native, good DX)
- **Responsibilities:**
  - Organization and user management
  - Agent CRUD + API key issuance
  - dWallet and policy CRUD
  - Signing request intake
  - Webhook registration and delivery queuing
  - Read-only queries for dashboard

### 4.2 Dashboard Frontend (`apps/web/` — proposed, currently root)

- **Current:** Next.js 16 app at repository root (`app/`, `components/`, `lib/`)
- **Future:** Migrate into `apps/web/` when workspace migration is safe
- **Responsibilities:**
  - Organization onboarding
  - Agent, wallet, policy management UI
  - Signing request audit trail
  - Devnet artifact inspection (preserves `/vault/dwallets`)

### 4.3 Worker (`apps/worker/` — proposed)

- **Framework:** Fastify or standalone Node.js process with BullMQ consumers
- **Responsibilities:**
  - Consume `signing-request` jobs from Redis
  - Build and submit on-chain transactions (Guard CPI + Ika)
  - Poll for on-chain confirmation
  - Update DB with status and signatures
  - Trigger webhook deliveries

---

## 5. Database Model Draft

See [`PRODUCT_DATABASE_MODEL.md`](PRODUCT_DATABASE_MODEL.md) for the full schema.

At a high level:

- **organizations** — billing tier, slug
- **users** — auth identity (Clerk/Supabase Auth/etc.)
- **memberships** — org membership + role
- **agents** — linked to org, mapped to on-chain Agent Registry PDA
- **agent_api_keys** — hashed keys with scopes and expiry
- **ika_dwallets** — on-chain dWallet PDA, curve, public key, authority status
- **guarded_policies** — on-chain GuardedDwallet PDA, policy limits, freeze state
- **signing_requests** — request lifecycle, digests, amounts, rejection codes
- **message_approvals** — Ika MessageApproval PDA reference + signature bytes
- **audit_events** — immutable log of every significant action
- **webhooks** — endpoint, secret, event types
- **webhook_deliveries** — delivery attempts, statuses, retries
- **integration_secrets** — encrypted RPC endpoints, custom Ika config

---

## 6. API Surface Draft

See [`PRODUCT_API_DESIGN.md`](PRODUCT_API_DESIGN.md) for the full design.

**Internal Dashboard API** (cookie/session auth):
- `GET /api/orgs`, `POST /api/orgs`
- `GET /api/agents`, `POST /api/agents`
- `GET /api/wallets`, `POST /api/wallets/ika`
- `GET /api/policies`, `POST /api/policies`
- `GET /api/signing-requests`, `POST /api/signing-requests`

**Agent API** (API key auth):
- `POST /v1/signature-requests`
- `GET /v1/signature-requests/:id`
- `GET /v1/agent/status`

**Webhook events**:
- `signature.requested`
- `signature.approved`
- `signature.signed`
- `signature.rejected`
- `agent.frozen`
- `policy.expired`

---

## 7. Worker / Job Model

BullMQ queues:

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `signing-requests` | API (on `POST /v1/signature-requests`) | Worker | Build tx, submit to Solana, poll for confirmation |
| `webhooks` | Worker (on status change) | Worker | Deliver HTTP POST to registered endpoints |
| `ika-dkg` | API (on wallet creation) | Worker | Spawn Rust CLI or gRPC call for dWallet creation |

Job idempotency keys are derived from `request_id` (on-chain) to prevent double-submit.

---

## 8. Frontend Dashboard Plan

The dashboard evolves from the current Next.js app:

| Phase | Change |
|-------|--------|
| P0–P3 | No structural changes. Preserve `/vault/dwallets`. |
| P4 | Add new dashboard routes under `/dashboard/mandara/*` or `/settings/*` for org/agent management. |
| P5 | Dashboard reads from Mandara API instead of local artifacts (`.local-ika/`). |
| P6 | API key management UI. |
| P7–P8 | Webhook configuration, audit export UI. |

---

## 9. Security Model

### 9.1 Authentication

- **Dashboard users:** Clerk or Supabase Auth (OAuth + email). Session cookies.
- **Agents:** Long-lived API keys (prefix + hash, similar to Stripe). Scoped to agent + org.

### 9.2 Authorization

- Row-level security via organization scoping on every table.
- API keys carry `agent_id` and `org_id` claims.
- Workers validate on-chain ownership before submitting transactions.

### 9.3 Secrets

- Postgres connection strings and Redis URLs in environment variables (never committed).
- API key hashes (Argon2 or bcrypt) stored in DB; plaintext never stored.
- Integration secrets encrypted at rest (AES-256-GCM with KMS key).
- `.local-ika/` and `.local-keys/` remain `.gitignore`d.

### 9.4 On-Chain Security

- HumanRail Guard program remains the policy enforcer.
- Mandara backend never holds dWallet private keys; it only instructs the Guard CPI PDA.
- Pre-alpha Ika limitation clearly communicated: mock signer, devnet only.

---

## 10. Devnet Limitations

- **Ika pre-alpha:** Single mock signer. Not production custody.
- **Devnet wipes:** Ika state may reset. Mandara must gracefully handle missing on-chain accounts.
- **No mainnet program:** HumanRail programs are deployed on devnet only.
- **Rate limits:** Devnet RPC and Ika gRPC may throttle. Workers must implement exponential backoff.

---

## 11. Mainnet Readiness Notes

| Concern | Current State | Path to Mainnet |
|---------|--------------|-----------------|
| HumanRail programs | Devnet only | Re-deploy to mainnet-beta after audit |
| Ika network | Pre-alpha mock signer | Wait for Ika mainnet launch |
| Guard program | Devnet, no formal audit | Engage auditor before mainnet |
| dWallet authority | CPI PDA controlled by Guard | Same model works on mainnet |
| Economic security | N/A (devnet SOL) | Mainnet SOL + priority fees |

---

## 12. Migration Plan: Scripts → Product Backend

Current grant scripts are developer-run TypeScript files. They migrate as follows:

| Script | Current | Product Migration |
|--------|---------|-------------------|
| `devnet-create-guarded-dwallet.ts` | CLI script | `POST /api/policies` → API creates on-chain |
| `ika-transfer-authority.ts` | CLI script | Worker job queued after dWallet creation |
| `ika-approve-guarded-message.ts` | CLI script | `POST /v1/signature-requests` → worker submits |
| `ika-sign-approved-message` (Rust) | CLI command | Worker spawns Rust CLI or uses gRPC SDK |
| `devnet-inspect-ika.ts` | CLI script | Dashboard/API reads from DB + on-chain fallback |
| `test-agent-cross-chain-tool.ts` | CLI test | Integration test suite in `apps/api/tests/` |

---

## 13. Phase-by-Phase Implementation Roadmap

See [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md) for detailed phases.

| Phase | Goal | Estimate |
|-------|------|----------|
| P0 | Architecture audit (this doc) | 1 day |
| P1 | Backend API + Prisma DB foundation | 3–4 days |
| P2 | Persist Ika / HumanRail artifacts in DB | 2 days |
| P3 | Organization / agent / policy / request APIs | 3–4 days |
| P4 | Ika worker jobs (DKG, sign, poll) | 4–5 days |
| P5 | Dashboard uses API instead of local artifacts | 3 days |
| P6 | Agent API keys + external signing endpoint | 3 days |
| P7 | Mandara TypeScript SDK | 2–3 days |
| P8 | Webhooks and audit exports | 3 days |
| P9 | Hosted devnet beta deployment | 2–3 days |
| P10 | Product launch docs | 2 days |

---

## 14. Monorepo Structure Decision

### Current State

- **Not an npm workspace.** Root `package.json` is a single Next.js app with two local file dependencies (`packages/sdk`, `packages/agent`).
- Package manager: **npm** (`package-lock.json`).
- No Docker, no Prisma, no Fastify, no Redis/BullMQ.

### Recommended Future Structure (P1+)

```
apps/
  web/        # Current Next.js app (migrated from root when safe)
  api/        # Fastify backend
  worker/     # Background job workers

packages/
  sdk/        # Existing on-chain SDK
  agent/      # Existing agent runtime
  db/         # Prisma schema + generated client
  core/       # Shared types, Zod schemas, constants
  ui/         # Shared React components (future)

programs/
  humanrail-dwallet-guard/   # Anchor program (unchanged)

tools/
  ika-dkg-cli/               # Rust CLI (unchanged)
```

### P0 Decision

**Do NOT move the current Next.js app in this phase.**

- The grant demo must remain intact.
- `npm run build` and `npm run final:check` must continue to pass.
- Moving files risks breaking imports, Next.js routing, and Tailwind config.
- In P1, introduce `apps/api/` and `packages/db/` as new directories. Migrate `app/` → `apps/web/` only after the backend is proven and workspace tooling (Turborepo or npm workspaces) is configured.

---

## 15. Backend Stack Recommendation

| Layer | Choice | Rationale |
|-------|--------|-----------|
| API framework | **Fastify** | Faster than Express, excellent TypeScript support, built-in schema validation |
| ORM | **Prisma** | Type-safe queries, excellent migration story, good Postgres support |
| Database | **PostgreSQL** | ACID compliance, JSONB for flexible metadata, great hosted options (Supabase, Neon, RDS) |
| Jobs / queues | **BullMQ** on **Redis** | Reliable, supports delayed jobs, retries, and job progress |
| Validation | **Zod** | Already a transitive dependency, perfect for API contracts |
| Auth (users) | **Clerk** or **Supabase Auth** | OAuth, MFA, session management out of the box |
| Auth (agents) | **API keys** (hash + prefix) | Simple, stateless, easy to rotate |
| Ika operations | **Rust CLI** (initially) | Reuse `tools/ika-dkg-cli/`, wrap with Node.js `child_process` or gRPC client later |

---

*End of document. Next: [`PRODUCT_DATABASE_MODEL.md`](PRODUCT_DATABASE_MODEL.md)*
