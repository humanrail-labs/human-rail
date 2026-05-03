# Mandara TypeScript SDK

> Developer SDK for integrating AI agents with the Mandara signing API.  
> **Package:** `@mandara/sdk`  
> **Phase:** P7 — Mandara SDK  
> **Last updated:** 2026-05-02

---

## Install

The SDK is a workspace package in the HumanRail Protocol repo:

```bash
npm install
```

Then import:

```ts
import { MandaraClient } from "@mandara/sdk";
```

No npm publish yet; import directly from the monorepo.

---

## Quick Start

### 1. Create an API key

Use the dashboard or the helper script:

```bash
npm run product:create-dev-agent-key
# Copy the raw key and export it:
export MANDARA_AGENT_API_KEY="mandara_dev_..."
```

### 2. Initialize the client

```ts
import { MandaraClient } from "@mandara/sdk";

const client = new MandaraClient({
  apiKey: process.env.MANDARA_AGENT_API_KEY!,
  baseUrl: process.env.MANDARA_API_URL, // optional, defaults to http://localhost:4000
});
```

### 3. Check agent status

```ts
const status = await client.getAgentStatus();
console.log(status.agent.name, "— policies:", status.activePolicies);
```

### 4. Preview a request (dry-run)

```ts
const preview = await client.previewSignatureRequest({
  destinationChainId: 84532,
  asset: "USDC:BASE_SEPOLIA",
  recipient: "0x1111111111111111111111111111111111111111",
  amount: "42000000",
  message: "Pay vendor invoice #123",
});

if (preview.policyDecision.allowed) {
  console.log("Allowed — messageDigest:", preview.messageDigest);
} else {
  console.log("Rejected:", preview.policyDecision.reason);
}
```

### 5. Request a signature

```ts
const request = await client.requestSignature({
  destinationChainId: 84532,
  asset: "USDC:BASE_SEPOLIA",
  recipient: "0x1111111111111111111111111111111111111111",
  amount: "42000000",
  message: "Pay vendor invoice #123",
  enqueue: true, // add to worker queue immediately
});

console.log("Created:", request.id, "status:", request.status);
```

### 6. Poll until signed

```ts
import { assertSigned } from "@mandara/sdk";

const signed = await client.waitForSignature(request.id, {
  timeoutMs: 120_000,
  intervalMs: 3_000,
});

assertSigned(signed);
console.log("Signature:", signed.signature);
```

---

## API Reference

### `new MandaraClient(options)`

| Option | Type | Required | Default |
|--------|------|----------|---------|
| `apiKey` | `string` | Yes | — |
| `baseUrl` | `string` | No | `process.env.MANDARA_API_URL \|\| "http://localhost:4000"` |
| `fetch` | `typeof fetch` | No | `globalThis.fetch` |
| `timeoutMs` | `number` | No | `30000` |

Throws `MandaraValidationError` if `apiKey` is missing.

### `client.getAgentStatus()`

Returns `AgentStatusResponse`:
```ts
{
  agent: { id: string; name: string; status: string };
  organization: { id: string };
  activePolicies: number;
  signingRequests: { total: number; signed: number };
}
```

### `client.previewSignatureRequest(input)`

Evaluates policy without creating a record.

Input: `SignatureRequestInput`
```ts
{
  destinationChainId: number;
  asset: string;
  recipient: string;
  amount: string;
  message: string;
  policyId?: string;
}
```

Returns `SignatureRequestPreview`:
```ts
{
  policyDecision: PolicyDecision;
  messageDigest: string;
}
```

### `client.requestSignature(input)`

Creates a signing request. Throws `MandaraApiError` with code `POLICY_REJECTED` if the policy rejects the request.

Input: `SignatureRequestInput & { enqueue?: boolean; idempotencyKey?: string }`

Returns `CreateSignatureRequestResponse`:
```ts
{
  id: string;
  status: "requested" | "queued";
  policyDecision: PolicyDecision;
  execution?: { jobId?: string; queue: string; status: string };
  messageDigest: string;
  signingRequest: { id: string; requestId: string; status: string };
}
```

### `client.getSignatureRequest(id)`

Returns `SignatureRequestResponse`:
```ts
{
  id: string;
  requestId: string;
  status: SignatureRequestStatus;
  destinationChainId: number;
  asset: string | null;
  recipient: string | null;
  amount: string;
  message: string | null;
  messageDigest: string;
  executionJobId: string | null;
  signature: string | null;
  messageApproval: { status: string; signatureHex: string | null } | null;
  nextStep: string;
}
```

### `client.waitForSignature(id, options?)`

Polls `getSignatureRequest` until the request reaches a terminal state.

Options:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `intervalMs` | `number` | `3000` | Polling interval |
| `timeoutMs` | `number` | `120000` | Total timeout |
| `allowTerminalRejected` | `boolean` | `false` | If true, resolves on `policy_rejected` / `failed` instead of throwing |

- Resolves when `status === "signed"`.
- Throws `MandaraTimeoutError` if timeout is reached.
- Throws `MandaraApiError` with code `SIGNATURE_TERMINAL` if the request reaches `policy_rejected` or `failed` (unless `allowTerminalRejected` is true).

### Utilities

| Function | Description |
|----------|-------------|
| `isSigned(response)` | `true` if `status === "signed"` |
| `isRejected(response)` | `true` if `status === "policy_rejected"` or `"failed"` |
| `assertSigned(response)` | Type assertion; throws if not signed or no signature present |

---

## Error Handling

All non-2xx API responses throw `MandaraApiError`:

```ts
try {
  await client.requestSignature({ ... });
} catch (err) {
  if (err instanceof MandaraApiError) {
    console.log(err.status);   // HTTP status
    console.log(err.code);     // e.g. "POLICY_REJECTED"
    console.log(err.message);  // Human-readable reason
    console.log(err.details);  // Additional context
  }
}
```

Network errors throw `MandaraApiError` with code `NETWORK_ERROR`.

Timeout errors throw `MandaraApiError` with code `REQUEST_TIMEOUT`.

---

## Status Lifecycle

```
requested → queued → worker_processing → guard_approved → ika_pending → signed
                                    └→ policy_rejected
                                    └→ failed
```

- `requested` — created but not queued.
- `queued` — BullMQ job created.
- `worker_processing` — worker picked up the job.
- `guard_approved` — on-chain Guard CPI succeeded.
- `ika_pending` — waiting for Ika signature.
- `signed` — signature received and stored.
- `policy_rejected` — rejected by policy evaluation.
- `failed` — worker encountered an error.

---

## Environment Requirements

- **Node.js 18+** (global `fetch` required; or provide custom `fetch`)
- Mandara API running (`npm run product:api:dev`)
- Worker running if using `enqueue: true` and `waitForSignature`

---

## Security

- **Never expose API keys in frontend code.** The SDK is designed for server-side agents and workers.
- **Rotate keys regularly.** Create new keys and revoke old ones via the dashboard.
- **Scope is automatic.** Each key is tied to exactly one agent and its organization's policies.
- **Devnet only.** Ika pre-alpha uses a mock signer, not production MPC custody.

---

## Examples

See [`examples/mandara-sdk/`](../examples/mandara-sdk/):
- `basic-request.ts` — status, preview, create, poll
- `preview-only.ts` — dry-run allowed and rejected
- `wait-for-signature.ts` — enqueue and poll until signed

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
