# Mandara Agent API

> External API for AI agents to request policy-governed signing via HTTP.  
> **Phase:** P6 — Agent API Keys  
> **Last updated:** 2026-05-02

---

## Overview

The Mandara Agent API (`/v1`) allows external AI agents to authenticate with API keys and request signatures without using the dashboard. All requests are policy-governed: the API evaluates chain, asset, recipient, amount, and limit rules before creating a signing request.

**Key principles:**
- API keys are scoped to a single agent.
- Only hashed key material is stored; the raw key is shown once on creation.
- All on-chain actions flow through the worker queue; `/v1` never calls Solana/Ika directly.
- Policy evaluation is mandatory; rejected requests are not persisted by default.

---

## Authentication

Include the API key in the `Authorization` header:

```http
Authorization: Bearer mandara_dev_<prefix>_<secret>
```

Example:
```http
Authorization: Bearer mandara_dev_agnt_xyz123_abcdef...
```

The API key is linked to an **agent**. All signing requests created with the key are associated with that agent and its organization.

### Key states
- **Active** — valid for use.
- **Expired** — `expiresAt` has passed; returns `401`.
- **Revoked** — explicitly revoked via dashboard; returns `401`.

---

## Creating API Keys

API keys are created through the dashboard or the dashboard API:

```http
POST /api/agents/:id/api-keys
Content-Type: application/json
x-mandara-dev-user: dev@local

{ "name": "production-agent" }
```

Response (raw key shown **once**):
```json
{
  "data": {
    "id": "cl...",
    "name": "production-agent",
    "prefix": "mandara_dev_agnt_xyz123",
    "keyPreview": "mandara_dev_agnt_xyz123…wX9y",
    "rawKey": "mandara_dev_agnt_xyz123_abcdef...",
    "createdAt": "2026-05-02T22:00:00.000Z"
  }
}
```

---

## Endpoints

### GET /v1/agent/status

Returns the agent's status, active policy count, and signing request summary.

**Auth:** Bearer agent API key  
**Response:**
```json
{
  "data": {
    "agent": { "id": "cl...", "name": "My Agent", "status": "active" },
    "organization": { "id": "cl..." },
    "activePolicies": 2,
    "signingRequests": { "total": 15, "signed": 12 }
  }
}
```

---

### POST /v1/signature-requests/preview

Dry-run policy evaluation without creating a database record.

**Auth:** Bearer agent API key  
**Body:**
```json
{
  "destinationChainId": 84532,
  "asset": "USDC:BASE_SEPOLIA",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "42000000",
  "message": "Pay supplier invoice #1234",
  "policyId": "cl..."
}
```

**Behavior:**
- If `policyId` is omitted and the agent has exactly one active policy, that policy is used.
- If multiple active policies exist and no `policyId` is provided, returns `400 POLICY_AMBIGUOUS`.

**Response (allowed):**
```json
{
  "data": {
    "policyDecision": {
      "allowed": true,
      "reason": "Request passes all policy checks...",
      "computed": { "assetHash": "...", "recipientHash": "...", "messageDigest": "..." },
      "limits": { "perTxLimit": "100000000", "dailyLimit": "500000000", "totalLimit": "1000000000", "requestedAmount": "42000000" }
    },
    "messageDigest": "..."
  }
}
```

**Response (rejected):**
```json
{
  "data": {
    "policyDecision": {
      "allowed": false,
      "reason": "Amount 42000000000 exceeds per-tx limit 100000000",
      "rejectionCode": "PER_TX_LIMIT_EXCEEDED",
      "computed": { ... },
      "limits": { ... }
    },
    "messageDigest": "..."
  }
}
```

---

### POST /v1/signature-requests

Create a signing request. Policy is evaluated first.

**Auth:** Bearer agent API key  
**Body:**
```json
{
  "destinationChainId": 84532,
  "asset": "USDC:BASE_SEPOLIA",
  "recipient": "0x1111111111111111111111111111111111111111",
  "amount": "42000000",
  "message": "Pay supplier invoice #1234",
  "policyId": "cl...",
  "enqueue": true,
  "idempotencyKey": "invoice-1234-2026-05"
}
```

**Behavior:**
- If policy rejects the request, returns `422 POLICY_REJECTED` and **does not persist** the request.
- If `enqueue: true`, the request is immediately added to the BullMQ queue and status becomes `queued`.
- If `enqueue: false` (default), status is `requested` and must be enqueued separately.

**Response (201, allowed + enqueued):**
```json
{
  "data": {
    "id": "cl...",
    "status": "queued",
    "policyDecision": { "allowed": true, ... },
    "execution": {
      "jobId": "job-123",
      "queue": "mandara.signing-requests",
      "status": "queued"
    },
    "messageDigest": "...",
    "signingRequest": { "id": "cl...", "requestId": "...", "status": "queued" }
  }
}
```

**Response (422, rejected):**
```json
{
  "error": {
    "code": "POLICY_REJECTED",
    "message": "Amount 42000000000 exceeds per-tx limit 100000000",
    "details": { "policyDecision": { ... } }
  }
}
```

---

### GET /v1/signature-requests/:id

Get the status and details of a signing request.

**Auth:** Bearer agent API key  
**Response:**
```json
{
  "data": {
    "id": "cl...",
    "requestId": "...",
    "status": "signed",
    "destinationChainId": 84532,
    "asset": "USDC:BASE_SEPOLIA",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "42000000",
    "message": "Pay supplier invoice #1234",
    "messageDigest": "...",
    "executionJobId": "job-123",
    "signature": "0x...",
    "messageApproval": {
      "status": "signed",
      "signatureHex": "0x..."
    },
    "nextStep": "completed"
  }
}
```

Only requests belonging to the authenticated agent are accessible.

---

## Enqueue Behavior

- `enqueue: true` creates a BullMQ job immediately.
- The worker processes jobs in `dry-run` mode by default.
- Live on-chain signing requires the worker to be configured with:
  - `MANDARA_WORKER_MODE=live-devnet`
  - `MANDARA_ENABLE_LIVE_EXECUTION=true`
  - `MANDARA_SERVICE_WALLET_PATH=<path>`

---

## Policy Rejection Response

When a request is rejected by policy evaluation:
- HTTP status: `422`
- Error code: `POLICY_REJECTED`
- The request is **not** persisted in the database.
- The response includes the full `policyDecision` with `rejectionCode`, `reason`, and `computed` hashes.

---

## Security Notes

| Topic | Detail |
|-------|--------|
| Raw key storage | Never stored server-side. Only SHA-256 hash + prefix are persisted. |
| Key display | Raw key is shown **exactly once** on creation. Copy it immediately. |
| Revocation | Keys can be revoked via dashboard. Revoked keys return `401`. |
| Scope | Keys are scoped to a single agent and its organization's policies. |
| Rate limiting | Placeholder structure exists (`apps/api/src/lib/rateLimit.ts`). Disabled by default in P6. |
| Network | Devnet only. Ika pre-alpha uses a mock signer, not production MPC. |

---

## Files

| File | Purpose |
|------|---------|
| `apps/api/src/lib/apiKeys.ts` | Key generation, hashing, verification |
| `apps/api/src/plugins/agentAuth.ts` | Bearer token auth plugin |
| `apps/api/src/routes/v1/signatureRequests.ts` | External `/v1` endpoints |
| `apps/api/src/routes/agents.ts` | Dashboard API key management routes |
| `apps/api/src/lib/rateLimit.ts` | Rate-limit placeholder |
| `packages/core/src/schemas/apiKey.ts` | Zod schemas for API keys and external requests |
| `scripts/product-agent-api-smoke.mjs` | Smoke test |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
