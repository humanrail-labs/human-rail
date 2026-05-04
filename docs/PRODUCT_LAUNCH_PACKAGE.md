# Mandara by HumanRail — Product Launch Package

> **Branch:** `product/mandara-cloud-mvp`  
> **Phase:** P10 — Devnet beta launch package  
> **Status:** Devnet only. Ika pre-alpha mock signer. Not production custody.  
> **Last updated:** 2026-05-04

---

## Product Name

**Mandara** by HumanRail

## Tagline

Programmable mandates for cross-chain AI agents.

## One-Liner

Mandara lets verified humans delegate bounded cross-chain signing authority to autonomous AI agents — with spending limits, freeze controls, and full audit receipts.

---

## Problem

AI agents are becoming autonomous economic actors. But who authorized them? Who set their limits? Who can freeze them? And when they sign a cross-chain transaction, how do you prove the signature was policy-compliant?

Existing custody solutions either:
- Give agents unrestricted signing power (dangerous)
- Require human approval for every action (not autonomous)
- Lack on-chain audit trails (not verifiable)

---

## Product Overview

Mandara combines two layers:

1. **HumanRail** — the policy layer. Verified human identity, agent lifecycle, capability-based delegation with spending limits, emergency freeze, and immutable receipts.
2. **Ika** — the cross-chain signing layer. 2PC-MPC dWallets that produce signatures for Ethereum, Bitcoin, and other chains.

A verified human principal deploys an AI agent, sets its policy (chain, asset, recipient, amount limits), and the agent can request cross-chain signatures — but only within those bounds. Every request is checked on-chain by the HumanRail dWallet Guard before Ika approves it.

---

## Target Users

- **AI agent builders** who need their agents to sign transactions on Ethereum, Base, Bitcoin, or other chains
- **Crypto treasury teams** who want programmatic spending limits for bot operations
- **Stablecoin and payment infrastructure teams** building autonomous payout agents
- **Hackathon and grant teams** demonstrating policy-governed agent signing

---

## Primary Use Cases

1. **Treasury Bot** — An AI agent manages USDC payouts within daily and per-transaction limits. If the bot is compromised, the policy limits the damage and the principal can freeze it instantly.
2. **Cross-Chain Bridge Agent** — An agent signs burn/mint messages across chains. The policy restricts which chains, assets, and recipients are allowed.
3. **Subscription Payment Agent** — An agent pays recurring invoices in stablecoins. The policy caps total spend and expires after a set date.

---

## Why Now

- AI agents are moving from chatbots to economic actors
- Cross-chain infra (Ika dWallets) is reaching devnet maturity
- Solana provides cheap, fast policy enforcement
- There is no existing "policy layer + cross-chain signing" product for agents

---

## Why Ika

Ika provides the dWallet infrastructure: decentralized key generation, on-chain message approval, and gRPC-based signing. Without Ika, Mandara would have no way to produce real cross-chain signatures. HumanRail provides the guardrails; Ika provides the engine.

**Current limitation:** Ika is pre-alpha and uses a single mock signer. Not production MPC custody.

---

## Why HumanRail

Ika alone cannot enforce *who* can request a signature or *under what conditions*. HumanRail adds:
- Verified human principals (KYA)
- Programmable spending limits and asset allowlists
- Emergency freeze
- Immutable receipts for every approval and signature

---

## Devnet Beta Scope

This release is a **devnet beta**.

### What Users Can Do Today

1. Create an organization and agents via the dashboard or API
2. Import an Ika dWallet and link it to an agent
3. Define a signing policy (chain, asset, recipient, per-tx/daily/total limits)
4. Issue an agent API key
5. Have the agent call the Mandara API to request a signature
6. Watch Mandara check policy through the HumanRail Guard on-chain
7. See Ika sign if approved
8. View the full audit trail in the dashboard
9. Receive webhook events for status changes
10. Export audit logs as CSV or JSON

### What Is Not Production-Ready

- **Authentication:** Dev auth only (`x-mandara-dev-user` header). No real user auth.
- **Custody:** Ika uses a pre-alpha mock signer. Not production MPC custody.
- **Network:** Solana devnet only. No mainnet support.
- **Security:** Webhook secrets are plaintext in the database.
- **Rate limiting:** Not implemented.
- **Billing:** Not implemented.
- **Monitoring:** No Sentry or error monitoring hooked up yet.

---

## Demo Links & Commands

**Dashboard:** [`/vault/dwallets`](/vault/dwallets)

**Local stack:**
```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:dev
npm run product:worker:dev
```

**API health:** `curl http://localhost:4000/health`

---

## Public Devnet Artifact Proof

| Artifact | Address |
|----------|---------|
| HumanRail dWallet Guard Program | `Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2` |
| Ika dWallet Program | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` |
| Ika dWallet PDA | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| HumanRail Guard CPI Authority | `FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd` |
| GuardedDwallet Policy PDA | `C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup` |
| Live execution tx | `2o8RbzEMFAUMyTUtZSyhihtLu3eUU7eK6nJTu4SGPTbEcZ15VGLRRR62iBbh5KWYwGA84kntGxr2jLCDP3SPJuVu` |

See [`docs/PRODUCT_LIVE_EXECUTION_PROOF.md`](PRODUCT_LIVE_EXECUTION_PROOF.md) for full details.

---

## Next Milestones

| Milestone | Target |
|-----------|--------|
| Replace dev auth with Clerk/Supabase Auth | Before external closed beta |
| Encrypt webhook secrets at rest | Before external closed beta |
| Implement rate limiting | Before external closed beta |
| Add Sentry / error monitoring | Before external closed beta |
| Ika mainnet launch | Wait for Ika network |
| Re-deploy HumanRail programs to mainnet | After audit |
| Production custody launch | After Ika mainnet + audit |

---

*Back to [`docs/README.md`](README.md)*
