# HumanRail Protocol Documentation

## Mandara by HumanRail

> Programmable mandates for cross-chain AI agents, powered by Ika dWallets.

---

## Grant Submission Documents

| Document | Purpose |
|----------|---------|
| [`GRANT_SUBMISSION.md`](GRANT_SUBMISSION.md) | Full grant submission: problem, solution, architecture, demo flow, commercial potential |
| [`JUDGING_CRITERIA.md`](JUDGING_CRITERIA.md) | Mapping of project to each judging criterion with concrete proof |
| [`DEMO_VIDEO_SCRIPT.md`](DEMO_VIDEO_SCRIPT.md) | Under-5-minute demo video script with screen actions and voiceover |
| [`FINAL_AUDIT.md`](FINAL_AUDIT.md) | Final audit: commits, programs, artifacts, commands, security check, readiness checklist |

## Product Architecture Documents

| Document | Purpose |
|----------|---------|
| [`PRODUCT_ARCHITECTURE.md`](PRODUCT_ARCHITECTURE.md) | Target product architecture for Mandara hosted MVP: backend stack, security model, migration plan, roadmap |
| [`PRODUCT_DATABASE_MODEL.md`](PRODUCT_DATABASE_MODEL.md) | Proposed Prisma schema for organizations, agents, policies, signing requests, audit events, webhooks |
| [`PRODUCT_API_DESIGN.md`](PRODUCT_API_DESIGN.md) | API contract draft: dashboard API, agent API, webhook events, error formats, rate limits |
| [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md) | Phase-by-phase implementation plan (P0–P10) with objectives, files, acceptance criteria, and risks |
| [`PRODUCT_LOCAL_SETUP.md`](PRODUCT_LOCAL_SETUP.md) | Local development setup: Docker Compose, Prisma, API server, smoke tests |
| [`PRODUCT_ARTIFACT_IMPORT.md`](PRODUCT_ARTIFACT_IMPORT.md) | Import completed devnet lifecycle into product database and inspect via API |
| [`PRODUCT_DASHBOARD.md`](PRODUCT_DASHBOARD.md) | Product dashboard UI: data, create/preview/enqueue, execution polling |
| [`PRODUCT_AGENT_API.md`](PRODUCT_AGENT_API.md) | External agent API: API keys, Bearer auth, /v1 endpoints, security notes |
| [`MANDARA_SDK.md`](MANDARA_SDK.md) | TypeScript SDK: install, quick start, API reference, error handling, examples |
| [`PRODUCT_FRONTEND_REBUILD.md`](PRODUCT_FRONTEND_REBUILD.md) | P11 frontend rebuild: landing page, console dashboard, onboarding wizard, route map |
| [`PRODUCT_WEBHOOKS.md`](PRODUCT_WEBHOOKS.md) | Webhooks: event types, payload format, signature verification, retry behavior |
| [`PRODUCT_AUDIT_EXPORTS.md`](PRODUCT_AUDIT_EXPORTS.md) | Audit exports: JSON/CSV download, event types, query parameters |
| [`PRODUCT_DEPLOYMENT.md`](PRODUCT_DEPLOYMENT.md) | Devnet beta deployment: Docker, Render, Fly, Railway, VPS, env vars, health checks |
| [`PRODUCT_OPERATIONS_RUNBOOK.md`](PRODUCT_OPERATIONS_RUNBOOK.md) | Day-2 operations: start/stop, health checks, queue inspection, incident response |
| [`BETA_LAUNCH_CHECKLIST.md`](BETA_LAUNCH_CHECKLIST.md) | Pre-beta readiness checklist: infrastructure, security, docs, monitoring, legal |

## Product Launch Documents

| Document | Purpose |
|----------|---------|
| [`PRODUCT_LAUNCH_PACKAGE.md`](PRODUCT_LAUNCH_PACKAGE.md) | Product positioning, problem, solution, target users, use cases, demo proof, next milestones |
| [`LANDING_PAGE_COPY.md`](LANDING_PAGE_COPY.md) | Hero headlines, feature sections, how-it-works, FAQ, footer copy |
| [`DEVELOPER_ONBOARDING.md`](DEVELOPER_ONBOARDING.md) | 10-minute guide: local stack, create org/agent/policy, SDK usage, webhooks, troubleshooting |
| [`CUSTOMER_DEMO_SCRIPT.md`](CUSTOMER_DEMO_SCRIPT.md) | 10-minute and 3-minute demo scripts with narrative, commands, and objection handling |
| [`PRICING_HYPOTHESIS.md`](PRICING_HYPOTHESIS.md) | Beta pricing model: Dev Sandbox, Builder, Team, Enterprise tiers |
| [`PRODUCT_FINAL_AUDIT.md`](PRODUCT_FINAL_AUDIT.md) | Final product audit: build results, security status, beta blockers, go/no-go recommendation |

## Technical Documentation

| Document | Purpose |
|----------|---------|
| [`IKA_INTEGRATION_RUNBOOK.md`](IKA_INTEGRATION_RUNBOOK.md) | Complete Ika integration phases (5A–6) with commands, PDAs, transaction details |
| [`GRANT_IKA_SUBMISSION_PLAN.md`](GRANT_IKA_SUBMISSION_PLAN.md) | Original submission plan with phase checkboxes |
| [`IKA_TECHNICAL_NOTES.md`](IKA_TECHNICAL_NOTES.md) | Ika technical notes, PDA derivations, account layouts |
| [`DWALLET_GUARD_PROGRAM.md`](DWALLET_GUARD_PROGRAM.md) | HumanRail dWallet Guard program documentation |
| [`dWallet Developer Guide-IKA.pdf`](dWallet%20Developer%20Guide-IKA.pdf) | Official Ika dWallet developer guide (PDF) |
| [`dWallet_Developer_Guide-IKA.md`](dWallet_Developer_Guide-IKA.md) | Official Ika dWallet developer guide (Markdown) |

---

## Quick Links

- **Demo:** [`/vault/dwallets`](/vault/dwallets)
- **Main README:** [`../README.md`](../README.md)
- **Final Check:** `npm run final:check`
## Mandara Product Entry

Mandara by HumanRail is the user-facing product. Start at `/mandara` or `/mandara/app` for product onboarding and console work. These pages do not require a browser wallet.

The HumanRail Protocol proof remains available under `/advanced` and protocol routes such as `/vault/*`, `/agent/*`, `/human/*`, `/delegation`, `/receipts`, and `/rails/*`. These routes may require a Solana wallet and expose PDA, CPI, MessageApproval, program ID, and Ika devnet internals.

For local product UI:

```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:dev
```

Mandara is devnet beta only. Ika is pre-alpha with a mock signer. This is not production custody.
