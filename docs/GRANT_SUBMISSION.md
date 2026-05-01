# Grant Submission: Mandara by HumanRail

## Track

**Ika / Bridgeless Capital Markets**

---

## Project Name

**Mandara by HumanRail**

> Programmable mandates for cross-chain AI agents, powered by Ika dWallets.

---

## One-Liner

Mandara lets verified humans delegate bounded cross-chain signing authority to autonomous AI agents using Ika dWallets — with spending limits, freeze controls, and full audit receipts.

---

## The Problem

AI agents are becoming autonomous economic actors. They manage treasuries, execute trades, and sign cross-chain transactions. But three critical questions remain unanswered:

1. **Who authorized this agent?** Most agents have no on-chain identity link to a verified human.
2. **What are its limits?** Agents with unrestricted signing power can drain treasuries.
3. **Can we prove compliance?** Without immutable audit trails, there's no way to verify that a signature was policy-compliant after the fact.

Existing solutions force a choice between **total autonomy** (dangerous) and **human-in-the-loop for every action** (not autonomous).

---

## Target Users

- **Crypto treasuries** that want AI-driven rebalancing with guardrails
- **DeFi protocols** that want automated market-making within bounded risk
- **Cross-chain bridges** that need policy-governed signers
- **Enterprise finance teams** exploring AI automation for routine settlements

---

## Use Cases

### 1. AI Treasury Agent
A verified CFO deploys an AI agent with a mandate: "Rebalance up to $10,000/day between Ethereum and Base, only into whitelisted assets, and freeze immediately if daily variance exceeds 5%."

### 2. Cross-Chain Payroll
A DAO registers an agent to process monthly payroll across chains. The agent can sign transfers to pre-approved recipient lists within per-employee limits.

### 3. Compliance-First Trading
A hedge fund uses an AI agent for routine trades. Every trade is pre-checked against on-chain policy, and every signature leaves an immutable receipt for auditors.

---

## The Solution

Mandara combines two layers into a single product:

1. **HumanRail** — the policy layer. Verified human identity, agent lifecycle, capability-based delegation with spending limits, emergency freeze, and immutable receipts.
2. **Ika** — the cross-chain signing layer. 2PC-MPC dWallets that produce signatures for Ethereum, Bitcoin, and other chains.

A verified human principal:
1. Creates an on-chain human profile
2. Registers an AI agent
3. Issues capabilities with explicit scopes and limits
4. Creates a GuardedDwallet policy linked to an Ika dWallet
5. The agent can now request cross-chain signatures — but only within the policy bounds

Every request is checked on-chain by the HumanRail dWallet Guard before Ika ever sees it.

---

## How It Uses Ika

| Ika Feature | How Mandara Uses It |
|-------------|---------------------|
| **dWallet DKG** | Creates a real Secp256k1 dWallet on Solana devnet via gRPC |
| **approve_message** | Guard program CPI-calls Ika to create a MessageApproval PDA |
| **gRPC Sign** | Agent requests signing via `DWalletRequest::Presign` + `Sign` |
| **MessageApproval** | On-chain status tracking (Pending → Signed) with signature bytes |

### Ika Integration Flow

```
1. Human creates Ika dWallet via gRPC DKG
                    │
                    ▼
2. Transfers authority to HumanRail Guard CPI PDA
                    │
                    ▼
3. Creates GuardedDwallet policy (chain, asset, recipient, limits)
                    │
                    ▼
4. Agent requests cross-chain signature
                    │
                    ▼
5. Guard program checks policy on-chain
                    │
                    ▼
6. If allowed → CPI to Ika approve_message → MessageApproval PDA
                    │
                    ▼
7. Agent submits gRPC Sign request with ApprovalProof
                    │
                    ▼
8. Ika network commits signature to MessageApproval account
```

---

## How It Uses HumanRail

| HumanRail Feature | How Mandara Uses It |
|-------------------|---------------------|
| **Human Registry** | Principal must be verified before registering agent |
| **Agent Registry** | Agent PDA links back to verified human principal |
| **Capabilities** | Spending limits, scopes, expiry enforce agent bounds |
| **Freeze** | Principal can instantly halt agent signing |
| **Receipts** | Every approval and signature emits immutable receipt |
| **dWallet Guard** | New program that enforces policy + bridges to Ika |

---

## Architecture

```
Verified Human
      │
      ▼
┌─────────────────┐
│ Human Registry  │
└─────────────────┘
      │
      ▼
┌─────────────────┐     ┌──────────────────┐
│  Agent Registry │────▶│   Capabilities   │
│   (KYA)         │     │  (limits, scope) │
└─────────────────┘     └──────────────────┘
      │
      ▼
┌──────────────────────────┐
│ HumanRail dWallet Guard  │
│  · Policy enforcement    │
│  · CPI to Ika            │
└──────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│      Ika Protocol        │
│  · dWallet PDA           │
│  · MessageApproval PDA   │
│  · gRPC Sign service     │
└──────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│   Signed cross-chain     │
│      message             │
└──────────────────────────┘
```

---

## Devnet Programs & Artifacts

### Deployed Programs

| Program | Address | Status |
|---------|---------|--------|
| HumanRail dWallet Guard | `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2` | ✅ Deployed & Executable |
| Ika dWallet Program | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` | ✅ Pre-alpha devnet |

### Ika dWallet Artifacts

| Artifact | Address / Value |
|----------|-----------------|
| Ika dWallet PDA | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| Guard CPI Authority PDA | `FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd` |
| GuardedDwallet PDA | `C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup` |
| GuardSigningRequest PDA | `CmqCpm4zPRZudGhuKkdrXoF6KPKB8vWjzeAysneDSHk5` |
| Ika MessageApproval PDA | `Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM` |
| Approve tx signature | `4M59d1AmXZinNKfkHxc5qf6YfqWG1xLnkxKRDhGDQFLkZYpFH3PMnpi8LmZaFGErWz4MgzNAHmVwzokqgX7jn7tt` |
| MessageApproval status | **Signed(1)**, signature_len=64 |
| Signature (hex) | `ca5c2643489f1faae3ea39ba960386ecabe41fb61218ccfaf693fb7ecb1b05ce410b922bc45a7e7f82c646aacbb81276676eda3ae3fa5afab8960cbb00c19b1e` |

---

## Demo Flow

1. **Open `/vault/dwallets`** — the Mandara demo page
2. **Phase 5A** — Verify Ika program is deployed and executable
3. **Phase 5C** — Fetch the real Ika dWallet and GuardedDwallet policy
4. **Phase 5D** — Inspect the approved GuardSigningRequest (status=approved)
5. **Phase 5E** — Inspect the Ika MessageApproval (status=Signed, signature_len=64)
6. **Phase 6** — Run `npm run test:agent-cross-chain-tool` to see the agent tool in action

---

## Build Instructions

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Build Next.js app
npm run build

# Build Rust CLI (for Ika DKG + Sign)
cargo check --manifest-path tools/ika-dkg-cli/Cargo.toml
```

---

## Test Instructions

```bash
# Verify Guard program deployment
npm run verify:dwallet-guard

# Inspect Ika state
npm run devnet:inspect-ika

# Verify dWallet lifecycle
npm run ika:verify-lifecycle

# Test agent cross-chain signature tool
npm run test:agent-cross-chain-tool

# Run final submission checks
npm run final:check
```

---

## Security & Safety Model

### Policy Enforcement
- All signing requests are hashed and checked against on-chain policy **before** Ika sees them
- Policy constraints: destination chain, asset, recipient, per-tx limit
- Policy is stored in a GuardedDwallet PDA and enforced by the Guard program

### Agent Safety
- Agents must be registered with a verified human principal
- Capabilities have explicit scopes, spending limits, and expiry
- Emergency freeze allows instant suspension
- Every action creates an immutable receipt

### Devnet Execution Safety
- `devnet_execute_new_request` mode is disabled by default
- Requires `HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING=true` environment variable
- Only accepts requests matching the known demo policy
- No arbitrary chain/recipient signing allowed

---

## Pre-Alpha Disclaimer

Ika is currently pre-alpha with a **single mock signer**, not production MPC custody. All demo interactions use Solana devnet only. Signatures are deterministic because the mock uses a fixed key. Do not use for production funds.

---

## What Is Complete

- [x] HumanRail dWallet Guard program deployed on devnet
- [x] Real Ika dWallet created via gRPC DKG
- [x] Authority transferred to Guard CPI PDA
- [x] GuardedDwallet policy with real spending limits
- [x] Policy-valid `approve_guarded_message` → Ika `approve_message` CPI
- [x] gRPC Presign + Sign → signature committed on-chain
- [x] Agent runtime tool `request_cross_chain_signature` with 3 modes
- [x] Sanitized artifact reader (no secrets exposed)
- [x] Policy evaluation matching Guard program hashes
- [x] UI showing full lifecycle + agent tool
- [x] Test script covering all modes and safety gates

## What Remains After Hackathon

- [ ] Production Ika integration (when Ika mainnet launches)
- [ ] GasDeposit PDA management for Ika fees
- [ ] Multi-signer / threshold policy support
- [ ] Additional chain support (Bitcoin, Cosmos, etc.)
- [ ] Agent runtime TEE attestation integration
- [ ] Cross-chain message relay (after signature is produced)

---

## Commercial Potential

### Market Size
- Crypto treasury management: $50B+ AUM
- AI agent automation: $10B+ by 2027
- Cross-chain DeFi: $100B+ TVL

### Revenue Model
- SaaS fees for policy management dashboard
- Transaction fees on Guard program (micro-fee per approval)
- Enterprise audits and compliance reporting

### Competitive Moat
- Only solution combining **verified human identity** + **programmable policy** + **cross-chain signing**
- HumanRail's 7-program trust stack is a significant barrier to entry
- Ika partnership provides deep technical integration

---

## Impact on Solana / Ika Ecosystem

### For Solana
- Brings **verified human identity** to AI agents on Solana
- Creates a new use case for Solana as the **policy layer** for cross-chain actions
- Drives adoption of Solana programs through agent automation

### For Ika
- Provides the **missing policy layer** that Ika needs for enterprise adoption
- Demonstrates real-world use of Ika dWallets in an agent context
- Creates a template for other projects to integrate Ika with guardrails

---

## Team

HumanRail Labs — building the trust infrastructure for autonomous AI agents.

---

## Links

- **Demo:** [`/vault/dwallets`](/vault/dwallets)
- **Repo:** `grant/ika-guarded-dwallets` branch
- **Runbook:** [`docs/IKA_INTEGRATION_RUNBOOK.md`](docs/IKA_INTEGRATION_RUNBOOK.md)
- **Video Script:** [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md)
