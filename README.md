# HumanRail Protocol

## Mandara by HumanRail

> **Programmable mandates for cross-chain AI agents, powered by Ika dWallets.**

Mandara lets verified humans delegate bounded cross-chain signing authority to autonomous AI agents using Ika dWallets — with spending limits, freeze controls, and full audit receipts. Every signature request is checked against on-chain policy before the Ika network ever sees it.

---

## The Problem

AI agents are becoming autonomous economic actors. But who authorized them? Who set their limits? Who can freeze them? And when they sign a cross-chain transaction, how do you prove the signature was policy-compliant?

Existing custody solutions either:
- Give agents unrestricted signing power (dangerous)
- Require human approval for every action (not autonomous)
- Lack on-chain audit trails (not verifiable)

## The Solution

**Mandara** combines two layers:

1. **HumanRail** — the policy layer. Verified human identity, agent lifecycle, capability-based delegation with spending limits, emergency freeze, and immutable receipts.
2. **Ika** — the cross-chain signing layer. 2PC-MPC dWallets that produce signatures for Ethereum, Bitcoin, and other chains.

A verified human principal deploys an AI agent, sets its policy (chain, asset, recipient, amount limits), and the agent can request cross-chain signatures — but only within those bounds. Every request is checked on-chain by the HumanRail dWallet Guard before Ika approves it.

## Why Ika is Essential

Ika provides the dWallet infrastructure: decentralized key generation, on-chain message approval, and gRPC-based signing. Without Ika, Mandara would have no way to produce real cross-chain signatures. HumanRail provides the guardrails; Ika provides the engine.

## Why HumanRail is Essential

Ika alone cannot enforce *who* can request a signature or *under what conditions*. HumanRail adds:
- Verified human principals (KYA)
- Programmable spending limits and asset allowlists
- Emergency freeze
- Immutable receipts for every approval and signature

## What Works on Devnet

| Phase | Status | What it does |
|-------|--------|-------------|
| 5A | ✅ | Ika program inspection, PDA derivation, account parsing |
| 5B | ✅ | Real Ika dWallet creation via gRPC DKG |
| 5C | ✅ | Authority transfer to Guard CPI PDA + real GuardedDwallet policy |
| 5D | ✅ | Policy-valid `approve_guarded_message` → Ika `approve_message` CPI |
| 5E | ✅ | gRPC Presign + Sign → signature committed on-chain |
| 6 | ✅ | Agent runtime tool `request_cross_chain_signature` with 3 modes |
| 7 | ✅ | Grant submission package |

**Demo route:** [`/vault/dwallets`](/vault/dwallets)

**Key devnet artifacts:**

| Artifact | Address |
|----------|---------|
| HumanRail dWallet Guard Program | `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2` |
| Ika dWallet Program | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` |
| Ika dWallet PDA | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| HumanRail Guard CPI Authority | `FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd` |
| GuardedDwallet Policy PDA | `C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup` |
| GuardSigningRequest PDA | `CmqCpm4zPRZudGhuKkdrXoF6KPKB8vWjzeAysneDSHk5` |
| Ika MessageApproval PDA | `Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM` |
| Approve Guarded Message Tx | `4M59d1AmXZinNKfkHxc5qf6YfqWG1xLnkxKRDhGDQFLkZYpFH3PMnpi8LmZaFGErWz4MgzNAHmVwzokqgX7jn7tt` |
| Signed MessageApproval status | **Signed(1)**, signature_len=64 |
| Ika Signature (hex) | `ca5c2643489f1faae3ea39ba960386ecabe41fb61218ccfaf693fb7ecb1b05ce410b922bc45a7e7f82c646aacbb81276676eda3ae3fa5afab8960cbb00c19b1e` |

> **⚠️ Pre-alpha limitation:** Ika uses a single mock signer and is not production MPC custody. All demo interactions use Solana devnet only.

---

## Quick Demo Commands

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Build the app
npm run build

# Start development server
npm run dev

# Verify the Guard program is deployed
npm run verify:dwallet-guard

# Inspect Ika state on devnet
npm run devnet:inspect-ika

# Verify dWallet + GuardedDwallet lifecycle
npm run ika:verify-lifecycle

# Test the agent cross-chain signature tool
npm run test:agent-cross-chain-tool

# Run final submission checks
npm run final:check
```

## Reproduce Full Devnet Flow

```bash
# Phase 5B — Create a real Ika dWallet via gRPC DKG
npm run ika:create-dwallet

# Phase 5C — Transfer authority to Guard CPI PDA
npm run ika:transfer-authority

# Phase 5C — Create GuardedDwallet policy linked to real dWallet
npm run ika:create-guarded-policy

# Phase 5D — Submit approved signing request through Guard CPI
npm run ika:approve-message

# Phase 5E — Sign the approved message via Ika gRPC
npm run ika:sign-approved-message

# Phase 6 — Test the agent cross-chain signature tool
npm run test:agent-cross-chain-tool
```

---

## Grant Track: Ika / Bridgeless Capital Markets

HumanRail provides the **policy layer** — identity, delegation, spending limits, freeze, and receipts — deployed as 8 programs on Solana devnet.

**Ika** provides the **cross-chain signing layer** — dWallets that can produce signatures for Bitcoin, Ethereum, and other chains.

Together, they enable a verified human principal to deploy an AI agent that can sign cross-chain transactions — but only within programmable limits that live entirely on Solana.

See:
- [`docs/GRANT_SUBMISSION.md`](docs/GRANT_SUBMISSION.md) — Full grant submission document
- [`docs/JUDGING_CRITERIA.md`](docs/JUDGING_CRITERIA.md) — Judging criteria mapping
- [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md) — Demo video script
- [`docs/FINAL_AUDIT.md`](docs/FINAL_AUDIT.md) — Final audit and readiness checklist
- [`docs/IKA_INTEGRATION_RUNBOOK.md`](docs/IKA_INTEGRATION_RUNBOOK.md) — Technical integration runbook

---

## Architecture

```
Human Principal
       │
       ▼
┌─────────────────────┐     ┌─────────────────────┐
│  HumanRail Policy   │────▶│ HumanRail dWallet   │
│  (8 programs)       │     │ Guard (new program) │
│  · Identity         │     │                     │
│  · Delegation       │     │ Checks limits,      │
│  · Capabilities     │     │ CPI-calls Ika       │
│  · Freeze           │     │ approve_message     │
│  · Receipts         │     │                     │
└─────────────────────┘     └─────────────────────┘
                                    │
                                    ▼
                           ┌─────────────────────┐
                           │   Ika Protocol      │
                           │  · dWallet          │
                           │  · approve_message  │
                           │  · gRPC Sign        │
                           └─────────────────────┘
```

### Protocol Layers

| Layer | Programs | Description |
|-------|----------|-------------|
| **Identity Layer** | Human Registry · Agent Registry | Verified human profiles and AI agent lifecycle management |
| **Authorization Layer** | Delegation · Capabilities · Freeze | Bounded authority with spending limits, scopes, and emergency controls |
| **dWallet Guard Layer** | HumanRail dWallet Guard | Policy enforcement + CPI bridge to Ika |
| **Rails Layer** | HumanPay · DataBlink · Document Registry | PDA-controlled payments, data actions, and on-chain document signing |
| **Audit Layer** | Receipts · Compliance Trail | Immutable action logs for every protocol interaction |

---

## Devnet Program IDs

| Program | Address |
|---------|---------|
| Human Registry | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` |
| Agent Registry | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` |
| Delegation | `DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT` |
| HumanPay | `HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9` |
| DataBlink | `GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX` |
| Document Registry | `8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28` |
| Receipts | `EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM` |
| HumanRail dWallet Guard | `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2` *(Deployed on devnet)* |
| Ika dWallet Program | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` *(Pre-alpha devnet)* |

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 + [React](https://react.dev/) 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Radix UI, Framer Motion
- **Blockchain:** Solana Web3.js, Anchor, Wallet Adapter
- **Ika Integration:** gRPC (tonic) + BCS serialization, Rust CLI
- **3D Graphics:** Three.js (landing page)

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

The example file already contains the correct devnet program IDs.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Dashboard Features

| Route | Feature |
|-------|---------|
| `/dashboard` | Protocol overview, wallet stats, deployed programs |
| `/dashboard/identity` | Create and manage your on-chain human profile |
| `/dashboard/agents` | Register, suspend, reactivate, and revoke AI agents |
| `/dashboard/delegation` | Issue capabilities with limits, freeze/unfreeze agents |
| `/dashboard/payments` | HumanPay escrow invoices and agent payments |
| `/dashboard/documents` | On-chain document signing and attestation |
| `/dashboard/receipts` | Full audit trail of all protocol actions |
| `/vault/dwallets` | **Mandara demo** — Ika dWallet Guard lifecycle |

---

## Core Concepts

### Human Registry
- On-chain human profiles with attestation-based trust scoring
- Third-party issuer attestations (KYC, Biometric, Social, Government ID)
- `canRegisterAgents` flag controls who can spawn agents

### Agent Registry (KYA)
- Agents are PDAs owned by a verified human principal
- Lifecycle states: `Active`, `Suspended`, `Revoked`
- Features: key rotation, TEE measurement verification, metadata updates
- Operator stats track transaction history and risk scoring

### Delegation
- **Capabilities** are scoped authority tokens issued to agents
- Limits: per-transaction, daily, total spending caps
- Constraints: program scopes, asset allowlists, max slippage, max fee, expiry
- **Emergency Freeze** allows principals to instantly halt an agent's capabilities
- Risk tiers enforce behavioral guardrails

### HumanRail dWallet Guard
- New program that bridges HumanRail policies to Ika signing
- Enforces chain, asset, recipient, and amount limits on-chain
- CPI-calls Ika `approve_message` only when policy passes
- Creates `GuardSigningRequest` with status tracking

### Ika dWallet Integration
- Real dWallet created via gRPC DKG on devnet
- Authority transferred to Guard CPI PDA
- MessageApproval created via Guard CPI
- Signature committed via gRPC Presign + Sign
- Signature bytes readable on-chain from MessageApproval account

### HumanPay
- PDA-controlled escrow payments
- Invoice creation with capability-checked authorization
- Dispute resolution support

### Document Registry
- On-chain document hash verification
- Multi-signer attestation support

### Receipts & DataBlink
- Every protocol interaction emits an immutable receipt
- Compliance-ready audit trails from day one

---

## Project Structure

```
app/
  ├── page.tsx                 # Landing page
  ├── dashboard/               # Dashboard routes
  ├── agent/                   # Agent public pages
  ├── human/                   # Human public pages
  ├── delegation/              # Delegation public pages
  ├── rails/                   # Rails sub-pages
  ├── receipts/                # Receipt explorer
  └── vault/dwallets           # Mandara demo (Ika dWallet Guard)

components/
  ├── dashboard/               # Dashboard UI components
  ├── issuer/                  # Issuer-related components
  ├── layout/                  # Layout components
  ├── ui/                      # Base UI (Radix + Tailwind)
  └── wallet/                  # Wallet connector

lib/
  ├── idl/                     # Anchor IDLs for all programs
  ├── programs/                # Program IDs, PDA helpers, parsers
  ├── hooks/                   # React hooks for on-chain data
  ├── solana/                  # Solana provider setup
  └── config/                  # Protocol configuration

packages/
  ├── agent/                   # AI agent runtime + tool executor
  ├── sdk/                     # HumanRail SDK
  └── mandara-sdk/             # Mandara external agent API SDK (@mandara/sdk)

programs/
  └── humanrail-dwallet-guard/ # Rust/Anchor program

tools/
  └── ika-dkg-cli/             # Rust CLI for Ika DKG + Sign
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run verify:dwallet-guard` | Verify Guard program deployment |
| `npm run check:dwallet-guard` | Build-check Guard program |
| `npm run devnet:inspect-ika` | Inspect Ika state on devnet |
| `npm run ika:verify-lifecycle` | Verify dWallet + GuardedDwallet lifecycle |
| `npm run ika:approve-message` | Submit approved signing request (Phase 5D) |
| `npm run ika:sign-approved-message` | Sign approved message via Ika gRPC (Phase 5E) |
| `npm run test:agent-cross-chain-tool` | Test agent cross-chain tool (Phase 6) |
| `npm run final:check` | Run final submission checks (Phase 7) |

---

## Security & Compliance

- All sensitive credentials (e.g., Veriff KYC secrets) live in the **backend KYC issuer service only**
- Frontend uses `NEXT_PUBLIC_` vars for program IDs and RPC endpoints
- Never commit `.env.local` to version control
- `.local-ika/` and `.local-keys/` are `.gitignore`d and never committed

---

## License

Open source. Contributions welcome.

---

Built with ♥ by the HumanRail Labs team.
