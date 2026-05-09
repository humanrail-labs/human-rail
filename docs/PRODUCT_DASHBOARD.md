# Mandara Product Dashboard

> Next.js dashboard integration for the Mandara product backend.  
> **Phase:** P11 — Product Frontend Rebuild  
> **Last updated:** 2026-05-04

---

## Overview

## Routes

| Route | Audience | Features |
|---|---|---|
| `/mandara` | Public | Product landing page with value prop, features, devnet disclaimer |
| `/mandara/app` | Users | Console dashboard with setup progress, overview cards, recent requests, activity log |
| `/mandara/app/onboarding` | Users | Guided 7-step wizard: agent → wallet → mandate → API key → test request |
| `/mandara/app/agents` | Users | Agent list and status |
| `/mandara/app/agent-chat` | Users | Natural-language Agent Chat for Signature Request proposals with approve/reject cards |
| `/mandara/app/requests` | Users | Signature requests with human-readable status and execution detail |
| `/mandara/app/activity` | Users | Audit activity log in plain English |
| `/vault/dwallets` | Technical | **Preserved** — Advanced Technical Proof view with PDA derivations, Ika program details, on-chain transactions |

The `/vault/dwallets` page now includes a **Product Dashboard** tab that displays live data from the Mandara API. The new `/mandara/app` console is the primary entry point for non-technical users.

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

## Agent Chat Flow

Agent Chat lets users ask an Agent to prepare a Signature Request in natural language. The assistant extracts structured fields, previews the request against the Mandate, and presents a proposal card.

User approval is required before creating or enqueueing requests. The LLM never signs, never receives secrets, and cannot bypass policy preview. The browser never receives LLM provider keys and does not call Solana or Ika directly.

Agent Chat is Mandara-scoped. Out-of-scope general LLM requests are refused before any provider call. P12 also adds `/api/subscription` for plan limits and monthly usage tracking; Solana-native subscription payments are planned for P13 and are not implemented yet.

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
| `components/mandara/agent-chat.tsx` | Agent Chat UI |
| `apps/api/src/routes/agentChat.ts` | Agent Chat API routes |
| `components/vault/product-dashboard.tsx` | Dashboard UI component |
| `app/vault/dwallets/page-client.tsx` | Page shell with tabs |
| `apps/api/src/routes/agents.ts` | Dashboard API key management routes |
| `apps/api/src/lib/apiKeys.ts` | Key generation and hashing utilities |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
## Current Mandara Console Boundary

The Mandara Console is the product UI at `/mandara/app`. It does not require a connected browser wallet. Users manage organizations, agents, signing wallets, mandates, signature requests, activity, and webhooks through the Mandara API.

Advanced protocol and grant proof views are intentionally isolated behind `/advanced` and the `/vault/*` protocol routes. Those pages may require a Solana wallet and may show HumanRail Protocol, PDA, CPI, MessageApproval, and Ika internals. Normal product navigation should not send users directly into wallet-gated protocol pages.

Local dashboard use requires the product API to be running:

```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:dev
```

Mandara is devnet beta only. Ika is pre-alpha with a mock signer. Do not describe the system as production custody.
