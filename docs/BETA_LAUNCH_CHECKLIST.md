# Mandara Devnet Beta Launch Checklist

> **Branch:** `product/mandara-cloud-mvp`  
> **Goal:** Verify readiness before inviting external users to the devnet beta.  
> **Status:** Ika pre-alpha mock signer. Devnet only. Not production custody.  
> **Last updated:** 2026-05-04

---

## 1. Infrastructure

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | API deploys successfully from `Dockerfile.api` | ⬜ | |
| 1.2 | Worker deploys successfully from `Dockerfile.worker` | ⬜ | Dry-run default |
| 1.3 | Live-devnet worker image builds (`Dockerfile.worker.devnet`) | ⬜ | Rust CLI included |
| 1.4 | `docker-compose.beta.yml` starts all services locally | ⬜ | |
| 1.5 | Postgres is hosted with backups | ⬜ | Supabase / Neon / RDS |
| 1.6 | Redis is hosted with persistence | ⬜ | Upstash / Redis Cloud |
| 1.7 | Dashboard deploys to Vercel with `NEXT_PUBLIC_MANDARA_API_URL` | ⬜ | |
| 1.8 | CI passes on `product/mandara-cloud-mvp` pushes | ⬜ | `.github/workflows/mandara-product-ci.yml` |
| 1.9 | Health checks (`/health`, `/ready`, `/version`) respond correctly | ⬜ | API + worker |
| 1.10 | Database migrations run successfully on hosted Postgres | ⬜ | `prisma migrate deploy` |

---

## 2. Security

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | No secrets committed to git | ⬜ | Verified by `scripts/product-readiness-check.sh` |
| 2.2 | `.env.product` is in `.gitignore` | ⬜ | |
| 2.3 | Service wallet is mounted as secret volume, not baked into image | ⬜ | |
| 2.4 | dWallet artifact is mounted as read-only volume | ⬜ | |
| 2.5 | API error handler does not leak stack traces in production | ⬜ | `apps/api/src/server.ts` |
| 2.6 | Agent API keys are stored as SHA-256 hashes only | ⬜ | ✅ Already implemented |
| 2.7 | Webhook secrets are **plaintext** (documented as MVP-only) | ⚠️ | Must encrypt before production |
| 2.8 | Dev auth header (`x-mandara-dev-user`) is active | ⚠️ | Must replace or gate before open beta |
| 2.9 | CORS origin is restricted to dashboard domain | ⬜ | `MANDARA_CORS_ORIGIN` |
| 2.10 | Rate limiting is **not yet implemented** | ⚠️ | Required before open beta |

---

## 3. Devnet Limitations (Non-Negotiable Disclaimers)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | All UI, docs, and API responses state "devnet only" | ⬜ | |
| 3.2 | All UI, docs, and API responses state "Ika pre-alpha mock signer" | ⬜ | `/version` endpoint includes disclaimer |
| 3.3 | No production custody language anywhere | ⬜ | |
| 3.4 | No mainnet program IDs or RPC URLs in config | ⬜ | |
| 3.5 | Service wallet is explicitly devnet-only | ⬜ | |

---

## 4. Documentation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | `docs/PRODUCT_DEPLOYMENT.md` is complete and accurate | ⬜ | |
| 4.2 | `docs/PRODUCT_OPERATIONS_RUNBOOK.md` is complete | ⬜ | |
| 4.3 | `docs/BETA_LAUNCH_CHECKLIST.md` is complete | ⬜ | This file |
| 4.4 | `docs/PRODUCT_LOCAL_SETUP.md` still works | ⬜ | Local dev not broken |
| 4.5 | `docs/PRODUCT_WORKER.md` reflects current worker architecture | ⬜ | |
| 4.6 | `docs/PRODUCT_IMPLEMENTATION_PLAN.md` marks P9 complete | ⬜ | |

---

## 5. Onboarding

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | New org can be created via API | ⬜ | `POST /api/orgs` |
| 5.2 | New agent can be created and linked to org | ⬜ | `POST /api/agents` |
| 5.3 | Wallet can be imported via API | ⬜ | `POST /api/wallets/import` |
| 5.4 | Policy can be created via API | ⬜ | `POST /api/policies` |
| 5.5 | Signing request can be previewed, created, enqueued | ⬜ | Dashboard + API |
| 5.6 | Worker processes dry-run jobs successfully | ⬜ | |
| 5.7 | Live-devnet signing produces on-chain signature | ⬜ | Verified end-to-end |
| 5.8 | Webhooks deliver events to registered URLs | ⬜ | |
| 5.9 | Audit export returns CSV/JSON | ⬜ | |
| 5.10 | Agent API key can be created, used, and revoked | ⬜ | `POST /v1/signature-requests` |

---

## 6. Monitoring

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | API logs are structured JSON | ⬜ | Fastify built-in + custom logger |
| 6.2 | Worker logs are structured JSON | ⬜ | `apps/worker/src/lib/logger.ts` |
| 6.3 | Log aggregation is configured (platform-native or external) | ⬜ | Render/Fly logs, or Datadog/etc. |
| 6.4 | Error monitoring service is connected (e.g., Sentry) | ⬜ | **Required before open beta** |
| 6.5 | Health check alerts are configured | ⬜ | `/ready` failing → page on-call |

---

## 7. Support

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Support channel exists (Discord / Slack / email) | ⬜ | |
| 7.2 | FAQ covers devnet wipes and artifact recovery | ⬜ | |
| 7.3 | Known issues doc is public | ⬜ | |
| 7.4 | Escalation path to engineering is documented | ⬜ | |

---

## 8. Legal / Compliance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | Terms of Service mention devnet-only status | ⬜ | |
| 8.2 | Privacy Policy covers audit event retention | ⬜ | |
| 8.3 | No financial services or custody claims | ✅ | Devnet beta; no real assets |
| 8.4 | Beta disclaimer is shown on first dashboard visit | ⬜ | |

---

## 9. Before Mainnet (Future Phase)

These items are **NOT** required for devnet beta but must be completed before any mainnet consideration:

| # | Item | Priority |
|---|------|----------|
| 9.1 | Replace dev auth with Clerk / Supabase Auth | Critical |
| 9.2 | Encrypt webhook secrets at rest (AES-256-GCM + KMS) | Critical |
| 9.3 | Implement rate limiting per API key | Critical |
| 9.4 | Implement billing / usage metering | Critical |
| 9.5 | HumanRail Guard program audited by third party | Critical |
| 9.6 | Ika mainnet launch + real MPC signer | Critical |
| 9.7 | Re-deploy all programs to mainnet-beta | Critical |
| 9.8 | Secret manager for service wallet (e.g., AWS Secrets Manager) | High |
| 9.9 | Hosted Postgres/Redis backups with PITR | High |
| 9.10 | Error monitoring (Sentry) | High |
| 9.11 | Remove dWallet artifact filesystem dependency | Medium |
| 9.12 | Multi-region API deployment | Medium |
| 9.13 | SOC 2 / security audit | Medium |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| Security Review | | | |
| Product Lead | | | |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
