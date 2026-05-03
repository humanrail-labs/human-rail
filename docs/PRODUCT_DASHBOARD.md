# Mandara Product Dashboard

> Next.js dashboard integration for the Mandara product backend.  
> **Phase:** P5 — Product Dashboard MVP  
> **Last updated:** 2026-05-02

---

## Overview

The `/vault/dwallets` page now includes a **Product Dashboard** tab that displays live data from the Mandara API:

- API status and devnet lifecycle state
- Overview cards (agents, wallets, policies, signing requests, signed count)
- Create / preview / enqueue signing requests
- **Agent API key management** (create, list, revoke)
- Signing request execution detail with polling
- Agents, wallets, and policies tables

The existing grant proof UI (Ika lifecycle, Phase 4B/5D/5E, agent runtime tool) is preserved under the **Grant Proof** tab.

---

## Architecture

```
┌─────────────────┐     fetch       ┌─────────────────┐
│  Next.js App    │ ───────────────►│  Mandara API    │
│  /vault/dwallets│                 │  (localhost:4000)│
│                 │◄─────────────── │                 │
└─────────────────┘   JSON + dev auth └─────────────────┘
       │                                    │
       │ import                            │ Prisma
       ▼                                    ▼
┌─────────────────┐                  ┌─────────────────┐
│  useMandara     │                  │  PostgreSQL     │
│  Product hook   │                  │  (Docker)       │
└─────────────────┘                  └─────────────────┘
```

---

## Environment Variables

Add to `.env.local` or `.env.example`:

```bash
# Mandara Product API (public frontend vars)
NEXT_PUBLIC_MANDARA_API_URL=http://localhost:4000
NEXT_PUBLIC_MANDARA_DEV_USER=dev@local
```

These are **public** vars (`NEXT_PUBLIC_`) used only by the browser. No secrets.

---

## How to Start

### 1. Start infrastructure

```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
```

### 2. Start API

```bash
npm run product:api:dev
```

### 3. Start Next.js dev server

```bash
npm run dev
```

### 4. Open dashboard

Navigate to:
```
http://localhost:3000/vault/dwallets
```

The **Product Dashboard** tab is the default.

---

## Create / Preview / Enqueue Flow

1. **Select agent and policy** from dropdowns.
2. **Fill request fields** (chain, asset, recipient, amount, message).
3. Click **Preview** to evaluate against policy without creating a record.
4. Click **Create Request** to persist the signing request.
5. Click **Enqueue** to add it to the BullMQ queue.
6. The backend worker will process it (dry-run by default).

> **Note:** Live on-chain signing requires the worker to be running with `MANDARA_WORKER_MODE=live-devnet` and `MANDARA_ENABLE_LIVE_EXECUTION=true`.

---

## Polling

Select a signing request and click **Poll status** to auto-refresh execution details every 4 seconds for up to 2 minutes. Polling stops when the request reaches a terminal state (`signed`, `policy_rejected`, `failed`).

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Mandara API is not running" | API server not started | Run `npm run product:api:dev` |
| Empty dropdowns | DB not seeded | Run `npm run product:import-devnet-artifacts` |
| Request stuck in `queued` | Worker not running | Run `npm run product:worker:dev` |
| Preview rejected | Amount exceeds policy limit | Reduce amount or adjust policy |
| Live signing not happening | Worker gates closed | Set `MANDARA_WORKER_MODE=live-devnet` + `MANDARA_ENABLE_LIVE_EXECUTION=true` |

---

## Files

| File | Purpose |
|------|---------|
| `lib/mandara-api/config.ts` | API base URL and dev user |
| `lib/mandara-api/client.ts` | Typed fetch methods |
| `lib/mandara-api/types.ts` | TypeScript interfaces |
| `lib/hooks/use-mandara-product.ts` | React hook for dashboard data |
| `components/vault/product-dashboard.tsx` | Dashboard UI component |
| `app/vault/dwallets/page-client.tsx` | Page shell with tabs |
| `apps/api/src/routes/agents.ts` | Dashboard API key management routes |
| `apps/api/src/lib/apiKeys.ts` | Key generation and hashing utilities |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
