# Mandara Pricing Hypothesis

> **Status:** Pre-revenue devnet beta. No pricing is final.  
> **Goal:** Define a plausible pricing model for feedback and investor conversations.  
> **Last updated:** 2026-05-04

---

## Principles

1. **Devnet beta is free.** We want usage and feedback, not revenue.
2. **Pricing aligns with value.** Charge for signatures, agents, and policy complexity.
3. **No production custody claims.** All tiers are devnet-only until Ika mainnet + audit.

---

## Proposed Tiers

### Dev Sandbox

| | |
|---|---|
| **Price** | Free |
| **Network** | Devnet only |
| **Agents** | Up to 2 |
| **Signing requests / month** | Up to 100 |
| **Policies per agent** | Up to 3 |
| **Webhooks** | 1 endpoint |
| **Audit retention** | 7 days |
| **Support** | Community Discord |

**Use case:** Hackathons, prototyping, internal testing.

---

### Builder

| | |
|---|---|
| **Price** | $49 / month |
| **Network** | Devnet only |
| **Agents** | Up to 10 |
| **Signing requests / month** | Up to 5,000 |
| **Policies per agent** | Unlimited |
| **Webhooks** | Up to 5 endpoints |
| **Audit retention** | 30 days |
| **Support** | Email + SDK docs |

**Use case:** Startups building agent products, closed beta users.

---

### Team

| | |
|---|---|
| **Price** | $199 / month |
| **Network** | Devnet only |
| **Agents** | Up to 50 |
| **Signing requests / month** | Up to 50,000 |
| **Policies per agent** | Unlimited |
| **Webhooks** | Up to 20 endpoints |
| **Audit retention** | 90 days |
| **Features** | Policy templates, CSV/JSON audit exports, org roles |
| **Support** | Priority email + Slack Connect |

**Use case:** Treasury teams, payment infrastructure, multi-agent deployments.

---

### Enterprise

| | |
|---|---|
| **Price** | Custom |
| **Network** | Devnet → mainnet when ready |
| **Agents** | Unlimited |
| **Signing requests / month** | Custom |
| **Policies per agent** | Unlimited |
| **Webhooks** | Unlimited |
| **Audit retention** | Unlimited |
| **Features** | Compliance exports, custom policy engine, dedicated support, SLA |
| **Support** | Dedicated account manager + Slack + on-call |

**Use case:** Large protocols, institutional treasury, regulated payment flows.

---

## Pricing Dimensions

| Dimension | Why it matters |
|-----------|----------------|
| **Agents** | Each agent is a discrete economic actor with its own policy |
| **Signing requests** | Directly correlates with API load and Ika signing cost |
| **Webhooks** | Delivery infrastructure cost |
| **Audit retention** | Storage cost |
| **Policies** | Complexity of guardrails |

---

## Mainnet Transition

When Ika reaches mainnet and HumanRail programs are audited:

- **Dev Sandbox** may remain free for testnets
- **Builder/Team/Enterprise** will add mainnet signatures as a premium feature
- **Transaction fees** (Solana rent + priority fees) may be passed through or bundled
- **Insurance / slashing** could be an Enterprise add-on

---

## Open Questions

1. Should we charge per signature or per agent?
2. Should there be an overage model or hard limits?
3. How much will Ika mainnet signing cost per signature?
4. Will enterprises pay for compliance exports before mainnet?

---

*Back to [`docs/README.md`](README.md)*
