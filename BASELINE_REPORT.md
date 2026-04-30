# HumanRail Baseline Report

Generated: 2026-04-30
Branch: `grant/ika-guarded-dwallets`

## Environment

| Tool | Version |
|------|---------|
| Node | v24.11.1 |
| npm | 11.6.2 |

## Build & Lint

### `npm run lint`
- **Result:** FAILED (exit code 1)
- **Problems:** 158 total
  - 92 errors
  - 66 warnings
- **Categories of pre-existing issues:**
  - `no-html-link-for-pages`: several `<a>` tags used instead of Next `<Link />`
  - `no-explicit-any`: multiple `any` types in hooks and pages
  - `react-hooks/rules-of-hooks`: conditional hook calls in `vault/agents/new/page-client.tsx`
  - `react-hooks/purity`: `Date.now()` called during render + `setState` in effects
  - `no-require-imports`: `require()` in compiled `dist/` files under `packages/sdk/dist/` and `packages/agent/dist/`
  - `no-unused-vars`: numerous unused imports/variables

### `npm run build`
- **Result:** SUCCESS (exit code 0)
- **Next.js version:** 16.1.6 (Turbopack)
- **Warnings during build:**
  - `eslint` configuration in `next.config.ts` is no longer supported
  - Unrecognized key in `next.config.ts`: `eslint`
  - The "middleware" file convention is deprecated; use "proxy" instead
- **Routes generated:** 26 pages (static + dynamic)

## Existing Routes

### Vault (product shell)
- `/vault` — Home / overview
- `/vault/identity` — Human identity management
- `/vault/agents` — Agent registry list
- `/vault/agents/new` — Deploy agent wizard
- `/vault/agents/[agentId]` — Agent detail
- `/vault/agents/[agentId]/chat` — Agent chat
- `/vault/capabilities` — Delegation / capabilities
- `/vault/payments` — HumanPay payments
- `/vault/activity` — Receipts / audit trail

### Legacy Dashboard
- `/dashboard` — Overview
- `/dashboard/identity`
- `/dashboard/agents`
- `/dashboard/delegation`
- `/dashboard/payments`
- `/dashboard/documents`
- `/dashboard/receipts`

### Public Pages
- `/` — Landing page
- `/agent` — Public agent list
- `/agent/[agentId]` — Public agent profile
- `/human` — Public human list
- `/human/[humanId]` — Public human profile
- `/delegation` — Public delegation explorer
- `/receipts` — Public receipt explorer
- `/rails/datablink` — DataBlink UI
- `/rails/documents` — Document Registry UI
- `/rails/humanpay` — HumanPay UI

## Existing Packages

| Package | Path | Description |
|---------|------|-------------|
| `@humanrail/sdk` | `packages/sdk/` | TypeScript SDK for on-chain reads/writes |
| `@humanrail/agent` | `packages/agent/` | LLM agent runtime (Claude/OpenAI) |

## On-Chain Programs

### Deployed Devnet Programs (configured in `lib/programs/index.ts`)
| Program | Address |
|---------|---------|
| Human Registry | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` |
| Agent Registry | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` |
| Delegation | `DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT` |
| HumanPay | `HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9` |
| DataBlink | `GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX` |
| Document Registry | `8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28` |
| Receipts | `EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM` |

## Rust / Anchor / Solana Toolchain

| Tool | Present? | Notes |
|------|----------|-------|
| `rustc` | NO | No Rust toolchain installed |
| `solana` CLI | NO | Not installed |
| `anchor` CLI | NO | Not installed |
| `.rs` source files | NO | No on-chain program source in repo |
| `Cargo.toml` | NO | No Rust workspace |
| `Anchor.toml` | NO | No Anchor configuration |

**Conclusion:** This repository is a **pure Next.js frontend + TypeScript SDK monorepo**. There are **no on-chain program sources** here. Any new Solana program (e.g., the HumanRail dWallet Guard) would need to be added as a **new workspace member** or a **separate repository**.

## Feasibility of Adding an On-Chain Program

### Option A: Add Rust/Anchor workspace inside this repo
- **Feasible:** Yes, but requires significant tooling addition (Rust, Solana CLI, Anchor CLI).
- **Pros:** Single repo for grant submission; easy to demo end-to-end.
- **Cons:** Pollutes a frontend-focused repo; CI becomes complex.

### Option B: Separate repo for the dWallet Guard program
- **Feasible:** Yes.
- **Pros:** Clean separation; program can be built/deployed independently.
- **Cons:** Slightly more overhead for grant reviewers to navigate two repos.

### Recommendation for Phase 0
Document the architecture assuming a new program will be created. Do **not** add Rust tooling yet unless instructed. The grant demo can reference the planned program by architecture and CPI design without requiring it to be compiled in this repo.
