# Mandara Investor Demo Video Plan

Audience: investors, grant reviewers, crypto infrastructure partners, AI agent builders, and stablecoin/payment infrastructure teams.

Target length: 5-8 minutes.

Public website: https://humanrail.org

Local recording URL: http://localhost:3000

Status language to use throughout: Mandara is a devnet beta. Ika is pre-alpha and uses a mock signer. This is not production custody and not mainnet-ready.

## 1. Demo Strategy Recommendation

Use a hybrid demo:

- Primary path: live product UX on `https://humanrail.org/mandara` for the public site, or `http://localhost:3000/mandara` for local recording.
- Safe live actions: create/select organization, agent, demo signing wallet, mandate, preview request, create request, and optionally enqueue in dry-run.
- Proof path: use existing imported devnet proof and `/advanced` -> `/vault/dwallets` for signed Ika MessageApproval proof.
- Avoid during recording: live devnet mutation. Do not run `ika:*`, `devnet:*`, `deploy:*`, or live worker gates unless everything has been rehearsed and explicitly prepared.

Best investor approach: show Mandara as a product first, then show the technical proof at the end. This keeps the demo business-readable while proving the underlying system is real.

## 2. Recording Setup Commands

Terminal 1:

```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
REDIS_URL=redis://:changeme@localhost:6379 npm run product:api:dev
```

Terminal 2:

```bash
REDIS_URL=redis://:changeme@localhost:6379 npm run product:worker:dev
```

Terminal 3:

```bash
npm run dev
```

Optional checks before recording:

```bash
npm run product:api:smoke
npm run product:dashboard:smoke
npm run product:frontend:smoke
npm run product:agent-api:smoke
npm run product:webhook:smoke
```

Do not run live devnet scripts for the investor recording.

## 3. Browser / Page Preparation

For the public hosted site, start at:

```text
https://humanrail.org/mandara
```

For a local product recording, start at:

```text
http://localhost:3000/mandara
```

Recommended browser setup:

- Width: 1440px or 1512px.
- Height: 900px or taller.
- Browser zoom: 90-100%.
- Use a clean browser profile.
- Hide bookmarks bar.
- Keep terminal windows ready but mostly off-screen.

Wallet:

- Mandara product pages do not need a browser wallet.
- `/vault/dwallets` is advanced protocol proof and may require a Solana wallet depending on the view.
- If wallet connection is unstable, show `/advanced` first and only open `/vault/dwallets` if already tested.

API key safety:

- If creating a Connection Key live, do not expose the full raw key in the recording.
- Blur/crop the key area or use a throwaway local key and revoke/delete it after recording.
- Prefer showing the SDK snippet with `MANDARA_AGENT_API_KEY` placeholder.

Data prep:

- Have at least one existing signed proof imported via `npm run product:import-devnet-artifacts`.
- Have one existing webhook if possible, or create a local demo webhook only if smoke-tested.
- Have one existing signed or completed request visible in Requests/Advanced Proof.

## 4. 5-8 Minute Video Timeline

| Time | Section | Page | Goal |
|---:|---|---|---|
| 0:00-0:35 | Opening problem | `/mandara` | Explain why AI agents need controlled signing |
| 0:35-1:10 | Product overview | `/mandara` | Position Mandara by HumanRail |
| 1:10-1:50 | Console/dashboard | `/mandara/app` | Show product is a real console |
| 1:50-3:15 | Onboarding | `/mandara/app/onboarding` | Create/connect agent, wallet, mandate |
| 3:15-4:10 | Signature request | onboarding test or `/mandara/app/requests` | Preview/create/enqueue request |
| 4:10-4:50 | Agent API / SDK | onboarding Done or SDK snippet | Show real agent integration path |
| 4:50-5:35 | Webhooks/audit | `/mandara/app/webhooks`, `/mandara/app/activity` | Show production product surfaces |
| 5:35-6:50 | Advanced proof | `/advanced`, `/vault/dwallets` | Show signed devnet lifecycle proof |
| 6:50-7:30 | Close | `/mandara` or `/mandara/app` | Business potential and honest beta limits |

## 5. Scene-by-Scene Recording Script

## Scene 1 - Product Landing

URL:

```text
https://humanrail.org/mandara
```

Local fallback:

```text
http://localhost:3000/mandara
```

Action:

- Show the hero.
- Keep the disclaimer visible.
- Click `Open Mandara Console`.

Voiceover:

"Mandara by HumanRail is a devnet beta control plane for AI agents that need signing power without unlimited wallet control. The problem is simple: agents are starting to move money and trigger transactions, but handing an agent a raw private key is too risky, while asking a human to approve every action kills automation."

Investor point:

"This is the control plane layer for autonomous finance."

Do not mention:

- PDA
- CPI
- MessageApproval
- Mainnet readiness
- Production custody

## Scene 2 - Mandara Console

URL:

```text
https://humanrail.org/mandara/app
```

Local fallback:

```text
http://localhost:3000/mandara/app
```

Action:

- Show the sidebar: Overview, Onboarding, Agents, Signing Wallets, Mandates, Signature Requests, Activity, Webhooks.
- Point to status cards and recent requests.
- Click `Onboarding`.

Voiceover:

"This is the product layer. A team can manage agents, signing wallets, mandates, signature requests, activity logs, and webhooks from one console. Normal Mandara users do not need a browser wallet here."

Investor point:

"Mandara is not just a protocol page. It is becoming an operator console."

Do not mention:

- Wallet adapter
- Solana wallet requirement
- Protocol internals

## Scene 3 - Start Onboarding

URL:

```text
https://humanrail.org/mandara/app/onboarding
```

Local fallback:

```text
http://localhost:3000/mandara/app/onboarding
```

Action:

- Click `Start`.
- On Organization step, either select an existing organization or create:
  - Organization name: `Mandara Demo Workspace`
  - Workspace slug: `mandara-demo-recording`
- Click `Create Organization` or `Use ...`.

Voiceover:

"The onboarding flow starts with an organization. This is the workspace that owns agents, signing wallets, mandates, requests, webhooks, and audit logs."

Investor point:

"This maps to a real SaaS buyer: a team, fund, app, or infrastructure provider."

Do not mention:

- Dev auth header
- Prisma
- Database details

## Scene 4 - Create Agent

Action:

- Agent name: `Treasury Agent`
- Description: `Policy-governed USDC payout agent`
- Click `Create Agent`.

Voiceover:

"Next we register an agent. This is not the AI model itself. It is the Mandara identity and control-plane profile that a real agent runtime will connect to through an API key or SDK."

Investor point:

"Mandara does not run the agent. It governs what the agent can sign."

Do not mention:

- Agent registry PDAs
- On-chain account layout

## Scene 5 - Signing Wallet

Action:

- Click `Use Devnet Demo Signing Wallet`.
- Do not open advanced manual wallet import unless needed.

Voiceover:

"Now we connect a signing wallet. For the product flow, this is just a Signing Wallet. Under the hood, it is powered by Ika dWallet infrastructure, but the normal user does not need to handle protocol details."

Investor point:

"Mandara separates authority from raw key custody."

Do not mention:

- Mock signer yet
- PDA details
- Service wallet path

## Scene 6 - Create Mandate

Action:

Use these values:

- Chain: `84532`
- Asset: `USDC:BASE_SEPOLIA`
- Recipient wallet address: `0x1111111111111111111111111111111111111111`
- Per-transaction limit: `100000000`
- Daily limit: `500000000`
- Total limit: `1000000000`

Click `Create Mandate`.

Voiceover:

"This mandate defines what the agent is allowed to request. In this demo, the agent can request USDC signatures for Base Sepolia, to a specific recipient, within per-transaction, daily, and total limits."

Investor point:

"This is the policy product: bounded autonomy."

Do not mention:

- Hashes
- Guard CPI
- Message digest

## Scene 7 - Connection Key

Action:

- Key name: `demo-recording-key`
- Click `Create API Key`.
- Do not expose the full raw key. Blur/crop if recording.
- Click `Next`.

Voiceover:

"This creates a Connection Key for the real agent. The key is shown once, and the backend stores only the hash. In a real integration, this key lives in the agent runtime environment, not in the browser."

Investor point:

"This is how autonomous agents integrate without humans clicking buttons."

Do not mention:

- Real secrets
- Any full API key value
- Production auth readiness

## Scene 8 - Preview and Create Signature Request

Action:

Use:

- Amount: `42000000`
- Message: `Investor demo payout request`

Click:

- `Preview`
- Show `Allowed`
- Click `Create Request`
- Optionally click `Enqueue` if worker dry-run is already running.

Voiceover:

"Before a signature is requested, the agent can preview whether the request passes the mandate. This one is allowed. Then the agent creates a signature request. If we enqueue it, the worker picks it up and processes it through the signing pipeline."

Investor point:

"The product supports policy preview, request creation, queueing, and execution tracking."

Do not mention:

- Live mutation unless worker is explicitly in live mode
- Mainnet assets
- Real payments

## Scene 9 - Requests and Execution Detail

URL:

```text
https://humanrail.org/mandara/app/requests
```

Local fallback:

```text
http://localhost:3000/mandara/app/requests
```

Action:

- Click a recent request.
- Show status badge.
- If signed request exists, show signature field.
- If dry-run request exists, show request and audit events.
- Click `Poll status` only if you have tested it.

Voiceover:

"Every request has a lifecycle: requested, queued, processing, approved, waiting for signature, signed, rejected, or failed. The console gives operators a readable view of that lifecycle."

Investor point:

"This gives teams observability and control over agent signing."

Do not mention:

- Low-level status enums unless visible
- Any secret value

## Scene 10 - Agent API / SDK

URL:

Use onboarding Done screen SDK snippet, or briefly show `docs/MANDARA_SDK.md` locally.

Action:

Show snippet:

```ts
const client = new MandaraClient({
  apiKey,
  baseUrl,
});

await client.previewSignatureRequest(...);
await client.requestSignature(...);
await client.waitForSignature(...);
```

Voiceover:

"Mandara is not only a dashboard. A real AI agent connects through the REST API or TypeScript SDK. The agent can preview a request, request a signature, and wait for the signed result."

Investor point:

"This is developer infrastructure, not a closed demo app."

Do not mention:

- Raw API key
- Internal endpoint secrets

## Scene 11 - Webhooks

URL:

```text
https://humanrail.org/mandara/app/webhooks
```

Local fallback:

```text
http://localhost:3000/mandara/app/webhooks
```

Action:

- Show webhook URL field.
- Show events field: `signature.requested,signature.signed`
- If safe local receiver exists, create webhook.
- Otherwise say it is configured here and avoid live creation.
- Click `Load` to show existing webhooks if present.

Voiceover:

"Applications need to react when a request changes state. Mandara supports webhooks so downstream systems can update ledgers, notify operators, or continue an agent workflow when a signature is ready."

Investor point:

"This is what product infrastructure needs: not just signing, but integration hooks."

Do not mention:

- Webhook secret values
- Encryption password
- Internal delivery secrets

## Scene 12 - Activity Log and Audit Export

URL:

```text
https://humanrail.org/mandara/app/activity
```

Local fallback:

```text
http://localhost:3000/mandara/app/activity
```

Action:

- Show recent events: organization created, agent created, mandate created, request created, request queued.
- If using `/vault/dwallets` Product Dashboard tab, show Audit Export card and buttons `Export JSON` / `Export CSV`.
- Do not download if it distracts; just point to the buttons.

Voiceover:

"Every important action is recorded in the Activity Log. For compliance and operations, Mandara also supports audit exports as JSON or CSV."

Investor point:

"Agent signing needs accountability. Auditability is part of the product, not an afterthought."

Do not mention:

- Database table names
- Raw audit payload internals

## Scene 13 - Advanced Technical Proof Hub

URL:

```text
https://humanrail.org/advanced
```

Local fallback:

```text
http://localhost:3000/advanced
```

Action:

- Show the disclaimer.
- Point to `dWallet Proof`.
- Click `dWallet Proof` only if it has been tested.

Voiceover:

"For developers and reviewers, we keep the protocol proof separate. Normal users should stay in the Mandara Console. This area shows the HumanRail and Ika devnet proof behind the product."

Investor point:

"The advanced proof supports diligence without polluting the user experience."

## Scene 14 - dWallet Technical Proof

URL:

```text
https://humanrail.org/vault/dwallets
```

Local fallback:

```text
http://localhost:3000/vault/dwallets
```

Action:

- If wallet gate appears, say: "This advanced protocol area may require a Solana wallet; the Mandara product flow does not."
- Show banner: `Advanced Technical Proof`.
- Show Product Dashboard tab if accessible.
- Show proof cards around:
  - real Ika dWallet
  - GuardedDwallet policy
  - Approved Signing Request
  - signed MessageApproval
  - signature hex if visible

Voiceover:

"This is the technical proof. The system has proven a full Solana devnet lifecycle: HumanRail Guard approval, Ika MessageApproval, and a signed devnet result. Ika is still pre-alpha and uses a mock signer, so this is not production custody, but it proves the end-to-end shape."

Investor point:

"Mandara has both product UX and credible protocol depth."

Do not mention:

- Mainnet readiness
- Production MPC
- Real customer assets

## Scene 15 - Closing

URL:

```text
https://humanrail.org/mandara
```

Local fallback:

```text
http://localhost:3000/mandara
```

Action:

- Return to Mandara Home or Console.
- Keep disclaimer visible if possible.

Voiceover:

"Mandara is the product layer for policy-governed agent signing. HumanRail provides identity, mandates, guardrails, and auditability. Ika provides the dWallet signing infrastructure. Today this is a devnet beta with a proven technical lifecycle. The next steps are external-beta hardening: production auth, rate limits, monitoring, secret management, and mainnet readiness when Ika and audits are ready."

Investor point:

"This is a credible path from protocol proof to infrastructure product."

## 6. Exact Click Path and Field Values

Recommended live click path:

1. Open `https://humanrail.org/mandara` or `http://localhost:3000/mandara`.
2. Click `Open Mandara Console`.
3. Click `Onboarding`.
4. Click `Start`.
5. Organization:
   - Name: `Mandara Demo Workspace`
   - Slug: `mandara-demo-recording`
   - Click `Create Organization`
6. Agent:
   - Name: `Treasury Agent`
   - Description: `Policy-governed USDC payout agent`
   - Click `Create Agent`
7. Signing Wallet:
   - Click `Use Devnet Demo Signing Wallet`
8. Mandate:
   - Chain: `84532`
   - Asset: `USDC:BASE_SEPOLIA`
   - Recipient: `0x1111111111111111111111111111111111111111`
   - Per-transaction limit: `100000000`
   - Daily limit: `500000000`
   - Total limit: `1000000000`
   - Click `Create Mandate`
9. Connection Key:
   - Key name: `demo-recording-key`
   - Click `Create API Key`
   - Do not show full key
   - Click `Next`
10. Test Request:
    - Amount: `42000000`
    - Message: `Investor demo payout request`
    - Click `Preview`
    - Click `Create Request`
    - Optional: click `Enqueue` if dry-run worker is running
11. Go to `/mandara/app/requests`.
12. Click latest request.
13. Click `Poll status` if tested.
14. Go to `/mandara/app/activity`.
15. Go to `/mandara/app/webhooks`.
16. Go to `/advanced`.
17. Click `dWallet Proof` only if wallet/advanced route is ready.

If any UI step fails:

- Do not debug live.
- Say: "For time, I will show the already-created signed proof."
- Move to `/advanced` or `/vault/dwallets`.

## 7. Full Voiceover Script

"AI agents are starting to become economic actors. They trade, route payments, rebalance positions, trigger treasury workflows, and interact with stablecoin infrastructure. But there is a hard problem: if you give an agent a private key, it can do anything that key can do. If you require human approval for every signature, the agent is no longer autonomous.

Mandara by HumanRail is a devnet beta control plane for this problem. It lets teams give AI agents signing power without giving them unlimited wallet control.

The product has three layers. Mandara is the dashboard, API, worker, SDK, webhooks, and audit layer. HumanRail provides the identity, mandate, guardrail, and audit logic. Ika provides the dWallet signing infrastructure. Together, the goal is policy-governed cross-chain signing for AI agents.

Here on humanrail.org, the positioning is clear: this is devnet beta, Ika is pre-alpha with a mock signer, and this is not production custody. That honesty matters. What we are showing today is a working product direction and a proven devnet lifecycle.

Now I will open the Mandara Console. This is the product layer. Operators can see agents, signing wallets, mandates, signature requests, activity, and webhooks. A normal Mandara user does not need to connect a browser wallet. The wallet-gated protocol pages are isolated under Advanced Technical Proof.

Let us onboard an agent. First, we create an organization. This represents a customer workspace: a treasury team, a stablecoin app, an AI agent builder, or an infrastructure partner.

Next we register an agent. This is the Mandara control-plane identity for the real AI agent. Mandara does not run the AI model. Instead, it governs what that agent is allowed to request.

Now we attach a Signing Wallet. In the product, this is presented simply as a signing wallet. Under the hood, it maps to Ika dWallet infrastructure. For this recording, I am using the devnet demo signing wallet.

Next we create a mandate. This is the core product primitive. The mandate says what the agent can request: which destination chain, which asset, which recipient, and what spending limits apply. In this example, the agent can request USDC signing for Base Sepolia, to one recipient, within per-transaction, daily, and total limits.

Now we create a Connection Key. This is how the real agent connects to Mandara through the API or SDK. The raw key is shown once, and the backend stores only a hash. In a real integration, this key lives in the agent runtime environment.

Now we send a test signature request. First we preview the request. The preview tells the agent whether the request would pass the mandate before creating a real request. This one is allowed. Then we create the request, and optionally enqueue it for the worker.

The request lifecycle is visible in the console. Operators can see whether the request is waiting, queued, processing, approved by mandate, waiting for Ika signature, signed, rejected, or failed. This is important because agent signing infrastructure needs observability.

Mandara also exposes the same flow through the agent API and TypeScript SDK. A real agent can initialize a Mandara client with a base URL and API key, preview a signature request, create the request, and wait for the signed result. That makes this developer infrastructure, not just a dashboard demo.

For integration teams, Mandara supports webhooks. An application can receive events when requests are created, queued, signed, rejected, or failed. The Activity Log and audit export give teams the operational record they need for review, debugging, and compliance workflows.

Now I will switch to the Advanced Technical Proof. This is separated intentionally. Normal users should stay in the product console. Developers and reviewers can inspect the protocol-level proof here.

The advanced proof shows the HumanRail and Ika devnet lifecycle: HumanRail Guard approval, Ika MessageApproval, and a signed devnet result. This proves the end-to-end architecture on Solana devnet. It is still devnet only, and Ika is still pre-alpha with a mock signer, so we are not claiming production custody or mainnet readiness.

The business opportunity is to become the policy-governed signing layer for AI agents. As agents begin handling payments, treasury operations, stablecoin flows, and cross-chain transactions, teams will need a way to delegate limited signing authority with controls, logs, webhooks, and developer APIs.

Mandara is the product path from protocol proof to usable infrastructure: console, API, worker, SDK, webhooks, audit exports, and advanced technical proof, all aligned around policy-governed agent signing."

## 8. What Not To Say

Do not say:

- "Production custody is live."
- "Mandara is mainnet-ready."
- "Real MPC security is live."
- "Agents can autonomously spend without limits."
- "Mandara replaces Ika."
- "Mandara replaces wallets."
- "There is no risk."
- "This is fully audited."
- "Users can use real assets today."
- "This is ready for open beta."
- "This is production-grade auth."
- "Webhook and secret management are fully enterprise-ready."

Say instead:

- "Devnet beta."
- "Ika pre-alpha mock signer."
- "Policy-governed signing flow."
- "Not production custody."
- "Mainnet depends on Ika mainnet, audits, and production hardening."
- "External beta still needs auth hardening, rate limiting, monitoring, and production secret management."

## 9. Investor Q&A

### 1. Is this production-ready?

No. It is a devnet beta. The product flow works, and the devnet technical lifecycle has been proven, but external beta still needs auth hardening, rate limiting, monitoring, and production secret management.

### 2. Why Ika?

Ika provides dWallet signing infrastructure. Mandara needs a signing layer that can support cross-chain signatures. HumanRail governs the request; Ika provides the signing capability.

### 3. Why HumanRail?

HumanRail adds the policy, identity, mandate, guardrail, and audit layer that raw signing infrastructure does not provide by itself.

### 4. What is Mandara's business model?

Likely SaaS/API infrastructure: subscription tiers by agents, requests, webhooks, audit retention, team seats, and enterprise deployment/support.

### 5. Who is the buyer?

AI agent builders, stablecoin/payment infrastructure teams, crypto treasury operators, DeFi automation teams, and infrastructure partners building autonomous transaction systems.

### 6. How is this different from a multisig?

A multisig is human approval infrastructure. Mandara is bounded autonomy infrastructure. A human sets the mandate once, and the agent can operate inside that mandate with logs and controls.

### 7. How do agents connect?

Through the Mandara REST API or TypeScript SDK using a Connection Key scoped to one agent.

### 8. What happens if policy rejects?

The request is rejected before signing. The agent receives a clear rejection reason, and no signature is produced.

### 9. What are the next blockers?

Production auth, rate limiting, monitoring, hardened secret management, hosted infrastructure backups, beta access controls, and eventually audits/mainnet readiness.

### 10. What is the path to mainnet?

Wait for Ika mainnet readiness, audit HumanRail programs, harden Mandara's SaaS infrastructure, replace dev auth, complete security review, and only then discuss production custody language.

## 10. Backup Plan If API / Worker Is Not Running

If API is down:

- Open `https://humanrail.org/mandara` or `http://localhost:3000/mandara`.
- Show landing page and product positioning.
- Click console and show API unavailable state.
- Say: "The API is not running in this recording environment; the product tells operators exactly how to start it."
- Move to `/advanced`.

If worker is down:

- Still show onboarding, preview, and create request.
- Do not click `Enqueue`.
- Say: "For this recording I am not running live execution. I will show the already-proven signed lifecycle in Advanced Technical Proof."

If wallet advanced page fails:

- Stay on `/advanced`.
- Show the hub and explain proof links.
- Use docs or screenshots from prior proof only if already prepared.
- Do not troubleshoot wallet connection live.

If API key appears on screen:

- Stop recording or blur/crop.
- Do not publish a video with a full key visible, even if local.

## 11. Final Checklist Before Recording

- `npm run product:docker:up` completed.
- `npm run product:db:push` completed without force reset.
- `npm run product:import-devnet-artifacts` completed.
- API running on `http://localhost:4000`.
- Worker running in default dry-run mode.
- Frontend running on `http://localhost:3000`, or hosted site verified at `https://humanrail.org`.
- `/mandara` loads.
- `/mandara/app` loads data.
- `/mandara/app/onboarding` can create/select org, agent, wallet, mandate.
- `/mandara/app/requests` has at least one request visible.
- `/mandara/app/activity` has events.
- `/mandara/app/webhooks` loads.
- `/advanced` loads.
- `/vault/dwallets` has been tested if you plan to show it.
- No raw API key, webhook secret, private key, `.env.product`, `.local-ika`, `.local-keys`, service wallet path, or keypair appears on screen.
- Script uses "devnet beta," "Ika pre-alpha mock signer," and "not production custody."
- Script does not claim mainnet readiness.
