# Mandara Landing Page Copy

> **Status:** Devnet beta launch copy. No production custody claims.  
> **Last updated:** 2026-05-04

---

## Hero Section

### Headline (Option A)
**Give your AI agent a wallet with guardrails.**

### Headline (Option B)
**Programmable mandates for cross-chain AI agents.**

### Subheadline
Mandara lets verified humans set spending limits, asset allowlists, and freeze controls for autonomous AI agents — then sign cross-chain transactions through Ika dWallets. Every signature is policy-checked on Solana before it ever touches another chain.

### Primary CTA
[Join Devnet Beta]

### Secondary CTA
[Read Docs]

### Devnet Beta Pill
⚠️ **Devnet Beta:** Ika pre-alpha mock signer. Not production custody.

---

## Feature Sections

### 1. Policy-Governed Agent Wallets
**Your agent can sign — but only what you allow.**

Set per-transaction limits, daily caps, total budgets, allowed chains, assets, and recipients. Policies live on-chain as HumanRail Guard rules. If an agent requests something outside its mandate, the Guard rejects it before Ika ever sees it.

- Per-tx, daily, and total spending limits
- Asset and recipient allowlists
- Policy expiry dates
- Emergency freeze / unfreeze

### 2. Ika dWallet Signing
**Real cross-chain signatures from decentralized key material.**

Ika dWallets generate signatures for Ethereum, Base, Bitcoin, and more. The dWallet authority is held by the HumanRail Guard CPI PDA — no single key can sign without passing policy.

- Cross-chain signature support
- gRPC-based signing workflow
- On-chain MessageApproval receipts

> **Pre-alpha disclaimer:** Ika currently uses a single mock signer for devnet testing. Not production MPC custody.

### 3. HumanRail Guardrails
**Verified humans. Delegated authority. Immutable receipts.**

HumanRail provides the identity, delegation, and audit layer. Every agent is linked to a verified human principal. Every signing request creates an immutable on-chain receipt.

- Verified human principals
- Agent lifecycle management
- Capability-based delegation
- Emergency freeze controls

### 4. Audit Trail & Webhooks
**See everything. Export anything. React instantly.**

The dashboard shows the full lifecycle of every signing request. Webhooks push real-time events to your infrastructure. Audit exports give you CSV or JSON for compliance review.

- Real-time webhook events
- CSV / JSON audit exports
- Full on-chain receipt history

### 5. Developer API & SDK
**Integrate in minutes.**

```typescript
import { MandaraClient } from "@mandara/sdk";

const client = new MandaraClient({
  apiKey: "mandara_...",
  baseUrl: "https://api.devnet.mandara.humanrail.io",
});

const request = await client.requestSignature({
  policyId: "policy_456",
  messageDigest: "0x...",
  destinationChainId: 84532,
  asset: "USDC:BASE_SEPOLIA",
  recipient: "0x...",
  amount: "42000000",
});

const signature = await client.waitForSignature(request.id);
```

- REST API with Bearer token auth
- TypeScript SDK with polling helpers
- Preview endpoint to test policies before submitting

---

## How It Works

```
1. Human principal creates an agent
   └── Sets policy: chain, asset, recipient, limits

2. Agent receives an API key
   └── Authenticates with Bearer token

3. Agent requests a signature via Mandara API
   └── API evaluates policy off-chain

4. If policy passes, worker submits Guard CPI on Solana
   └── Guard checks limits on-chain

5. Guard calls Ika approve_message via CPI
   └── Ika creates MessageApproval

6. Ika signs the message via gRPC
   └── Signature committed on-chain

7. Agent receives the signature
   └── Can broadcast to destination chain

8. Full audit trail recorded
   └── Dashboard, webhooks, exports
```

---

## Devnet Beta Disclaimer

> **Mandara is currently in devnet beta.**
>
> - All on-chain interactions use Solana devnet.
> - Ika uses a pre-alpha mock signer, not production MPC custody.
> - Do not use mainnet keypairs or real assets.
> - Policies, limits, and webhooks are functional but should not be relied upon for production custody.
>
> Join the beta to test the full flow and give feedback.

---

## FAQ

**Q: Is this production custody?**
A: No. Ika is pre-alpha with a mock signer. All demo interactions use Solana devnet only. We are building toward production readiness but are not there yet.

**Q: What chains are supported?**
A: Any chain that Ika dWallets can sign for. Today that includes Ethereum, Base, and Bitcoin testnets via devnet signing.

**Q: How do agents integrate?**
A: Agents use the Mandara TypeScript SDK or REST API. They authenticate with an API key and request signatures within their policy bounds.

**Q: What happens if an agent is compromised?**
A: The human principal can freeze the agent's policy instantly through the dashboard. The compromised agent cannot request new signatures while frozen.

**Q: Why not just use a multisig?**
A: Multisigs require human signers for every transaction. Mandara lets a human set the rules once, then the agent operates autonomously within those rules — with full audit trails.

**Q: Is there a free tier?**
A: The devnet beta is free. See [`PRICING_HYPOTHESIS.md`](PRICING_HYPOTHESIS.md) for future pricing direction.

---

## Footer

**Mandara by HumanRail**

Programmable mandates for cross-chain AI agents.

- [Docs](docs/README.md)
- [Dashboard](/vault/dwallets)
- [GitHub](https://github.com/humanrail-labs/mandara)
- [Twitter / X](https://x.com/humanrail)

© 2026 HumanRail Labs. Devnet beta. Not production custody.

---

*Back to [`docs/README.md`](README.md)*
