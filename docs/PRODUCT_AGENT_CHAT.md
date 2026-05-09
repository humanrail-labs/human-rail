# Mandara Agent Chat

Product Phase P12 adds Agent Chat at `/mandara/app/agent-chat`.

Agent Chat lets a normal user talk to a Mandara Agent in natural language. The assistant can extract intent, prepare a structured Signature Request proposal, preview it against the Agent's Mandate, and show an approve/reject card.

## What It Does

- Creates Agent Chat sessions and messages.
- Parses demo natural-language requests such as `Prepare a 42 USDC payout to the approved Base Sepolia recipient`.
- Previews proposed Signature Requests against the existing Mandate policy evaluator.
- Shows whether the proposal is allowed or rejected by the Mandate.
- Creates a Signing Request only after explicit user approval.
- Optionally enqueues the request only when the user chooses `Approve, Create & Enqueue`.
- Records Agent Chat audit events in the Activity Log.
- Tracks Agent Chat usage against the organization's plan.

## What It Does Not Do

- The LLM never signs.
- The LLM never enqueues execution by itself.
- The LLM never bypasses policy checks.
- The LLM never receives service wallets, private keys, `.local-ika`, `.local-keys`, `.env.product`, backend secrets, or browser credentials.
- The browser never receives LLM provider API keys.
- The browser does not call Solana or Ika directly.
- Agent Chat refuses unrelated general-purpose LLM tasks.

The backend and existing Mandara APIs/workers remain the authority.

## Safety Model

The message endpoint only creates a proposal after policy preview. It does not create a Signing Request and does not enqueue execution.

The approval endpoint is the only Agent Chat endpoint that can create a Signing Request. Enqueue remains a separate explicit option on approval. If the Mandate preview rejects the request, the proposal can be rejected but cannot be approved into a live request.

Mandara is devnet beta only. Ika is pre-alpha/mock signer. This is not production custody.

## LLM Provider

Environment variables:

```bash
MANDARA_LLM_ENABLED="false"
MANDARA_LLM_PROVIDER="deepseek"
MANDARA_LLM_API_KEY=""
MANDARA_LLM_MODEL="deepseek-chat"
MANDARA_LLM_BASE_URL="https://api.deepseek.com"
MANDARA_LLM_TIMEOUT_MS="20000"
MANDARA_LLM_MAX_INPUT_CHARS="4000"
MANDARA_LLM_MAX_OUTPUT_TOKENS="700"
MANDARA_LLM_GEMINI_API_KEY=""
MANDARA_LLM_GEMINI_MODEL="gemini-2.5-flash-lite"
MANDARA_LLM_GROQ_API_KEY=""
MANDARA_LLM_GROQ_MODEL="llama-3.1-8b-instant"
```

DeepSeek is the default backend provider when LLMs are enabled and a key is configured. The default runtime setting is still `MANDARA_LLM_ENABLED=false`, so deterministic parsing always works without a provider key.

When an LLM provider is enabled, the backend asks for structured JSON only and validates the response with Zod before using it. The LLM output is still treated as untrusted and must pass Mandate preview.

## Scope Guard

Before any LLM provider call, the backend classifies the user message. Allowed topics include Mandara Agents, Signing Wallets, Mandates, Signature Requests, policy preview, approval/rejection, execution status, SDK/API setup, webhooks, audit logs, and onboarding.

Rejected topics include generic essay writing, unrelated coding help, trading advice, legal/medical/financial advice, requests for secrets/private keys, and prompts to bypass mandates. The refusal is:

`I can only help with Mandara agents, mandates, signature requests, SDK/API setup, webhooks, and audit logs.`

Out-of-scope messages do not call the LLM provider and do not create proposals.

## Usage And Plan Limits

P12 creates a default `dev_free` subscription for each organization and enforces the monthly Agent Chat limit before processing accepted messages.

Plan limits:

- `dev_free`: 100 chat messages, 50 signature requests, 100 webhook deliveries, 3 Agents, 5 Mandates
- `builder`: 2,000 chat messages, 1,000 signature requests, 5,000 webhook deliveries, 10 Agents, 25 Mandates
- `team`: 10,000 chat messages, 5,000 signature requests, 25,000 webhook deliveries, 50 Agents, 200 Mandates
- `enterprise`: high soft limits

`GET /api/subscription` returns the current plan, usage, and limits. Solana-native subscription activation is planned for P13; P12 does not charge wallets, mint tokens, or collect payments.

## API Endpoints

- `GET /api/agent-chat/sessions`
- `POST /api/agent-chat/sessions`
- `GET /api/agent-chat/sessions/:id`
- `POST /api/agent-chat/messages`
- `POST /api/agent-chat/proposals/:id/approve`
- `POST /api/agent-chat/proposals/:id/reject`
- `GET /api/subscription`

## Example Prompts

- `Prepare a 42 USDC payout to the approved Base Sepolia recipient`
- `Request 42000000 USDC on Base Sepolia`
- `Pay vendor invoice for 42 USDC`
- `Send 42 USDC to 0x1111111111111111111111111111111111111111`
- `Can this agent request 150 USDC?`
- `Explain this agent's mandate`
- `How do I connect a real agent with the SDK?`

## Developer Smoke Test

Start the product API and run:

```bash
npm run product:agent-chat:smoke
```

By default the smoke test does not enqueue. To test enqueue:

```bash
PRODUCT_AGENT_CHAT_SMOKE_ENQUEUE=true npm run product:agent-chat:smoke
```
