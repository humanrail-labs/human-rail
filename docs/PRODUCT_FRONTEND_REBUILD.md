# Product Frontend Rebuild (P11A/B)

## Overview

The Mandara frontend has been rebuilt to support non-technical users while preserving the existing technical grant/proof UI.

## New Route Map

| Route | Purpose |
|---|---|
| `/mandara` | Public product landing page |
| `/mandara/app` | Console dashboard (product home) |
| `/mandara/app/onboarding` | Guided 7-step onboarding wizard |
| `/mandara/app/agents` | Agent list |
| `/mandara/app/requests` | Signature request list with execution detail |
| `/mandara/app/activity` | Audit/activity log |
| `/vault/dwallets` | **Preserved** — Advanced Technical Proof view |

## User Language Map

| Product Term | Technical Term | Where Used |
|---|---|---|
| Agent | AI agent identity | Everywhere |
| Signing Wallet | Ika dWallet | Onboarding, console |
| Mandate | GuardedPolicy / policy | Onboarding, console |
| Signature Request | SigningRequest | Requests page |
| Approval | MessageApproval | Execution detail (advanced) |
| Activity Log | Audit events | Activity page |
| Connection Key | Agent API key | Onboarding step 5 |

Technical terms (PDA, CPI, MessageApproval, GuardSigningRequest) are hidden by default and only shown in `/vault/dwallets`.

## Onboarding Flow

1. **Welcome** — Explains what the wizard does
2. **Create Agent** — POST `/api/agents`
3. **Import Wallet** — POST `/api/wallets/import` (or select existing)
4. **Create Mandate** — POST `/api/policies`
5. **Create Connection Key** — POST `/api/agents/:id/api-keys`
6. **Test Request** — Preview, create, enqueue signing request
7. **Done** — Summary with env vars and SDK snippet

## Non-Technical UX Principles

- Plain-English labels instead of technical jargon
- Step-by-step wizard with clear progress indicators
- Human-readable status badges ("Rejected by mandate" instead of "policy_rejected")
- Setup completion progress bar on dashboard
- Clear error messages with setup instructions when API is unavailable
- Always-visible devnet disclaimer

## API Dependencies

The new frontend uses the same Mandara API as the technical dashboard:

- `GET /health`
- `GET /api/product/devnet-demo`
- `GET /api/orgs`
- `POST /api/orgs`
- `GET /api/agents`
- `POST /api/agents`
- `GET /api/wallets`
- `POST /api/wallets/import`
- `GET /api/policies`
- `POST /api/policies`
- `POST /api/signing-requests/preview`
- `POST /api/signing-requests`
- `POST /api/signing-requests/:id/enqueue`
- `GET /api/signing-requests/:id/execution`
- `POST /api/agents/:id/api-keys`
- `GET /api/audit-events`

## Devnet Disclaimer

All new UI surfaces include the standard disclaimer:

> Devnet beta · Ika pre-alpha mock signer · Not production custody

## How to Test

1. Start the local stack:
   ```bash
   npm run product:docker:up
   npm run product:db:push
   npm run product:import-devnet-artifacts
   npm run product:api:dev
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000/mandara

4. Run smoke test:
   ```bash
   npm run product:frontend:smoke
   ```

## P11A: Routing and Navigation Cleanup

### Goal
Make Mandara the primary user-facing product experience and move old HumanRail protocol views out of the normal user path.

### Changes

**Root page (`/`):**
- Primary CTA: "Open Mandara Console" → `/mandara/app`
- Secondary CTA: "Start Onboarding" → `/mandara/app/onboarding`
- Technical CTA: "Advanced Technical Proof" → `/vault/dwallets`
- Removed: "Launch Vault" primary CTA
- Removed: "View Demo Agent" broken hardcoded CTA

**Top navbar (`components/layout/navbar.tsx`):**
- Main nav: Mandara, Console, Onboarding
- Advanced dropdown: Technical Proof, Protocol Human, Protocol Agent, Delegation, Receipts, HumanPay, DataBlink, Documents
- Hidden from main nav: old protocol links no longer have equal prominence

**Wallet dropdown (`components/wallet/wallet-button.tsx`):**
- "Mandara Console" → `/mandara/app`
- "Advanced Protocol Vault" → `/vault`

**Vault sidebar (`components/dashboard/sidebar.tsx`):**
- Subtitle: "Advanced Protocol Explorer"
- Added amber notice banner explaining this is protocol explorer mode
- Added prominent "Mandara Console" link
- Renamed items: My Identity → Protocol Identity, My Agents → Protocol Agents, etc.

**`/vault/dwallets` banner:**
- Upgraded to "Advanced Technical Proof" banner with FlaskConical icon
- Two buttons: Open Mandara Console + Start Onboarding

**New `/advanced` route:**
- Hub page linking to all protocol proof pages and rails
- Used by Mandara app shell "Advanced Proof" nav item

**No protocol pages were deleted.** All old routes remain accessible.

## Files Added/Changed

### New Routes
- `app/mandara/page.tsx`
- `app/mandara/app/layout.tsx`
- `app/mandara/app/page.tsx`
- `app/mandara/app/onboarding/page.tsx`
- `app/mandara/app/agents/page.tsx`
- `app/mandara/app/requests/page.tsx`
- `app/mandara/app/activity/page.tsx`
- `app/advanced/page.tsx`
- `app/api/rpc/route.ts`

### New Components
- `components/mandara/landing-page.tsx`
- `components/mandara/app-shell.tsx`
- `components/mandara/console-dashboard.tsx`
- `components/mandara/onboarding-wizard.tsx`
- `components/mandara/agent-connection-guide.tsx`

### Updated Components
- `lib/mandara-api/client.ts` — Added createAgent, importWallet, createPolicy, createOrganization
- `lib/mandara-api/types.ts` — Added create input types
- `lib/hooks/use-mandara-product.ts` — Added mutations and org state
- `lib/solana/providers.tsx` — RPC proxy security fix
- `app/vault/dwallets/page-client.tsx` — Added Advanced Technical Proof banner
- `app/page-client.tsx` — Mandara-first CTAs
- `components/layout/navbar.tsx` — Product nav + Advanced dropdown
- `components/wallet/wallet-button.tsx` — Fixed routes
- `components/dashboard/sidebar.tsx` — Protocol explorer positioning
- `components/mandara/app-shell.tsx` — Links to /advanced

### New Scripts
- `scripts/product-frontend-smoke.mjs`

### Updated Docs
- `docs/PRODUCT_FRONTEND_REBUILD.md`
- `docs/PRODUCT_DASHBOARD.md`
- `docs/DEVELOPER_ONBOARDING.md`
- `docs/PRODUCT_IMPLEMENTATION_PLAN.md`
- `docs/README.md`
