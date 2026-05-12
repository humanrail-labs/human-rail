# Mandara Investor Demo Script

> **Length target:** 3 minutes  
> **Format:** Screen share + voiceover  
> **Audience:** Seed / pre-seed crypto and AI investors  
> **Recording:** Loom or OBS, 1080p, clear audio  
> **Last updated:** 2026-05-12

---

## 0. Hook (0:00–0:20)

**[Screen: black → Mandara logo]**

**Voiceover:**
> "AI agents are about to become economic actors. They will pay vendors, settle invoices, and move assets across chains. But today, every custody solution is either a permissionless hot wallet — which means your agent can drain everything — or a multi-sig that requires a human to click approve on every single transaction. That doesn't scale.
> Mandara is the policy layer in between. Policy-governed AI agent wallets."

---

## 1. The Product — Mandara Console (0:20–0:50)

**[Screen: /mandara/app — Console Dashboard]**

**Voiceover:**
> "This is the Mandara Console. A non-technical user can set up a policy-governed AI agent in under five minutes without touching a private key. The dashboard shows your setup progress: agent, signing wallet, mandate, connection key, and test request."

**[Click: Continue Setup → /mandara/app/onboarding]**

> "The onboarding wizard walks you through it step by step. We use plain language: Workspace, Agent, Signing Wallet, Mandate, Connection Key. No jargon."

---

## 2. Creating the Agent (0:50–1:15)

**[Screen: Onboarding wizard, stepping through quickly]**

**Voiceover:**
> "Create a workspace. Create an agent identity — this is the control-plane identity your real AI agent will use. Add a signing wallet. For devnet beta you can use our demo wallet, or import your own Ika dWallet. Then set the mandate: what chain, what asset, what recipient, and spending limits."

**[Screen: Mandate creation with per-tx, daily, and total limits]**

> "These limits are enforced on-chain by our Guard program. Not by us. Not by a server. On-chain."

---

## 3. Agent Chat — Natural Language Control (1:15–1:50)

**[Screen: /mandara/app/agent-chat]**

**Voiceover:**
> "Now the interesting part. The user opens Agent Chat and talks to their agent in plain English. 'Prepare a 42 USDC payout to the approved Base Sepolia recipient.'"

**[Type the message, hit send]**

> "Mandara parses the intent, previews it against the mandate, and shows a proposal card. Green badge: allowed by mandate. The user sees exactly what will happen. They can approve and create the request, or approve and enqueue it for the worker. They can also reject it. The LLM never signs. The LLM never enqueues. The LLM cannot bypass the mandate."

**[Click: Approve & Create Request]**

> "Approval creates a real signature request. The backend worker still re-evaluates policy before any on-chain action."

---

## 4. The Technical Proof — Ika + Guard (1:50–2:25)

**[Screen: /vault/dwallets — Advanced Technical Proof tab]**

**Voiceover:**
> "This is the advanced view for developers and auditors. Here you can see the full Ika integration. Real dWallet created via gRPC distributed key generation. Authority transferred to our Guard CPI PDA. The Guard program stores the policy and CPI-calls Ika's approve_message only when every check passes."

**[Scroll through: program IDs, PDA derivations, account layouts, transaction signatures]**

> "We've verified every byte offset in the dWallet and MessageApproval accounts against real devnet state. The Guard program is deployed, executable, and its CPI authority PDA is live."

---

## 5. Connect a Real Agent (2:25–2:45)

**[Screen: Agent Connection Guide or onboarding done step]**

**Voiceover:**
> "Mandara doesn't run your AI agent. Your agent runs wherever you want — a backend service, a LangChain worker, a Hermes agent. It connects via our TypeScript SDK using a connection key. The SDK lets your agent preview requests against mandates before creating them."

**[Show SDK snippet briefly]**

> "Your agent can ask for signatures. Mandara decides whether to allow them."

---

## 6. Closing — The Ask (2:45–3:00)

**[Screen: Back to /mandara/app console, signing requests list]**

**Voiceover:**
> "We're live on Solana devnet with a full end-to-end signing lifecycle. Ika pre-alpha mock signer. Not production custody yet. But the architecture is real, the Guard program is deployed, and the product UX is here. We're raising to go from devnet beta to mainnet: audit the Guard program, integrate Ika mainnet MPC, and launch paid plans."

**[Screen: Mandara logo + contact]**

> "Mandara by HumanRail. Policy-governed AI agent wallets."

---

## Recording Checklist

- [ ] Start with clean browser cache
- [ ] Use dark mode console for visual consistency
- [ ] Pre-seed devnet artifacts so onboarding is fast
- [ ] Have API running locally (or use deployed instance)
- [ ] Close unrelated browser tabs
- [ ] Record at 1080p, 30fps minimum
- [ ] Use external mic or quality headset
- [ ] Speak slowly and clearly
- [ ] Pause 1 second between major transitions
- [ ] Total runtime under 3 minutes

## Optional B-Roll Shots

If editing, capture these quick cuts:

1. **Zoom on proposal card** when it appears (0.5s)
2. **Zoom on green "Allowed by mandate" badge** (0.3s)
3. **Quick cut to /vault/dwallets** showing live devnet data (1s)
4. **Zoom on SDK snippet** in onboarding done step (0.5s)
5. **Final logo fade** with tagline

## Devnet Disclaimer (Always Include)

Include this text overlay or spoken at the end:

> "Devnet beta only. Ika pre-alpha mock signer. Not production custody."
