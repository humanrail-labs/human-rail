# Mandara Product API Design

> **Status:** P0 draft. API contracts for the Mandara hosted product.  
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
| Local | `http://localhost:3001` |
| Devnet beta | `https://api.devnet.mandara.humanrail.io` |
| Future production | `https://api.mandara.humanrail.io` |

---

## Authentication

### Dashboard API

- Cookie-based session (HTTPOnly, Secure, SameSite=strict).
- Set by Clerk/Supabase Auth callback.
- Middleware resolves `req.user` from session.

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
| `POLICY_REJECTED` | 422 | On-chain Guard rejected the request |
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
  orgId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  // Optional: link to an existing on-chain agent PDA
  onChainAgentPda: z.string().optional(),
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

#### `POST /api/wallets/ika`

Create or connect an Ika dWallet.

**Body (Zod):**
```ts
z.object({
  orgId: z.string(),
  name: z.string().optional(),
  // If provided, link an existing on-chain dWallet
  onChainPda: z.string().optional(),
  // If omitted, a DKG job is queued
})
```

**Response:** 202 Accepted + job ID (if DKG queued) or 201 + wallet object (if linked).

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
  orgId: z.string(),
  agentId: z.string(),
  walletId: z.string(),
  name: z.string().optional(),
  allowedChainId: z.number().int().positive(),
  allowedAsset: z.string(), // e.g., "USDC"
  allowedRecipient: z.string(), // e.g., "0x1111..."
  perTxLimit: z.string().regex(/^\d+$/), // BigInt as string
  dailyLimit: z.string().regex(/^\d+$/),
  totalLimit: z.string().regex(/^\d+$/).optional().default("0"),
  expiresAt: z.string().datetime(),
})
```

**Side effects:**
- Computes `allowedAssetHash` and `allowedRecipientHash` via keccak256.
- Builds and submits `initialize_guarded_dwallet` or `initialize_guarded_dwallet_demo` transaction.
- Stores resulting PDA in DB.

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

#### `POST /api/signing-requests`

Dashboard-initiated signing request (principal signs directly).

**Body (Zod):**
```ts
z.object({
  orgId: z.string(),
  policyId: z.string(),
  messageDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  messageMetadataDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional().default("0x" + "0".repeat(64)),
  destinationChainId: z.number().int().positive(),
  asset: z.string(),
  recipient: z.string(),
  amount: z.string().regex(/^\d+$/),
  signatureScheme: z.enum(["EcdsaKeccak256", "EcdsaDoubleSha256", "EddsaSha512"]),
})
```

**Response:** 202 Accepted + signing request object with `status: pending`.

---

## Agent API

All routes prefixed with `/v1` and require Bearer API key auth.

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
