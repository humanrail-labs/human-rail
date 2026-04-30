Strongest final grant concept
HumanRail Guarded dWallets: Decentralized Guardrails for Cross-Chain AI Agents
Problem

Autonomous AI agents need wallets to operate: paying vendors, executing trades, managing treasury actions, and interacting with DeFi. But giving an agent a private key is unsafe. Current solutions are either centralized custodians, basic multisigs, or single-chain permission systems.

There is no open, Solana-native policy layer that answers:

Who authorized this agent?
What is it allowed to sign?
What are its spending limits?
Can it be frozen or revoked?
Can every action be audited?
Can these controls apply to assets outside Solana?
Solution

HumanRail uses Solana as the control and policy layer for AI agents. Ika dWallets provide the cross-chain signing layer. Together, they allow verified humans to create autonomous agents that can hold/sign for assets across chains, while every action is constrained by programmable guardrails.

Why Ika is essential

Ika enables dWallet-controlled signing for external-chain assets. HumanRail policies decide whether a signing request should be approved. Without Ika, the system is only Solana-native. With Ika, HumanRail becomes a cross-chain agent custody and authorization layer.

Target users
AI agent builders
DeFi automation teams
Treasuries using autonomous agents
Trading bots with human-defined risk limits
Web3 companies needing agent accountability
Institutional teams needing audit trails for agent actions
Minimum implementation plan
Phase 1 — Repo + grant framing

Update README and landing page to reposition the project:

HumanRail Guarded dWallets
Decentralized guardrails for autonomous agents holding assets across chains.
Powered by HumanRail policy programs + Ika dWallet signing.

Add a dedicated /ika or /dashboard/dwallets route.

Phase 2 — Ika integration wrapper

Add:

lib/ika/
  client.ts
  dwallet.ts
  signing-request.ts
  policy-adapter.ts

Core functions:

createDwallet()
fetchDwallet()
createSigningRequest()
approveSigningRequestWithHumanRailPolicy()
getSignedMessage()
Phase 3 — Policy engine adapter

Create a HumanRail policy adapter that validates:

human profile exists
agent exists
agent status == Active
delegation exists
capability scope matches requested action
chain is allowed
asset is allowed
recipient is allowed
amount <= per_tx_limit
daily_used + amount <= daily_limit
capability not expired
agent not frozen

Then approve/reject the Ika signing request.

Phase 4 — Dashboard demo

Add UI cards:

1. Create Agent
2. Create / Connect Ika dWallet
3. Delegate Cross-Chain Capability
4. Submit Agent Signing Request
5. HumanRail Policy Check
6. Ika Signature Approved
7. Receipt Created

The dashboard should clearly show:

Request: Transfer 50 USDC on Base Sepolia
Agent: TreasuryBot
Policy: max 100 USDC per tx, 500 USDC daily
Status: Approved
Ika Signature: generated
HumanRail Receipt: created
Phase 5 — Video script

Under 5 minutes:

Problem — agents cannot safely hold cross-chain assets.
Architecture — Ika signs, HumanRail governs.
Demo — create human, create agent, delegate capability, request signature, approve, receipt.
Why it matters — decentralized agent custody, programmable risk controls, audit-ready compliance.
Future — private limits via Encrypt, institutional agent vaults, AI treasury automation.
How to score high on judging criteria
Criteria	How to position HumanRail
Core Integration of Ika/Encrypt	Ika is the actual signing layer. HumanRail cannot do cross-chain custody without it.
Innovation	First KYA + dWallet policy layer for autonomous agents.
Technical Execution	7 deployed Solana programs + Ika adapter + dashboard flow.
Commercial Potential	AI agents, treasury bots, trading agents, institutional custody, agent compliance.
Impact	Safer autonomous finance across chains.
Usability	Dashboard-first demo with visible policy checks and receipts.
Completeness	Working devnet programs already exist; add targeted Ika signing demo.
Final decision
Build this:

HumanRail Guarded dWallets — a Solana policy layer for Ika dWallets that lets verified humans delegate bounded cross-chain signing authority to AI agents, with spending limits, revocation, freeze controls, and immutable receipts.

This is the best option because it is:

directly aligned with the grant text,
built on your existing HumanRail work,
technically credible,
commercially understandable,
hard to copy quickly,
and genuinely dependent on Ika.