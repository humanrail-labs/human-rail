# Mandara Product API Design

> **Status:** P3 complete. Create/preview APIs implemented. On-chain execution deferred to P4.  
> **Validation:** Zod  
> **Auth:** Cookie/session for dashboard API; API key (Bearer) for agent API.  
> **Last updated:** 2026-05-02

---

## Overview

The Mandara API is split into two surfaces:

1. **Internal Dashboard API** — Used by the Next.js dashboard. Session-based auth.
2. **Agent API** — Used by external AI agent processes. API key auth (Bearer token).

Both are served from the same Fastify backend. The Agent API is namespaced under `/v1/` and rate-limited independently.

---

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:4000` |
| Devnet beta | `https://api.devnet.mandara.humanrail.io` |
| Future production | `https://api.mandara.humanrail.io` |

---

## Authentication

### Dashboard API (P3)

- Dev auth via `x-mandara-dev-user` header in development.
- Defaults to `dev@local` if header omitted.
- Production will use cookie-based session (Clerk/Supabase Auth).

### Agent API

```
Authorization: Bearer <api-key>
```

- API keys are `mandara_` prefixed, 48+ characters.
- Server extracts prefix, looks up hash, compares with Argon2id/bcrypt.
- Resolved `req.agent` and `req.org` are attached for downstream handlers.

### Error Format

All errors follow this JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "per_tx_limit must be greater than 0",
    "details": { "field": "perTxLimit", "received": -1 }
  }
}
```

Common codes:

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid credentials |
| `FORBIDDEN` | 403 | Valid credentials but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Zod schema violation |
| `RATE_LIMITED` | 429 | Too many requests |
| `POLICY_REJECTED` | 422 | Policy rejected the request (preview or create without persist) |
| `IKA_ERROR` | 502 | Ika network or gRPC failure |

---

## Internal Dashboard API

All routes prefixed with `/api` and require session auth.

---

### Organizations

#### `GET /api/orgs`

List organizations the current user belongs to.

**Response:**
```json
{
  "data": [
    {
      "id": "org_abc123",
      "slug": "acme-corp",
      "name": "Acme Corp",
      "tier": "pro",
      "role": "owner",
      "createdAt": "2026-05-01T12:00:00Z"
    }
  ]
}
```

#### `POST /api/orgs`

Create a new organization.

**Body (Zod):**
```ts
z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(50),
})
```

**Response:** 201 + organization object.

---

### Agents

#### `GET /api/agents`

List agents for the current organization.

**Query:**
```
?orgId=org_abc123&status=active&limit=20&cursor=<cursor>
```

**Response:**
```json
{
  "data": [
    {
      "id": "agent_xyz",
      "name": "Trading Bot Alpha",
      "status": "active",
      "onChainAgentPda": "7MU4iHWD7cwHeQ28bdufZE47W4N6pAbSyLr63aX5awQ3",
      "createdAt": "2026-05-01T12:00:00Z"
    }
  ],
  "nextCursor": "..."
}
```

#### `POST /api/agents`

Register a new agent.

**Body (Zod):**
```ts
z.object({
  organizationId: z.string().cuid2().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})
```

**Response:** 201 + agent object (including `id` for API key creation).

---

### Wallets

#### `GET /api/wallets`

List Ika dWallets for the organization.

**Response:**
```json
{
  "data": [
    {
      "id": "wallet_123",
      "name": "Base Sepolia Wallet",
      "onChainPda": "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
      "curve": "Secp256k1",
      "state": "active",
      "authority": "FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd",
      "createdAt": "2026-05-01T12:00:00Z"
    }
  ]
}
```

#### `POST /api/wallets/import`

Import an existing Ika dWallet PDA into the product database.

**Body (Zod):**
```ts
z.object({
  organizationId: z.string().cuid2().optional(),
  name: z.string().min(1).max(100).optional(),
  dwalletPda: z.string().min(32).max(44),
  signingPublicKey: z.string().optional(),
  curve: z.enum(["Secp256k1", "Secp256r1", "Curve25519", "Ristretto"]),
  authority: z.string().optional(),
  state: z.enum(["DKGInProgress", "Active", "Frozen"]).default("Active"),
  ikaProgramId: z.string().optional(),
  guardCpiAuthority: z.string().optional(),
  authorityTransferSignature: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})
```

**Behavior:**
- Reuses an existing `dwalletPda` only inside the same organization.
- Rejects cross-organization reuse with `WALLET_ALREADY_IMPORTED_BY_ANOTHER_ORG`.
- No on-chain verification yet (P4).
- Stores provided values and marks `metadata.source = imported`.
- Default `ikaProgramId` and `guardCpiAuthority` use known devnet values if not provided.

**Response:** 201 + wallet object.

---

### Policies

#### `GET /api/policies`

List GuardedDwallet policies.

**Response:**
```json
{
  "data": [
    {
      "id": "policy_456",
      "agentId": "agent_xyz",
      "walletId": "wallet_123",
      "onChainPda": "C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup",
      "allowedChainId": 84532,
      "perTxLimit": "100000000",
      "dailyLimit": "500000000",
      "totalLimit": "0",
      "frozen": false,
      "expiresAt": "2027-05-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/policies`

Create a new GuardedDwallet policy.

**Body (Zod):**
```ts
z.object({
  organizationId: z.string().cuid2().optional(),
  agentId: z.string().cuid2(),
  ikaDwalletId: z.string().cuid2(),
  name: z.string().min(1).max(100).optional(),
  chainId: z.number().int().positive(),
  asset: z.string().min(1).max(32),
  recipient: z.string().min(1).max(128),
  perTxLimit: z.string().regex(/^\d+$/),
  dailyLimit: z.string().regex(/^\d+$/),
  totalLimit: z.string().regex(/^\d+$/).optional(),
  expiresAt: z.string().datetime().optional(),
})
```

**Validation rules:**
- `perTxLimit > 0`
- `dailyLimit > 0`
- `perTxLimit <= dailyLimit`
- If `totalLimit` provided and `> 0`: `dailyLimit <= totalLimit`

**Side effects:**
- Computes `allowedAssetHash` and `allowedRecipientHash` via keccak256.
- `guardedDwalletPda` remains `null` until on-chain policy is created (P4).
- Records audit event `guarded_policy_created`.

**Response:** 201 + policy object.

---

### Signing Requests

#### `GET /api/signing-requests`

List signing requests for the organization.

**Query:**
```
?orgId=org_abc123&agentId=agent_xyz&status=signed&limit=50&cursor=<cursor>
```

**Response:** Paginated list of signing request objects.

#### `GET /api/signing-requests/:id`

Get a single signing request with relations.

**Response:**
```json
{
  "data": {
    "id": "req_789",
    "requestId": "f655534b...",
    "status": "signed",
    "messageDigest": "0x5c125f25...",
    "signatureHex": "0xca5c2643...",
    "signedAt": "2026-05-02T12:00:05Z",
    "onChainMessageApprovalPda": "Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM"
  }
}
```

#### `POST /api/signing-requests/:id/enqueue`

Enqueue a signing request for worker execution.

**Behavior:**
- Resolves dev user and verifies access to the signing request's organization.
- Only allows enqueue for statuses: `requested`, `failed`.
- Adds a job to the `mandara.signing-requests` BullMQ queue.
- Updates signing request status to `queued` and stores `executionJobId`.
- Records audit event `signing_request_queued`.

**Response:**
```json
{
  "data": {
    "signingRequest": {
      "id": "req_789",
      "status": "queued",
      "executionJobId": "job_123"
    },
    "job": {
      "id": "job_123",
      "queue": "mandara.signing-requests",
      "status": "queued"
    }
  }
}
```

#### `GET /api/signing-requests/:id/execution`

Get execution status and audit trail for a signing request.

**Response:**
```json
{
  "data": {
    "signingRequest": {
      "id": "req_789",
      "status": "requested",
      "executionJobId": "job_123",
      "requestId": "f655534b...",
      "amount": "42000000",
      "destinationChainId": 84532,
      "message": "Transfer 42 USDC to treasury"
    },
    "auditEvents": [
      {
        "eventType": "signing_request_queued",
        "actorType": "user",
        "summary": "Enqueued signing request ...",
        "createdAt": "2026-05-02T12:00:00Z"
      },
      {
        "eventType": "signing_request_processing",
        "actorType": "worker",
        "summary": "Worker started processing signing request ...",
        "createdAt": "2026-05-02T12:00:01Z"
      },
      {
        "eventType": "signing_request_dry_run_completed",
        "actorType": "worker",
        "summary": "Dry-run completed for signing request ...",
        "createdAt": "2026-05-02T12:00:02Z"
      }
    ]
  }
}
```

#### `POST /api/signing-requests/preview`

Preview whether a signing request would pass policy without creating a record.

**Body (Zod):**
```ts
z.object({
  organizationId: z.string().cuid2().optional(),
  agentId: z.string().cuid2(),
  policyId: z.string().cuid2(),
  destinationChainId: z.number().int().positive(),
  asset: z.string().min(1).max(32),
  recipient: z.string().min(1).max(128),
  amount: z.string().regex(/^\d+$/),
  message: z.string().min(1).max(4096),
})
```

**Response (allowed):**
```json
{
  "data": {
    "allowed": true,
    "reason": "Request passes all policy checks. Awaiting worker execution in P4.",
    "computed": {
      "assetHash": "d077eb814e4c6cbcfd7be7a842579801e25a2e7966242efb0497d724b4707593",
      "recipientHash": "efda2c2822100aaf94fb77c3765831ce37fc3c02cbc11603dd6ffa9c0d25ec55",
      "messageDigest": "5c125f25f32ea5fa95ade18eabba8299fb1497f53fcac4799e4b5eefa7fdf46b"
    },
    "limits": {
      "perTxLimit": "100000000",
      "dailyLimit": "500000000",
      "totalLimit": "1000000000",
      "requestedAmount": "42000000"
    }
  }
}
```

**Response (rejected):**
```json
{
  "data": {
    "allowed": false,
    "reason": "Amount 99900000000 exceeds per-tx limit 100000000",
    "rejectionCode": "PER_TX_LIMIT_EXCEEDED",
    "computed": { ... },
    "limits": { ... }
  }
}
```

#### `POST /api/signing-requests`

Create a signing request record.

**Body (Zod):**
Same as preview plus optional:
```ts
z.object({
  persistIfRejected: z.boolean().optional(),
})
```

**Behavior:**
1. Validates body.
2. Resolves organization context.
3. Fetches policy with agent and wallet.
4. Runs `evaluateSigningRequest`.
5. If **allowed**:
   - Creates `SigningRequest` with `status: requested`.
   - Records audit event `signing_request_created`.
   - Returns 201 + `{ signingRequest, evaluation, nextStep }`.
6. If **rejected** and `persistIfRejected = true`:
   - Creates `SigningRequest` with `status: policy_rejected`.
   - Records audit event `signing_request_policy_rejected`.
   - Returns 201 + `{ signingRequest, evaluation }`.
7. If **rejected** and `persistIfRejected` is false/missing:
   - Does not create record.
   - Records preview audit event.
   - Returns 422 + structured evaluation.

**No on-chain execution in P3.** Actual Ika/Solana transactions are deferred to P4 workers.

**Response (allowed):**
```json
{
  "data": {
    "signingRequest": {
      "id": "req_789",
      "requestId": "a1b2c3...",
      "status": "requested",
      "destinationChainId": 84532,
      "amount": "42000000",
      "createdAt": "2026-05-02T12:00:00Z"
    },
    "evaluation": { ... },
    "nextStep": "Awaiting worker execution in P4"
  }
}
```

---

## Agent API

All routes prefixed with `/v1` and require Bearer API key auth.

> **Implementation details:** See [`PRODUCT_AGENT_API.md`](PRODUCT_AGENT_API.md) for the complete P6 implementation including route shapes, auth flow, and security notes.

---

### `POST /v1/signature-requests`

An agent requests a cross-chain signature.

**Headers:**
```
Authorization: Bearer mandara_xxxxxxxx...
Content-Type: application/json
```

**Body (Zod):**
```ts
z.object({
  policyId: z.string(), // Mandara policy ID (not on-chain PDA)
  messageDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  messageMetadataDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional().default("0x" + "0".repeat(64)),
  destinationChainId: z.number().int().positive(),
  asset: z.string().max(32),
  recipient: z.string().max(128),
  amount: z.string().regex(/^\d+$/), // BigInt string
  signatureScheme: z.enum(["EcdsaKeccak256", "EcdsaDoubleSha256", "EddsaSha512"]).default("EcdsaKeccak256"),
})
```

**Flow:**
1. Resolve API key → `agentId` + `orgId`.
2. Load policy. Verify policy belongs to agent and org.
3. Check policy is not frozen or expired (DB cache + on-chain fallback).
4. Validate `destinationChainId`, `asset`, `recipient`, `amount` against policy.
5. Create `SigningRequest` record in DB with `status: pending`.
6. Queue a BullMQ job (`signing-requests`).
7. Return 202 Accepted.

**Response:**
```json
{
  "data": {
    "id": "req_789",
    "requestId": "f655534b...",
    "status": "pending",
    "policyId": "policy_456",
    "amount": "42000000",
    "createdAt": "2026-05-02T12:00:00Z"
  }
}
```

---

### `GET /v1/signature-requests/:id`

Poll the status of a signature request.

**Response:**
```json
{
  "data": {
    "id": "req_789",
    "requestId": "f655534b...",
    "status": "signed",
    "messageDigest": "0x5c125f25...",
    "signatureHex": "0xca5c2643...",
    "signedAt": "2026-05-02T12:00:05Z",
    "onChainMessageApprovalPda": "Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM"
  }
}
```

---

### `GET /v1/agent/status`

Check agent status, policies, and spend counters.

**Response:**
```json
{
  "data": {
    "agentId": "agent_xyz",
    "status": "active",
    "policies": [
      {
        "policyId": "policy_456",
        "allowedChainId": 84532,
        "perTxLimit": "100000000",
        "dailyLimit": "500000000",
        "dailySpent": "100000000",
        "totalSpent": "250000000",
        "frozen": false,
        "expiresAt": "2027-05-01T00:00:00Z"
      }
    ],
    "apiKeyLastUsedAt": "2026-05-02T11:55:00Z"
  }
}
```

---

## Webhook Events

When a webhook is configured, Mandara delivers JSON payloads via HTTP POST to the registered URL.

> **Implementation details:** See [`PRODUCT_WEBHOOKS.md`](PRODUCT_WEBHOOKS.md) for the complete P8 implementation including event types, signature verification, and retry behavior.

### Delivery Format

```json
{
  "event": "signature.signed",
  "timestamp": "2026-05-02T12:00:05Z",
  "data": { /* event-specific payload */ }
}
```

### Signature Header

```
X-Mandara-Signature: t=1234567890,v1=<hex_hmac_sha256>
```

Verification:
```ts
const payload = `${timestamp}.${JSON.stringify(body)}`;
const expected = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex');
```

### Event Types

#### `signature.requested`

A signing request was created.

```json
{
  "event": "signature.requested",
  "data": {
    "requestId": "req_789",
    "agentId": "agent_xyz",
    "policyId": "policy_456",
    "amount": "42000000",
    "destinationChainId": 84532
  }
}
```

#### `signature.approved`

The HumanRail Guard approved the request and the Ika MessageApproval was created.

```json
{
  "event": "signature.approved",
  "data": {
    "requestId": "req_789",
    "messageApprovalPda": "Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM",
    "guardRequestPda": "CmqCpm4zPRZudGhuKkdrXoF6KPKB8vWjzeAysneDSHk5"
  }
}
```

#### `signature.signed`

Ika committed the signature on-chain.

```json
{
  "event": "signature.signed",
  "data": {
    "requestId": "req_789",
    "signatureHex": "0xca5c2643...",
    "messageApprovalPda": "Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM"
  }
}
```

#### `signature.rejected`

The HumanRail Guard rejected the request.

```json
{
  "event": "signature.rejected",
  "data": {
    "requestId": "req_789",
    "rejectionCode": 7,
    "rejectionReason": "PerTxLimitExceeded"
  }
}
```

#### `agent.frozen`

An agent's policy was frozen.

```json
{
  "event": "agent.frozen",
  "data": {
    "agentId": "agent_xyz",
    "policyId": "policy_456",
    "frozenAt": "2026-05-02T12:00:00Z"
  }
}
```

#### `policy.expired`

A policy passed its expiry date.

```json
{
  "event": "policy.expired",
  "data": {
    "policyId": "policy_456",
    "expiredAt": "2027-05-01T00:00:00Z"
  }
}
```

---

## Rate Limits

| Surface | Limit | Window |
|---------|-------|--------|
| Dashboard API | 100 req/min | Per user session |
| Agent API | 60 req/min | Per API key |
| Agent API (signing) | 10 req/min | Per API key |
| Webhook deliveries | 5 retries | Exponential backoff (1s, 2s, 4s, 8s, 16s) |

---

*Next: [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
## Current Product Contract Notes

Mandara product clients should use the API-backed console and SDK without requiring a browser wallet. Browser wallets are only part of the Advanced HumanRail Protocol proof routes.

Frontend calls use `NEXT_PUBLIC_MANDARA_API_URL` and default to `http://localhost:4000` in development. The API should be started before opening the console:

```bash
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts
npm run product:api:dev
```

Agent SDK clients use:

```ts
new MandaraClient({ baseUrl, apiKey });
```

The request field is `destinationChainId`, not `chainId`.

Webhook secrets are encrypted at rest with `MANDARA_ENCRYPTION_PASSWORD`. Development may use the example value; staging/production must set a unique secret. MandaraError codes are part of the product contract and should be preserved in API responses.

Mandara is devnet beta only. Ika is pre-alpha with a mock signer. This is not production custody.
