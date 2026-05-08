# Mandara Customer Demo Script

> **Audience:** AI agent builders, crypto treasury teams, stablecoin/payment infrastructure teams, hackathon/grant reviewers  
> **Phase:** P10 — Devnet beta  
> **Last updated:** 2026-05-04

---

## 10-Minute Full Demo

### Setup (pre-demo)

```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:dev   # terminal 1
npm run product:worker:dev # terminal 2
```

---

### Minute 1: The Problem

**Narrative:**
> "AI agents are becoming economic actors. They need to sign transactions. But giving an agent an unrestricted private key is dangerous — if it's compromised, your entire treasury is gone. Requiring a human to approve every signature defeats the purpose of autonomy. What if you could give an agent a wallet with programmable guardrails?"

**Show:** The Mandara landing page or dashboard.

---

### Minute 2: Architecture Overview

**Narrative:**
> "Mandara combines two layers. HumanRail is the policy layer — it enforces who can sign, how much, to whom, and when. Ika is the cross-chain signing layer — it produces real signatures for Ethereum, Base, Bitcoin, and more. Every signature request goes through the HumanRail Guard on Solana before Ika ever sees it."

**Show:** Architecture diagram from [`PRODUCT_LAUNCH_PACKAGE.md`](PRODUCT_LAUNCH_PACKAGE.md).

---

### Minute 3: Create an Agent and Policy

**Screen:** Dashboard → Agents → Create Agent

**Narrative:**
> "Let's create a treasury bot. I give it a name and description. Now I link it to an Ika dWallet and define its policy."

**Action:**
```bash
curl -X POST http://localhost:4000/api/agents \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"name": "Treasury Bot", "description": "USDC payouts"}'
```

Save `AGENT_ID`. Then create policy:
```bash
curl -X POST http://localhost:4000/api/policies \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "agentId": "<AGENT_ID>",
    "ikaDwalletId": "<WALLET_ID>",
    "name": "Base Sepolia USDC",
    "chainId": 84532,
    "asset": "USDC:BASE_SEPOLIA",
    "recipient": "0x1111111111111111111111111111111111111111",
    "perTxLimit": "100000000",
    "dailyLimit": "500000000"
  }'
```

**Narrative:**
> "This agent can only send USDC on Base Sepolia. Per-transaction limit is 100 units. Daily limit is 500. If it tries to exceed either, the Guard rejects it on-chain."

---

### Minute 4: Issue an API Key

**Screen:** Dashboard → Agent Details → API Keys

**Narrative:**
> "The agent gets an API key. This is a long-lived secret that the agent uses to call the Mandara API. We store only the hash — the raw key is shown once."

**Action:**
```bash
npm run product:create-dev-agent-key
```

Copy the key. Explain that this is what the agent runtime holds.

---

### Minute 5: Preview a Request

**Narrative:**
> "Before the agent actually requests a signature, it can preview whether the request would pass policy. This is free and creates no on-chain state."

**Action:**
```bash
curl -X POST http://localhost:4000/api/signing-requests/preview \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"agentId":"<AGENT_ID>","policyId":"<POLICY_ID>","destinationChainId":84532,"asset":"USDC:BASE_SEPOLIA","recipient":"0x1111...","amount":"42000000","message":"Payout"}'
```

**Show:** `allowed: true` with computed hashes and limit checks.

---

### Minute 6: Create and Enqueue

**Narrative:**
> "Now the agent makes a real request. The API creates a signing request record, evaluates policy, and enqueues it for the worker."

**Action:**
```bash
curl -X POST http://localhost:4000/api/signing-requests \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"agentId":"<AGENT_ID>","policyId":"<POLICY_ID>","destinationChainId":84532,"asset":"USDC:BASE_SEPOLIA","recipient":"0x1111...","amount":"42000000","message":"Payout"}'
```

Save `REQUEST_ID`. Enqueue:
```bash
curl -X POST "http://localhost:4000/api/signing-requests/<REQUEST_ID>/enqueue" \
  -H "x-mandara-dev-user: dev@local"
```

---

### Minute 7: Worker Processing

**Narrative:**
> "The worker picks up the job from the BullMQ queue. In dry-run mode, it simulates the full flow. In live-devnet mode, it submits the Guard CPI transaction to Solana devnet, calls Ika gRPC to sign, and polls for the on-chain signature."

**Show:** Worker logs in terminal 2.

**Action:**
```bash
curl -s "http://localhost:4000/api/signing-requests/<REQUEST_ID>/execution" \
  -H "x-mandara-dev-user: dev@local" | jq .
```

---

### Minute 8: Audit Trail

**Screen:** Dashboard → Signing Requests → Detail

**Narrative:**
> "Every step is recorded. The audit trail shows who created the request, when it was enqueued, what the worker did, and the final status."

**Show:** Audit events for the request.

---

### Minute 9: Webhooks

**Narrative:**
> "If you've registered a webhook, Mandara delivers a signed payload the moment the status changes. Your infrastructure can react instantly."

**Show:** Webhook configuration UI and example payload from [`PRODUCT_WEBHOOKS.md`](PRODUCT_WEBHOOKS.md).

---

### Minute 10: Freeze and Wrap-Up

**Narrative:**
> "What if something goes wrong? The human principal can freeze the agent instantly. No new signatures can be requested until it's unfrozen."

**Action:** Show freeze action in dashboard or API.

**Closing:**
> "Mandara gives your AI agents real cross-chain signing power — but only within the bounds you set. Devnet beta is live today."

---

## 3-Minute Executive Demo

1. **Problem** (30s): Agents need to sign, but unrestricted keys are dangerous.
2. **Solution** (30s): Mandara = HumanRail policy layer + Ika signing layer.
3. **Policy** (30s): Set limits, assets, recipients, expiry.
4. **Live Request** (60s): Agent requests signature → Guard checks policy → Ika signs → audit trail.
5. **Safety** (30s): Freeze instantly. Full receipts. Devnet beta available now.

---

## Objection Handling

### "Is this production custody?"

> **No.** Ika is pre-alpha with a mock signer. All interactions are on Solana devnet. We are building toward production readiness but are explicitly not making custody claims today. The beta is for testing the policy and signing flow.

### "What happens if policy rejects a request?"

> The API returns a 422 `POLICY_REJECTED` response with the exact reason — e.g., "Amount exceeds per-tx limit." The request is not enqueued and no on-chain state is created. If `persistIfRejected=true`, a record is saved for audit but still not signed.

### "Why Ika?"

> Ika provides decentralized key generation and cross-chain signing via dWallets. Without Ika, Mandara would have no way to produce real Ethereum or Bitcoin signatures. HumanRail provides the guardrails; Ika provides the engine.

### "Why not just use a multisig?"

> Multisigs require human signers for every transaction. Mandara lets a human set the rules once, then the agent operates autonomously within those rules — with full audit trails and freeze controls.

### "How do agents integrate?"

> Agents use the Mandara TypeScript SDK or REST API. They authenticate with a Bearer token (API key) and call `requestSignature()`. The SDK handles polling and error handling.

### "What are current limitations?"

> - Dev auth only (no real user auth yet)
> - Webhook secrets require `MANDARA_ENCRYPTION_PASSWORD` for encryption at rest
> - No rate limiting or billing
> - Ika mock signer, not production MPC
> - Devnet only, no mainnet

---

*Back to [`docs/README.md`](README.md)*
