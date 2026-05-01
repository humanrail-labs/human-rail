# HumanRail Guarded dWallets — Ika Grant Submission Plan

> Track: Guarded dWallets for Cross-Chain Autonomous Agents  
> Status: Phase 0–3 Complete  
> Phase 2C: SBF build + IDL generated + program ID assigned. Deployment blocked by devnet airdrop rate limit.  
> Phase 3: Frontend `/vault/dwallets` route built with deployment-gated UI, PDA derivations, policy cards, and signing request flow.  

---

## One-Sentence Pitch

**Decentralized guardrails for autonomous agents holding assets across chains.**

HumanRail provides the policy layer. Ika provides the cross-chain signing layer. Together, they let a verified human principal deploy an AI agent that can sign transactions on Bitcoin, Ethereum, and other chains — but only within programmable spending limits, scopes, and audit trails that live entirely on Solana.

---

## The Problem

Today, if you want an AI agent to hold or move assets across chains, you have three bad options:

1. **Centralized custody** — Give your keys to an exchange or custodial API. Counterparty risk, no audit trail.
2. **Multi-sig only** — Require a human to co-sign every action. Defeats the point of autonomy.
3. **Unconstrained hot wallets** — Agent has full control. One jailbreak or prompt injection away from a drained wallet.

There is **no open, Solana-native policy layer** that can enforce guardrails on a cross-chain signing primitive. HumanRail + Ika closes that gap.

---

## The Solution

### HumanRail (policy layer — already deployed)

- **Human Registry** — On-chain verified identity with attestations (KYC, biometric, social).
- **Agent Registry** — Every agent traces back to a verified human principal (KYA).
- **Delegation / Capabilities** — Spending limits, program scopes, asset allowlists, expiry, cooldown, risk tiers.
- **Freeze** — One-click emergency halt by the principal.
- **Receipts** — Immutable on-chain audit trail for every action.

### Ika (cross-chain signing layer)

- **dWallets** — 2PC-MPC derived signing keys that can produce signatures for Bitcoin, Ethereum, and other chains.
- **approve_message** — On-chain instruction that authorizes a message hash to be signed by a dWallet.
- **gRPC Sign** — Submit a signing request to the Ika network after on-chain approval.

### The Missing Piece: HumanRail dWallet Guard

A new Solana program that acts as the **CPI controller** between HumanRail policies and Ika signing:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HUMAN PRINCIPAL                               │
│              (verified identity, controls capabilities)               │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │ delegates capabilities
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     HUMANRAIL POLICY LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Human     │  │   Agent     │  │ Delegation  │  │   Receipts  │  │
│  │  Registry   │  │  Registry   │  │Capabilities │  │   (audit)   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │ policy checks + receipts
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 HUMANRAIL DWALLET GUARD (new program)                 │
│                                                                       │
│  - reads capability state from Delegation program                     │
│  - checks: within budget? not frozen? not expired?                    │
│  - computes message digest (keccak256)                                │
│  - CPI-calls Ika `approve_message`                                    │
│  - emits receipt via HumanRail Receipts program                       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ CPI: approve_message
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         IKA PROTOCOL                                  │
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  dWallet    │  │  approve_message    │  │   gRPC Sign         │   │
│  │  (PDA)      │  │  (on-chain)         │  │   (off-chain)       │   │
│  └─────────────┘  └─────────────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Why Ika?

Without Ika, HumanRail is a **Solana-only** policy engine. Agents can only act within Solana's ecosystem.

With Ika:
- Agents can produce **Bitcoin signatures** (taproot, legacy, segwit).
- Agents can produce **Ethereum signatures** (EIP-191, raw ECDSA).
- The **same policy layer** governs all chains.
- All approvals are **on-chain and auditable** before any MPC signing happens.

Ika's `approve_message` design is a perfect fit for HumanRail because it separates **authorization** (on-chain, programmable) from **signing** (off-chain MPC). HumanRail controls the authorization. Ika handles the cryptography.

---

## Why HumanRail?

Ika provides raw signing. It does not answer:
- **Who** authorized this signature?
- **How much** can this agent spend today?
- **Is** this agent frozen right now?
- **Where** is the audit trail?

HumanRail answers all four. It provides:
- **Identity** — Every agent traces back to a verified human.
- **Delegation** — Programmable scopes and limits.
- **Freeze** — Emergency stop.
- **Receipts** — Immutable compliance logs.

Together, they create a **complete custody stack** for autonomous agents.

---

## Programs Used in the Grant Demo

### Centerpieces
| Program | Role in Demo |
|---------|-------------|
| Human Registry | Show verified principal identity before any agent action |
| Agent Registry | Register the demo agent, show KYA lifecycle |
| Delegation / Capabilities | Issue a capability with cross-chain scope + spending limit |
| Receipts | Log every policy check and every Ika approval |

### Supporting (in repo, not demo centerpiece)
| Program | Notes |
|---------|-------|
| HumanPay | PDA-controlled payments; could be extended to dWallet-funded invoices |
| DataBlink | Structured data storage; could log cross-chain transaction metadata |
| Document Registry | On-chain attestation; could attest dWallet ownership |

---

## Planned New Program: HumanRail dWallet Guard

### Overview
A Solana program that owns a dWallet's CPI authority and acts as the policy gatekeeper before calling `ika::approve_message`.

### Key Accounts
- `GuardConfig` — PDA storing the dWallet ID, approved curves, and max per-tx limits per signature scheme.
- `GuardRequest` — PDA per signing request, tracking status (Pending → Approved → Rejected).

### Key Instructions
1. `initialize_guard` — Create a GuardConfig for a dWallet, transfer CPI authority to the program.
2. `request_sign` — Agent (or UI) submits a message digest. Program checks capability state, creates GuardRequest.
3. `approve_sign` — Principal or delegated reviewer approves. Program CPI-calls `ika::approve_message`, emits receipt.
4. `reject_sign` — Principal rejects. GuardRequest marked Rejected, no CPI call.
5. `update_limits` — Principal adjusts per-signature-scheme limits.

### CPI Flow
```
request_sign(msg_digest, signature_scheme):
  1. Read agent capability from Delegation program
  2. Check: not frozen, not expired, within budget
  3. Check: signature_scheme is in approved list
  4. Check: msg value (if determinable) is within per-tx limit
  5. Create GuardRequest PDA (Pending)
  6. Emit receipt

approve_sign(guard_request):
  1. Verify principal signer
  2. CPI: ika::approve_message(
       dWallet = guard_config.dWallet,
       message = guard_request.msg_digest,
       signature_scheme = guard_request.signature_scheme,
       ...remaining accounts per Ika interface
     )
  3. Update GuardRequest → Approved
  4. Emit receipt
```

### PDA Seeds
```
GuardConfig:    ["guard_config", d_wallet_id]
GuardRequest:   ["guard_request", guard_config, nonce]
```

---

## MVP Demo Flow

### Flow 1: Principal Onboards an Agent for Cross-Chain Signing
1. **Verify Identity** — User creates a Human Profile on-chain.
2. **Register Agent** — User deploys an AI agent via Agent Registry.
3. **Create dWallet** — (via Ika CLI or UI) A dWallet is created for cross-chain signing.
4. **Initialize Guard** — User calls `initialize_guard` on the new program, linking the dWallet.
5. **Issue Capability** — User issues a capability with:
   - Signature schemes: `EcdsaKeccak256` (Ethereum), `EcdsaDoubleSha256` (Bitcoin)
   - Per-tx limit: 0.01 ETH equivalent
   - Daily limit: 0.05 ETH equivalent
   - Expiry: 7 days
6. **Transfer CPI Authority** — dWallet's authority is transferred to the program's CPI authority PDA.

### Flow 2: Agent Requests a Cross-Chain Signature
1. Agent runtime receives a user request: "Send 0.005 ETH to 0xABC..."
2. Agent calls `check_capability` — HumanRail confirms the capability is active and within budget.
3. Agent calls `request_cross_chain_signature` (new tool) — Creates a `GuardRequest` with the keccak256 message digest.
4. Program validates the request against capability limits.
5. Principal (or auto-approver, if configured) calls `approve_sign`.
6. Program CPI-calls `ika::approve_message`.
7. Agent submits the `DWalletRequest::Sign` via Ika gRPC.
8. Ika network signs. Agent receives the signature.
9. HumanRail Receipts program logs the entire flow.

### Flow 3: Emergency Freeze
1. Principal sees suspicious activity in the vault dashboard.
2. One-click **Freeze** in HumanRail Delegation program.
3. All subsequent `request_sign` calls fail at step 2 (capability check).
4. No Ika `approve_message` can be called until the principal **Unfreezes**.

---

## Build Phases

### Phase 0 — Baseline (COMPLETE)
- [x] Branch created: `grant/ika-guarded-dwallets`
- [x] Dependency install baseline
- [x] Lint baseline (158 pre-existing issues documented)
- [x] Build baseline (SUCCESS, 26 routes)
- [x] Repo structure analysis
- [x] `BASELINE_REPORT.md` created

### Phase 1 — Documentation & Framing (COMPLETE)
- [x] `docs/GRANT_IKA_SUBMISSION_PLAN.md` — this document
- [x] `docs/IKA_TECHNICAL_NOTES.md` — Ika protocol implementation notes
- [x] `README.md` update — grant track section
- [x] Homepage/vault banner — small non-invasive grant card
- [x] TODO markers in relevant source files

### Phase 2 — Program Implementation & Compilation (COMPLETE)
- [x] Framework chosen: **Anchor 1.0.1** (required by `ika-dwallet-anchor` dependency on `anchor-lang = "1"`)
- [x] Directory created: `programs/humanrail-dwallet-guard/`
- [x] Program implemented: `humanrail_dwallet_guard`
  - `initialize_guarded_dwallet` — create policy account with owner-checked HumanRail references
  - `freeze_guarded_dwallet` / `unfreeze_guarded_dwallet` — principal-only emergency controls
  - `approve_guarded_message` — policy checks + GuardSigningRequest creation + Ika CPI via official crate
- [x] State accounts: `GuardedDwallet`, `GuardSigningRequest`
- [x] PDA helpers: CPI authority, GuardedDwallet, GuardSigningRequest
- [x] Policy checks: chain, asset, recipient, amount, per-tx/daily/total limits, expiry, freeze, daily reset
- [x] Rejection recording: every failed request creates a rejected `GuardSigningRequest` with error code
- [x] **Official Ika CPI:** `ika_cpi.rs` uses `ika_dwallet_anchor::DWalletContext::approve_message`
- [x] TypeScript SDK updates: constants, PDA helpers, types, parser skeletons
- [x] `docs/DWALLET_GUARD_PROGRAM.md` — full program documentation
- [x] **Toolchain installed:** Rust 1.95.0, Solana CLI 3.1.14, Anchor CLI 1.0.0
- [x] **Compiles successfully:** `cargo build --features no-idl` (0 errors, 20 deprecation warnings)
- [x] **Anchor 1 macro workaround:** `#[derive(Accounts)]` structs moved to crate root because `ctx_accounts_ident()` extracts only the first path segment

### Phase 2C — SBF Build & Deploy Preparation (COMPLETE)
- [x] **SBF build:** `cargo build-sbf` and `anchor build` both succeed (225,680 bytes `.so`)
- [x] **IDL generated:** `anchor build` produces `target/idl/humanrail_dwallet_guard.json` (17,226 bytes)
- [x] **Program ID assigned:** `G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF` (auto-generated keypair)
- [x] **Repo references updated:** `declare_id!`, `lib/programs/index.ts`, `packages/sdk/src/constants.ts`, `.env.example`, `Anchor.toml`
- [x] **IDL copied to frontend:** `lib/idl/humanrail_dwallet_guard.json`
- [x] **Check script:** `scripts/check-dwallet-guard.sh` + `package.json` script
- [ ] **Devnet deployment:** Blocked — airdrop faucet rate-limited (0 SOL in deployer wallet)

### Phase 3 — Frontend Integration (COMPLETE)
- [x] Add `/vault/dwallets` route with Config, Policy, and Signing Request tabs
- [x] Deployment-gated UI — all tx buttons disabled until program is confirmed on-chain
- [x] Ika config card with pre-alpha disclaimer
- [x] PDA derivation display (CPI authority, GuardedDwallet, GuardSigningRequest)
- [x] Policy creation card with demo hash computation
- [x] Signing request card with keccak256 digest, scheme selector, status previews
- [x] Added to vault sidebar navigation
- [ ] Integrate Ika gRPC client for `DWalletRequest::Sign` (Phase 5)

### Phase 4A — Deploy to Devnet (COMPLETE)
- [x] Build passes (`anchor build` + `cargo build-sbf`)
- [x] Program keypair exists and matches expected ID
- [x] Deploy script: `scripts/deploy-dwallet-guard.sh`
- [x] Verify script: `scripts/verify-dwallet-guard-deploy.sh`
- [x] Deployed to devnet: `G2emUcBmNbFAQfP4deV68ciq9rtYc6pr6iYCt16WdYaF`
- [x] On-chain deployment confirmed (slot 459322057, executable)

### Phase 4B — Create First GuardedDwallet Policy Account (NEXT)
- [ ] Connect wallet on `/vault/dwallets`
- [ ] Select an agent and enter a dWallet pubkey
- [ ] Submit `initialize_guarded_dwallet` transaction
- [ ] Verify `GuardedDwallet` PDA created on devnet
- [ ] Test freeze/unfreeze flow

### Phase 4 — Agent Runtime Integration (PLANNED)
- [ ] Add `request_cross_chain_signature` tool to agent runtime
- [ ] Add Ika gRPC client to agent executor
- [ ] End-to-end demo: agent requests Bitcoin or Ethereum signature within policy limits

---

## Devnet / Pre-Alpha Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Ika is pre-alpha | Single mock signer, no real MPC | Demo uses devnet only; clearly disclaim "not production custody" |
| Ika data wiped periodically | dWallets may disappear | Re-create dWallets before each demo; document this |
| Ika interface subject to change | Program may need updates | Pin to a known-working Ika crate version; monitor changelogs |
| No mainnet program IDs | Demo is devnet-only | State explicitly in all docs and UI |
| No Rust toolchain in repo | New program requires toolchain addition | Document toolchain requirements; use separate workspace if needed |

---

## Submission Checklist

- [ ] Grant plan document (this file)
- [ ] Technical notes document
- [ ] Updated README with grant framing
- [ ] Demo video or screenshots
- [ ] Working devnet deployment of HumanRail programs (7/7 deployed)
- [ ] Architecture diagram
- [x] Source code for new dWallet Guard program (Phase 2+)
- [x] Frontend integration for dWallet management (Phase 3)
- [x] Deploy/verify scripts and build readiness (Phase 4A)
- [x] Devnet deployment of dWallet Guard program (slot 459322057)
- [ ] Agent runtime cross-chain signing demo (Phase 5+)
- [ ] Agent runtime cross-chain signing demo (Phase 4+)

---

## Appendix: HumanRail Devnet Program IDs

| Program | Address |
|---------|---------|
| Human Registry | `GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo` |
| Agent Registry | `GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ` |
| Delegation | `DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT` |
| Receipts | `EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM` |
| HumanPay | `HpMrfeC5gJZdywnUQS4WEvsUs6edyjrEmLuYEF1W3qF9` |
| DataBlink | `GYUeSsQfLYrYc5H27XdrssX5WgU4rNfkLGBnsksQcFpX` |
| Document Registry | `8uyGoBf7f9N2ChmaJrnVQ4sNRFtnRL4vp5Gi35MQ6Q28` |

### Ika Devnet Reference

| Resource | Value |
|----------|-------|
| Program ID | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` |
| gRPC Endpoint | `https://pre-alpha-dev-1.ika.ika-network.net:443` |
| CPI Authority Seed | `__ika_cpi_authority` |
