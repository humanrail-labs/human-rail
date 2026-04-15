# Agent Vault — Kimi Code Build Prompt

> **Product:** Agent Vault — Delegated AI Agent Wallets with Guardrails  
> **Built on:** HumanRail Protocol (7 Anchor programs deployed on Solana Devnet)  
> **Existing codebase:** Next.js 16 + React 19, TypeScript, Tailwind CSS v4, Radix UI, Framer Motion, Solana Web3.js, Anchor, Wallet Adapter  
> **Repo context:** The HumanRail repo already has a dashboard at `/dashboard` with identity, agents, delegation, payments, documents, and receipts pages. We are transforming this protocol dashboard into a product called **Agent Vault**.

---

## IMPORTANT RULES FOR KIMI

1. **Work in phases.** Complete one phase fully before moving to the next. Do NOT scaffold everything at once.
2. **After each phase, stop and confirm** with me that it works before proceeding.
3. **Reuse existing code.** The repo already has IDLs in `lib/idl/`, program helpers in `lib/programs/`, hooks in `lib/hooks/`, and Solana provider setup in `lib/solana/`. Do NOT rewrite these — import and extend them.
4. **No placeholders.** Every component must be functional. No `// TODO`, no `placeholder`, no mock data in production paths. If data comes from on-chain, fetch it from on-chain. If a wallet isn't connected, show a proper connect state.
5. **Match existing conventions.** Check the existing codebase for patterns (file naming, component structure, import style, Tailwind usage) and follow them exactly.
6. **Test after each file.** Run `npm run build` after creating/modifying files to catch TypeScript errors immediately. Don't batch 10 files and then debug.

---

## CONTEXT: What Agent Vault Is

Agent Vault is a consumer product where a human:
1. Connects their Solana wallet
2. Verifies their identity (creates a HumanRegistry profile)
3. Spawns AI agents (AgentRegistry PDAs owned by them)
4. Issues bounded capabilities to each agent (spending limits, program scopes, time expiry)
5. Monitors agent activity in real-time (receipts, spend tracking)
6. Can emergency-freeze any agent with one click

Think of it like **Brex corporate cards, but for AI agents on Solana**. The agent gets a controlled wallet with guardrails, the human keeps full oversight.

---

## CONTEXT: Deployed Program IDs (Devnet)

```
Human Registry:    GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo
Agent Registry:    GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ
Delegation:        DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT
HumanPay:          HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9
DataBlink:         GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX
Document Registry: 8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28
Receipts:          EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM
```

These are already configured in the repo under `lib/programs/` and `lib/config/`.

---

## PHASE 1: Product Shell & Navigation Redesign

**Goal:** Transform the existing protocol dashboard into a product-feeling app with Agent Vault branding, a new navigation structure, and a home screen that tells the user what to do.

### Step 1.1 — Rebrand the navigation

Open the existing layout components in `components/layout/` and the dashboard layout in `app/dashboard/layout.tsx`. Modify:

- Rename the app title from "HumanRail" to "Agent Vault" in the sidebar/header. Keep "Powered by HumanRail Protocol" as a small subtitle or footer badge.
- Restructure the sidebar navigation into this hierarchy:

```
🏠 Home                    → /vault (new landing/overview)
👤 My Identity              → /vault/identity (existing identity page, relocated)
🤖 My Agents               → /vault/agents (existing agents page, relocated)
  └─ [Agent Detail]        → /vault/agents/[agentId] (new)
🔐 Capabilities            → /vault/capabilities (existing delegation page, relocated)
💳 Payments                → /vault/payments (existing payments page, relocated)
📋 Activity Log            → /vault/activity (existing receipts page, relocated)
```

- Use icons from `lucide-react` (already in the project).
- Active state should be visually clear (highlight + bold label).

### Step 1.2 — Create the `/vault` route group

**IMPORTANT:** The existing `middleware.ts` wallet-gates certain routes. You will need to add `/vault` routes to the middleware config so that protected vault pages require wallet connection, while public pages (`/agent/[agentId]`, `/human/[humanId]`, landing page) remain accessible without a wallet. Check `middleware.ts` first and extend it.

Create `app/vault/layout.tsx` that wraps all vault pages. This layout should:
- Include the sidebar navigation from Step 1.1
- Include a top bar showing: connected wallet address (truncated), SOL balance, network badge ("Devnet")
- Include the wallet connect button from `components/wallet/`
- Be responsive: sidebar collapses to bottom tab bar on mobile

### Step 1.3 — Build the Home page (`/vault/page.tsx`)

This is the first thing users see after connecting their wallet. It should show:

1. **Identity Status Card** — Check if the connected wallet has a HumanRegistry profile on-chain.
   - If NO profile: Show a prominent CTA card "Verify Your Identity" with a brief explanation and a button that links to `/vault/identity`.
   - If YES profile: Show a green checkmark with their display name and trust score.

2. **Agent Overview Cards** — Fetch all agents registered under this human's principal.
   - Show count: "You have X active agents"
   - Show a summary card for each agent: name, status (Active/Suspended/Revoked), total spend, capability count.
   - If no agents: Show a CTA "Deploy Your First Agent" linking to `/vault/agents`.

3. **Quick Stats Row** — Three stat cards in a row:
   - Total agents (active / suspended / revoked counts)
   - Total spend across all agents (sum from receipts)
   - Active capabilities count

4. **Recent Activity Feed** — Last 5 receipts across all agents. Each receipt shows: timestamp, agent name, action type, amount (if payment), and a link to the full receipt.

Use existing hooks from `lib/hooks/` to fetch on-chain data. If a hook doesn't exist for a specific query, create it in `lib/hooks/` following the existing pattern.

### Step 1.4 — Relocate existing pages

Move (or create wrapper routes for) existing dashboard pages into the `/vault/` route group:
- `app/dashboard/identity/` → `app/vault/identity/`
- `app/dashboard/agents/` → `app/vault/agents/`
- `app/dashboard/delegation/` → `app/vault/capabilities/`
- `app/dashboard/payments/` → `app/vault/payments/`
- `app/dashboard/receipts/` → `app/vault/activity/`

Keep the old `/dashboard` routes working (redirect to `/vault` equivalents) so nothing breaks.

**STOP HERE. Run `npm run build`, fix any errors, test in browser. Confirm with me before Phase 2.**

---

## PHASE 2: Agent Detail Page & Lifecycle Controls

**Goal:** Build the core product experience — a detailed view for each agent where the human can see everything about that agent and control it.

### Step 2.1 — Agent Detail Page (`/vault/agents/[agentId]/page.tsx`)

The `agentId` is the agent's public key (base58). This page fetches the agent's on-chain account data and displays:

**Header Section:**
- Agent name and public key (with copy button)
- Status badge: Active (green), Suspended (yellow), Revoked (red)
- Created date (from on-chain data or receipt)
- Principal (the human's public key, should match connected wallet)

**Action Buttons (in header):**
- "Suspend Agent" button (visible when status is Active) — calls the `suspend_agent` instruction
- "Reactivate Agent" button (visible when status is Suspended) — calls the `reactivate_agent` instruction
- "Revoke Agent" button (visible when status is Active or Suspended) — calls the `revoke_agent` instruction with a confirmation modal ("This action is permanent and cannot be undone")
- "🔴 Emergency Freeze" button — prominent red button that calls the freeze instruction from the Delegation program. This should freeze ALL capabilities for this agent instantly.

Each button should:
- Show a loading spinner during transaction
- Show a success toast with transaction signature (linked to Solana Explorer)
- Show an error toast if the transaction fails
- Refresh the agent data after success

### Step 2.2 — Agent Capabilities Tab

On the agent detail page, add a tabbed interface. First tab: "Capabilities"

This tab shows all capabilities (delegation accounts) issued to this agent:
- Table/list with columns: Capability name/type, Spending limit (per-tx / daily / total), Amount used, Programs allowed, Expiry date, Status (Active/Frozen/Expired)
- Each capability row is expandable to show full details: asset allowlist, max slippage, max fee, constraints
- "Issue New Capability" button that opens a form/modal:
  - Capability scope (dropdown: Payment, DataAction, DocumentSign, Custom)
  - Per-transaction limit (SOL amount input)
  - Daily limit (SOL amount input)
  - Total limit (SOL amount input)
  - Expiry (date picker, or "No expiry" toggle)
  - Allowed programs (multi-select or paste pubkeys)
  - Submit button that builds and sends the `issue_capability` transaction

### Step 2.3 — Agent Activity Tab

Second tab on agent detail page: "Activity"

- Filtered receipts for ONLY this agent
- Timeline view with newest first
- Each receipt entry shows: timestamp, action type (Payment, DataBlink, DocumentSign, etc.), amount, counterparty, transaction signature (linked to explorer)
- Pagination or "Load more" for long histories

### Step 2.4 — Agent Spend Analytics Tab

Third tab: "Analytics"

- **Spend over time** — A line chart (use recharts, already available) showing this agent's cumulative spend over the last 30 days
- **Spend by capability** — A breakdown bar or pie chart showing which capabilities consumed the most budget
- **Limit utilization** — For each active capability, show a progress bar: amount_used / total_limit with color coding (green < 50%, yellow 50-80%, red > 80%)
- **Risk indicators** — Flag if any capability is > 90% utilized or expiring within 24 hours

**STOP HERE. Run `npm run build`, fix any errors, test in browser. Confirm with me before Phase 3.**

---

## PHASE 3: Agent Deployment Wizard

**Goal:** Build a guided, step-by-step wizard for deploying a new agent. This is the core onboarding flow and must feel polished.

### Step 3.1 — Wizard Container (`/vault/agents/new/page.tsx`)

Create a multi-step wizard with a progress indicator at the top. Steps:

```
Step 1: Agent Identity  →  Step 2: Capabilities  →  Step 3: Fund Agent  →  Step 4: Review & Deploy
```

Use React state to track current step and accumulated form data. The wizard should NOT submit any transactions until Step 4.

### Step 3.2 — Step 1: Agent Identity

**Use existing validators from `lib/utils/validation.ts`** for pubkey validation, agent name validation, and XSS sanitization. Do NOT write new validation logic — the codebase already has robust validators.

Form fields:
- **Agent Name** (required, text input, max 32 chars) — This is the human-readable label
- **Agent Type** (required, select): Trading Bot, Customer Service, Data Processor, Content Creator, Custom
- **Description** (optional, textarea, max 256 chars)
- **Agent Wallet** (required): Either:
  - "Generate new keypair" (generate client-side, show the pubkey, store keypair in memory for Step 4)
  - "Use existing public key" (paste a pubkey — for when the agent runtime already has a keypair)
- **TEE Measurement** (optional, advanced toggle): Paste a TEE attestation hash if the agent runs in a trusted execution environment

"Next" button validates and moves to Step 2.

### Step 3.3 — Step 2: Capabilities

This step defines what the agent is authorized to do. Show a form that creates one capability (with an "Add another capability" button for advanced users):

- **Capability Name** (text, e.g., "Trading Budget")
- **Scope** (select: Payment, DataAction, DocumentSign, Full)
- **Per-Transaction Limit** (number input in SOL, e.g., 0.5)
- **Daily Limit** (number input in SOL, e.g., 5.0)
- **Total Budget** (number input in SOL, e.g., 50.0)
- **Expiry** (date picker with presets: 7 days, 30 days, 90 days, No expiry)
- **Allowed Programs** (optional, advanced): Multi-line textarea to paste program IDs that this agent can interact with. If empty, no program restriction.

Show a summary card below the form previewing what was configured:
```
📋 Trading Budget
   Max per tx: 0.5 SOL | Daily: 5 SOL | Total: 50 SOL
   Expires: May 15, 2026
   Programs: Unrestricted
```

### Step 3.4 — Step 3: Fund Agent

- Show the agent wallet address from Step 1
- Show the total budget from Step 2 capabilities
- Calculate estimated transaction fees (registration + capability issuance ≈ 0.01 SOL)
- Show a "Recommended funding" amount: total_capability_budget + 0.05 SOL for fees
- Option: "Fund now via transfer" (sends SOL from connected wallet to agent wallet) or "Skip — I'll fund later"
- If funding: Show a SOL amount input prefilled with the recommended amount, and a "Send SOL" button that executes a system transfer

### Step 3.5 — Step 4: Review & Deploy

Summary screen showing everything:
- Agent identity details
- Capability configuration
- Funding amount
- Estimated total transaction cost

"Deploy Agent" button that executes the following transactions IN SEQUENCE:

1. **Register Agent** — Call `register_agent` on the Agent Registry program with the agent's pubkey, metadata, and the human's wallet as principal. Wait for confirmation.
2. **Issue Capabilities** — For each capability defined in Step 2, call `issue_capability` on the Delegation program. Wait for each confirmation.
3. **Fund Agent** (if selected in Step 3) — Execute the SOL transfer.

Show a real-time progress indicator:
```
✅ Agent registered (tx: 4x7f...a2b3)
⏳ Issuing capability "Trading Budget"...
⬜ Funding agent wallet
```

On completion, show a success screen with:
- Agent public key (with copy button)
- Link to the agent detail page (`/vault/agents/[agentId]`)
- "Deploy Another Agent" button

Handle errors gracefully: if any transaction fails, show which step failed, the error message, and a "Retry" button that resumes from the failed step (don't re-execute successful steps).

**STOP HERE. Run `npm run build`, fix any errors, test in browser. Walk through the full wizard flow. Confirm with me before Phase 4.**

---

## PHASE 4: Real-Time Monitoring & Alerts

**Goal:** Add real-time elements that make the product feel alive and give the human confidence that they're in control.

### Step 4.1 — Live Activity Feed Component

Create a reusable `LiveActivityFeed` component in `components/vault/`:

- Polls for new receipts every 10 seconds (use `setInterval` + the existing receipts hook)
- New entries animate in from the top (use Framer Motion)
- Each entry shows: relative timestamp ("2 min ago"), agent name (color-coded), action type icon, amount, and a "View" link
- Show a max of 20 entries, with a "View all" link to `/vault/activity`

Place this component on the Home page (`/vault/page.tsx`) as a replacement for the static "Recent Activity" from Phase 1.

### Step 4.2 — Agent Status Indicators on Home Page

Update the agent cards on the Home page:
- Add a pulsing green dot next to "Active" agents
- Show the last activity time for each agent ("Last action: 3 hours ago")
- Show a warning badge if any capability is > 80% utilized or expiring within 48 hours

### Step 4.3 — Emergency Freeze Banner

If any agent has been frozen (emergency freeze), show a persistent yellow/red banner at the top of the vault layout:
```
⚠️ Agent "TradingBot-1" is frozen. All capabilities are suspended. [Review] [Unfreeze]
```

This banner checks the freeze status of all agents on mount and shows accordingly.

### Step 4.4 — Budget Utilization Alerts

On the Home page, add an "Alerts" section below the Quick Stats:
- List any capability where `amount_used / total_limit > 0.8` with a warning icon
- List any capability expiring within 48 hours with a clock icon
- List any agent that has been inactive for > 7 days with an info icon
- If no alerts: Show "All agents operating normally ✓"

**STOP HERE. Run `npm run build`, fix any errors, test in browser. Confirm with me before Phase 5.**

---

## PHASE 5: Landing Page & Public Agent Profiles

**Goal:** Build a public-facing landing page for Agent Vault and public agent profile pages that work without wallet connection.

### Step 5.1 — Landing Page (`/page.tsx` or `/vault-landing/page.tsx`)

Replace or supplement the existing HumanRail landing page with an Agent Vault product landing page:

**Hero Section:**
- Headline: "AI Agents with Guardrails"
- Subheadline: "Deploy, monitor, and control your AI agents on Solana. Set spending limits, define capabilities, and maintain full oversight — all on-chain."
- Primary CTA: "Launch Vault" → navigates to `/vault`
- Secondary CTA: "View Demo Agent" → links to a pre-deployed agent's public profile

**How It Works Section (3 steps):**
1. "Verify Your Identity" — Create an on-chain human profile
2. "Deploy Your Agent" — Register an agent with bounded capabilities
3. "Stay in Control" — Monitor activity, adjust limits, freeze instantly

**Features Grid (4 cards):**
- Bounded Authority: "Set per-transaction, daily, and total spending limits"
- Emergency Freeze: "One-click agent shutdown when needed"
- Full Auditability: "Every action creates an immutable on-chain receipt"
- Multi-Agent Management: "Deploy and control multiple agents from one dashboard"

**Protocol Stats (live from on-chain):**
- Total registered humans
- Total registered agents
- Total receipts created
- Show these with a counter animation on scroll-into-view

Use existing Three.js background if it fits, or build a clean, modern design with Tailwind + Framer Motion. Keep the aesthetic dark/professional — this is financial infrastructure.

### Step 5.2 — Public Agent Profile (`/agent/[agentId]/page.tsx`)

**NOTE:** Public pages already exist at `app/agent/`, `app/human/`, `app/delegation/`, and `app/receipts/` as functional mini-dashboards. Additionally, `app/rails/` has full interactive UIs for HumanPay, DataBlink, and Document Registry. **Do NOT delete or rewrite these.** Instead, check what exists first, then either enhance the existing pages or create new ones alongside them. If the existing public pages already show the data listed below, just improve their styling to match the Agent Vault branding.

A public page that anyone can view (no wallet connection required). Shows:
- Agent name, public key, status
- Principal human's public key (linked to their human profile)
- Agent type, description
- Trust score / attestation count
- Active capabilities (show types and limits, but NOT the human's spending amounts — keep privacy)
- Recent public receipts (last 10 actions)
- Registered date

This page reads directly from on-chain data using the public RPC.

### Step 5.3 — Public Human Profile (`/human/[humanId]/page.tsx`)

A public page for verified humans:
- Display name, public key
- Trust score and attestation badges
- Number of agents registered
- Agent list (links to their public profiles)
- Member since date

**STOP HERE. Full review. Run `npm run build`, test all routes, test mobile responsiveness. Confirm with me before Phase 6.**

---

## PHASE 6: Polish, Edge Cases & Production Readiness

**Goal:** Handle all edge cases, add loading/error/empty states, and prepare for production.

### Step 6.1 — Loading States

Every page and component that fetches on-chain data must have:
- A skeleton/shimmer loading state while data loads
- NOT a blank screen, NOT a spinner in the center of a blank page
- Use Tailwind's `animate-pulse` on placeholder blocks that match the shape of the real content

### Step 6.2 — Error States

Handle:
- Wallet not connected → Show a full-page "Connect Wallet" prompt with the wallet adapter button
- RPC errors (rate limit, network down) → Show a retry-able error card: "Couldn't load data. [Retry]"
- Account not found (e.g., no HumanRegistry profile) → Show the appropriate CTA (not a raw error)
- Transaction failures → Toast with error message and "View on Explorer" link to the failed tx

### Step 6.3 — Empty States

Every list/table must handle zero items:
- No agents → Illustration + "Deploy your first agent" CTA
- No capabilities → "Issue your first capability" CTA
- No receipts → "No activity yet. Receipts will appear here once your agents start transacting."
- No alerts → "All agents operating normally ✓"

### Step 6.4 — Mobile Responsiveness

Test and fix all pages for mobile (375px width):
- Sidebar → bottom tab navigation
- Tables → card-based mobile layout (stack columns vertically)
- Wizard steps → full-width, one field per row
- Agent detail tabs → horizontal scrollable tab bar
- All buttons → minimum 44px tap targets

### Step 6.5 — Metadata & SEO

Add proper metadata to all pages:
- Page titles: "Agent Vault | My Agents", "Agent Vault | Deploy Agent", etc.
- Open Graph tags for public pages (agent profiles, human profiles, landing page)
- Favicon and app icons (use a vault/shield icon concept)

### Step 6.6 — Environment & Config

Ensure `.env.example` is complete with all required variables:
```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

**NOTE ON PROGRAM IDs:** The program IDs are hardcoded in `lib/programs/index.ts` and IDL addresses are patched at runtime. `lib/config/program-config.ts` has env var mappings but the actual imports throughout the codebase use the hardcoded values from `lib/programs/index.ts`. Do NOT add program ID env vars — keep using the existing import pattern from `lib/programs/index.ts` for consistency.

**FINAL CHECKPOINT. Full build, full test, full mobile check. Report back with any issues.**

---

## REFERENCE: Existing Codebase Structure

Before starting ANY phase, run these commands to understand the current codebase:

```bash
# See the full project structure
find . -type f -name "*.tsx" -o -name "*.ts" | head -80

# Check existing components
ls -la components/
ls -la components/dashboard/
ls -la components/ui/

# Check existing lib structure
ls -la lib/
ls -la lib/idl/
ls -la lib/programs/
ls -la lib/hooks/

# Check existing routes
ls -la app/
ls -la app/dashboard/

# Check package.json for installed dependencies
cat package.json | head -40

# Check existing Tailwind and styling setup
cat tailwind.config.ts
```

ALWAYS read existing files before creating new ones. If a component or hook already exists that does what you need, USE IT. Do not duplicate functionality.

---

## REFERENCE: Transaction Pattern

**CRITICAL:** This codebase uses TWO different patterns. You MUST match the existing pattern for each program.

### Pattern A — Raw TransactionInstruction (MOST hooks use this)

Most hooks (useHumanProfile, useAgents, useCapabilities, useReceipts, useDocumentRegistry) build instructions manually with discriminators and Borsh-like data packing. **Follow this pattern when extending these hooks or building new functionality that touches these programs.**

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';

const { connection } = useConnection();
const { publicKey, sendTransaction } = useWallet();

// 1. Compute the instruction discriminator (first 8 bytes of SHA256("global:<instruction_name>"))
// Look at existing hooks for examples — they already have discriminators computed.

// 2. Build data buffer: discriminator + Borsh-encoded args
const data = Buffer.concat([discriminator, ...serializedArgs]);

// 3. Build the instruction with explicit account metas
const ix = new TransactionInstruction({
  programId: PROGRAM_ID, // from lib/programs/index.ts (hardcoded, NOT env vars)
  keys: [
    { pubkey: someAccount, isSigner: true, isWritable: true },
    // ... all accounts in the order the Anchor program expects
  ],
  data,
});

// 4. Send via wallet adapter
const tx = new Transaction().add(ix);
const signature = await sendTransaction(tx, connection);
await connection.confirmTransaction(signature, 'confirmed');
```

### Pattern B — Anchor Program methods (ONLY useDataBlink uses this)

```typescript
import { Program } from '@coral-xyz/anchor';

const ix = await program.methods
  .instructionName(args)
  .accounts({ /* accounts */ })
  .instruction();
```

**Only use Pattern B if you are extending DataBlink functionality.** For everything else, use Pattern A to stay consistent with the codebase.

### Account Reading — Raw Buffer Parsing

Accounts are read via raw Buffer parsing (discriminator + byte offsets), NOT Anchor's `program.account.xyz.fetch()`. Look at existing hooks in `lib/hooks/` to see the byte offset maps for each account type. When adding new account reads, follow the same buffer parsing pattern.

### Program IDs — Hardcoded in lib/programs/index.ts

The runtime source of truth for program IDs is `lib/programs/index.ts` (hardcoded devnet addresses, IDL addresses patched at runtime). `lib/config/program-config.ts` has env var mappings but the actual code imports from `lib/programs/index.ts`. **Always import program IDs from `lib/programs/index.ts`, not from env vars.**

### PDA Derivation — Use Existing Helpers

All PDA seeds are centralized in `lib/programs/index.ts`:
- Human: `["human_profile", wallet]`
- Agent: `["agent", principal, nonce_u64_le]`
- Capability: `["capability", principal, agent, nonce_u64_le]`
- Freeze: `["freeze", principal, agent]`
- Document: `["document", doc_hash]`
- Receipt: `["receipt", agent_id, nonce]`

Always use the existing PDA helper functions. Do NOT re-derive PDAs manually.

Do NOT use `provider.sendAndConfirm()` — always use the wallet adapter's `sendTransaction` so the wallet popup works correctly.

---

## SUMMARY

| Phase | Deliverable | Key Metric |
|-------|-------------|------------|
| 1 | Product shell, nav, home page | User sees their agents after connecting wallet |
| 2 | Agent detail page with controls | User can view/suspend/freeze an individual agent |
| 3 | Agent deployment wizard | User can deploy a new agent end-to-end |
| 4 | Real-time monitoring & alerts | User sees live activity and budget warnings |
| 5 | Landing page & public profiles | Anyone can view agent/human profiles |
| 6 | Polish & production readiness | No blank screens, mobile works, SEO done |
