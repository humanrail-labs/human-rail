# HumanRail

**Identity + accountability rails on Solana** for humans and agents.

HumanRail lets apps require “verified human” participation (payments, tasks, signatures) and lets principals delegate tightly-bounded capabilities to software/AI agents with an on-chain audit trail.

## Who it’s for

- **Merchants / apps**: accept payments only from verified humans, reduce fraud/Sybil abuse.
- **Task creators**: distribute micro-tasks to verified humans and pay per completion.
- **Principals (humans/orgs)**: register and authorize agents with limits + emergency controls.
- **Auditors / compliance**: trace actions back to a verified human principal.

## What you can build with it

- Verified checkout / invoicing (human-gated payments)
- Verified document signing (human + authorized agent signatures)
- Human-only micro-task marketplaces (data labeling, feedback, RLHF)
- Accountable agent execution (limits, scopes, receipts, freeze controls)

---

## Programs

| Program | Purpose |
|---|---|
| `human_registry` | Human identity profiles + attestation-based scoring |
| `agent_registry` | Agent registration, lifecycle, and key rotation |
| `delegation` | Capabilities: scopes + limits + time bounds + (optional) allowlists |
| `human_pay` | Payment rail (invoices / escrow flows with verification hooks) |
| `data_blink` | Human micro-task distribution + rewards |
| `document_registry` | On-chain document signing (human + agent flows) |
| `receipts` | Shared audit trail for actions across rails |
| `common` | Canonical shared types/utilities for cross-program consistency |

---

## Core concepts

### Human profiles and attestations
A **HumanProfile** accumulates attestations from trusted issuers (KYC, proof-of-personhood, social verifications, etc.).
Each attestation contributes weight to a **human score**, letting apps enforce a minimum threshold.

### Agents and accountability
An **AgentProfile** represents an agent that is owned by a principal. Agents have signing keys (with rotation support) and a lifecycle (active/suspended/revoked). Agent actions are designed to be attributable to a principal.

### Capabilities (delegation)
A **Capability** is a programmable permission slip that can constrain:
- allowed programs / destinations (scope)
- asset scope (which mints/tokens)
- spending limits (per-tx, daily, total)
- time bounds (valid_from / expires_at)
- additional risk controls

### Receipts (audit)
Important actions emit events and/or store receipts so a third party can reconstruct “who did what, when, under what permission”.

### Emergency controls
Principals can **freeze** agent operation under specific relationships to mitigate compromise and quickly restore safety.

---

## Demo flows (what to show an investor)

### Flow A — Verified Human
1. Create a human profile
2. Register an issuer (admin)
3. Issue / register attestations
4. Show score and “verified” status changing on-chain

### Flow B — Accountable Agent
1. Register agent under a principal
2. Rotate agent key (show grace period / safety)
3. Issue capability with strict limits
4. Show action receipts tying behavior back to principal

### Flow C — Human-gated payments
1. Merchant creates invoice (vault/escrow)
2. Payer must be verified (score threshold)
3. Payment executes and receipt is recorded

### Flow D — Human micro-tasks
1. Create task with reward budget
2. Verified humans submit responses
3. Rewards distributed with receipts

---

## Quick start (localnet)

```bash
yarn install
anchor build
anchor test
To run a fresh local validator and deploy programs:

bash
Copy code
pkill -f solana-test-validator || true
solana-test-validator --reset --quiet &
sleep 5
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator --skip-deploy
Program IDs
Localnet
Localnet program IDs change per reset. After a deploy, list them with:

bash
Copy code
anchor keys list
Devnet
Devnet IDs should only be added after deploying to devnet and verifying the cluster:

bash
Copy code
solana config set --url https://api.devnet.solana.com
solana config get
anchor deploy --provider.cluster devnet
anchor keys list
Repository structure
text
Copy code
programs/
  human_registry/
  agent_registry/
  delegation/
  human_pay/
  data_blink/
  document_registry/
  receipts/
  common/

packages/
  sdk/

tests/
  humanrail.ts
  freeze-security.test.ts
Toolchain
Solana CLI (matching your environment)

Anchor 0.32+

Rust stable

Node 18+

License
MIT