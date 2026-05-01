# HumanRail Protocol

> Identity Rails for AI Agents on Solana

HumanRail is an open protocol for **verified human identity**, **delegated agent authority**, and **full on-chain auditability**. As AI agents become more autonomous, the question shifts from "what can they do?" to "who authorized them and can we verify it?" HumanRail provides the missing trust layer — a **Know Your Agent (KYA)** protocol where every agent traces back to a verified human, every action is bounded by explicit capabilities, and every transaction leaves an immutable receipt.

---

## Grant Track: HumanRail Guarded dWallets with Ika

> **Decentralized guardrails for autonomous agents holding assets across chains.**

HumanRail provides the **policy layer** — identity, delegation, spending limits, freeze, and receipts — already deployed as 7 programs on Solana devnet.

**Ika** provides the **cross-chain signing layer** — 2PC-MPC dWallets that can produce signatures for Bitcoin, Ethereum, and other chains.

Together, they enable a verified human principal to deploy an AI agent that can sign cross-chain transactions — but only within programmable limits that live entirely on Solana.

### Architecture

```
Human Principal
       │
       ▼
┌─────────────────────┐     ┌─────────────────────┐
│  HumanRail Policy   │────▶│ HumanRail dWallet   │
│  (7 programs)       │     │ Guard (new program) │
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

### Grant Demo Scope

The grant demo focuses on the HumanRail programs that form the policy core:
- **Human Registry** — Verified identity before any agent action
- **Agent Registry** — KYA lifecycle management
- **Delegation / Capabilities** — Programmable scopes and spending limits
- **Receipts** — Immutable audit trail for every policy check and Ika approval

A new **HumanRail dWallet Guard** program will be built to act as the CPI controller between HumanRail policies and Ika signing.

> **Pre-alpha disclaimer:** Ika is currently pre-alpha with a single mock signer. All demo interactions use devnet only. This is not production MPC custody.

See [`docs/GRANT_IKA_SUBMISSION_PLAN.md`](docs/GRANT_IKA_SUBMISSION_PLAN.md) for the full submission plan and [`docs/IKA_TECHNICAL_NOTES.md`](docs/IKA_TECHNICAL_NOTES.md) for implementation details.

---

## Live Demo

**Dashboard:** [Open App](/dashboard)  
**Network:** Solana Devnet  
**Status:** 8/8 Programs Deployed

**Devnet Demo:**
```bash
# Create a Guarded dWallet policy (Phase 4B)
npm run devnet:create-guarded-dwallet

# Inspect Ika program state, derive PDAs, fetch accounts (Phase 5A)
npm run devnet:inspect-ika

# Inspect a specific dWallet
IKA_DWALLET_PUBLIC_KEY=... IKA_DWALLET_CURVE=2 npm run devnet:inspect-ika

# Transfer Ika dWallet authority to Guard CPI PDA (Phase 5C)
npm run ika:transfer-authority

# Create GuardedDwallet linked to real Ika dWallet (Phase 5C)
npm run ika:create-guarded-policy

# Verify dWallet + GuardedDwallet lifecycle (Phase 5C)
npm run ika:verify-lifecycle

# Submit approved signing request through Guard CPI (Phase 5D)
npm run ika:approve-message

# Sign the approved message via Ika gRPC (Phase 5E)
npm run ika:sign-approved-message

# Test the agent cross-chain signature tool (Phase 6)
npm run test:agent-cross-chain-tool
```

**Phase 5D/5E/6 Devnet Artifacts:**
| Artifact | Address |
|----------|---------|
| Ika dWallet PDA | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| Guard CPI Authority | `FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd` |
| GuardedDwallet PDA | `C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup` |
| GuardSigningRequest PDA | `CmqCpm4zPRZudGhuKkdrXoF6KPKB8vWjzeAysneDSHk5` |
| Ika MessageApproval PDA | `Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM` |
| Approve Guarded Message Tx | `4M59d1AmXZinNKfkHxc5qf6YfqWG1xLnkxKRDhGDQFLkZYpFH3PMnpi8LmZaFGErWz4MgzNAHmVwzokqgX7jn7tt` |
| Ika Signature (hex) | `ca5c2643489f1faae3ea39ba960386ecabe41fb61218ccfaf693fb7ecb1b05ce410b922bc45a7e7f82c646aacbb81276676eda3ae3fa5afab8960cbb00c19b1e` |
| Ika Signature (base64) | `ylwmQ0ifH6rj6jm6lgOG7KvkH7YSGMz69pP7fssbBc5BC5IrxFp+f4LGRqrLuBJ2Z27aOuP6Wvq4lgy7AMGbHg==` |

---

## Protocol Architecture

Four layers. Seven programs. One unified trust stack.

| Layer | Programs | Description |
|-------|----------|-------------|
| **Identity Layer** | Human Registry · Agent Registry | Verified human profiles and AI agent lifecycle management |
| **Authorization Layer** | Delegation · Capabilities · Freeze | Bounded authority with spending limits, scopes, and emergency controls |
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

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 + [React](https://react.dev/) 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Radix UI, Framer Motion
- **Blockchain:** Solana Web3.js, Anchor, Wallet Adapter
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
  └── receipts/                # Receipt explorer

components/
  ├── dashboard/               # Dashboard UI components
  ├── issuer/                  # Issuer-related components
  ├── layout/                  # Layout components
  ├── ui/                      # Base UI (Radix + Tailwind)
  └── wallet/                  # Wallet connector

lib/
  ├── idl/                     # Anchor IDLs for all 7 programs
  ├── programs/                # Program IDs, PDA helpers, parsers
  ├── hooks/                   # React hooks for on-chain data
  ├── solana/                  # Solana provider setup
  └── config/                  # Protocol configuration
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Roadmap

### V1 — Identity + Agent Authorization
- [x] Canonical human profile and agent profile
- [x] Capabilities v1 (scopes, limits, allowlists, expiry)
- [x] Receipts v1 (standard action log)
- [ ] TypeScript SDK + documentation
- [ ] Issuer framework + revocation
- [ ] Trust tiers UI (Tier 0 / 1 / 2 badges)

### V2 — Ecosystem Modules
- Payment rails with full escrow
- Task marketplace
- Runtime attestations (TEE / signed builds)

---

## Security & Compliance

- All sensitive credentials (e.g., Veriff KYC secrets) live in the **backend KYC issuer service only**
- Frontend uses `NEXT_PUBLIC_` vars for program IDs and RPC endpoints
- Never commit `.env.local` to version control

---

## License

Open source. Contributions welcome.

---

Built with ♥ by the HumanRail Labs team.
