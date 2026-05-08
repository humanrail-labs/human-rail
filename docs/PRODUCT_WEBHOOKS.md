# Mandara Webhooks

> Real-time callbacks for signing request lifecycle events.  
> **Phase:** P8 — Webhooks and Audit Exports  
> **Last updated:** 2026-05-02

---

## Overview

Mandara can deliver HTTP POST callbacks to your endpoints when signing requests change status. Webhooks are scoped to an organization, filtered by event type, and signed with HMAC-SHA256 for verification.

---

## Event Types

| Event | Description | Trigger |
|-------|-------------|---------|
| `signature.requested` | Signing request created | `POST /v1/signature-requests` or dashboard create |
| `signature.queued` | Signing request added to worker queue | `POST .../enqueue` or `enqueue: true` |
| `signature.policy_rejected` | Request rejected by policy evaluation | Preview/create rejection |
| `signature.guard_approved` | On-chain Guard CPI succeeded | Worker live execution |
| `signature.ika_pending` | Ika MessageApproval created, awaiting signature | Worker live execution |
| `signature.signed` | Signature received and stored | Worker live execution |
| `signature.failed` | Worker encountered an error | Worker execution failure |

---

## Creating a Webhook

```http
POST /api/webhooks
Content-Type: application/json
x-mandara-dev-user: dev@local

{
  "organizationId": "cl...",
  "url": "https://example.com/webhooks/mandara",
  "events": ["signature.requested", "signature.signed"],
  "secret": "optional-custom-secret"
}
```

Response (secret shown **once**):
```json
{
  "data": {
    "id": "cl...",
    "url": "https://example.com/webhooks/mandara",
    "events": ["signature.requested", "signature.signed"],
    "status": "active",
    "secret": "whsec_...",
    "createdAt": "2026-05-02T22:00:00.000Z"
  }
}
```

If no `secret` is provided, one is generated automatically.

---

## Delivery Format

Each webhook delivery is an HTTP POST with the following headers:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Mandara-Event` | Event type, e.g. `signature.signed` |
| `X-Mandara-Delivery` | Delivery ID |
| `X-Mandara-Timestamp` | Unix timestamp in seconds |
| `X-Mandara-Signature` | `sha256=<hmac>` |
| `User-Agent` | `Mandara-Webhook/1.0` |

Body:
```json
{
  "id": "evt_...",
  "type": "signature.signed",
  "createdAt": "2026-05-02T22:00:05.000Z",
  "organizationId": "cl...",
  "data": {
    "signingRequestId": "cl...",
    "status": "signed",
    "signatureHex": "0x..."
  }
}
```

---

## Signature Verification

The signature is computed over the string `<timestamp>.<raw-json-body>` using HMAC-SHA256:

```ts
import { verifyWebhookSignature } from "@mandara/core";

const isValid = verifyWebhookSignature(
  secret,
  Number(timestampHeader),
  rawBody,
  signatureHeader.replace("sha256=", "")
);
```

---

## Retry Behavior

- Timeout: 10 seconds per delivery attempt
- Retries: up to 3 attempts with exponential backoff (5s base)
- Status tracking: `pending` → `retrying` → `delivered` or `failed`
- Response body preview: first 1KB stored for debugging

---

## Security Notes

| Topic | Detail |
|-------|--------|
| Secret storage | AES-256-GCM encrypted with `MANDARA_ENCRYPTION_PASSWORD`. |
| Secret display | Shown exactly once on creation/rotation. Copy immediately. |
| HTTPS | Always use HTTPS URLs in production. |
| Signature verification | Always verify `X-Mandara-Signature` before trusting payload. |
| Idempotency | Use `X-Mandara-Delivery` header to deduplicate. |

---

## Files

| File | Purpose |
|------|---------|
| `apps/api/src/routes/webhooks.ts` | Dashboard webhook CRUD routes |
| `apps/api/src/services/webhookEvents.ts` | Schedule webhook deliveries |
| `apps/api/src/services/webhookQueue.ts` | BullMQ queue producer |
| `apps/worker/src/services/webhookEvents.ts` | Worker-side scheduler |
| `apps/worker/src/services/webhookDelivery.ts` | Delivery processor |
| `apps/worker/src/queues.ts` | Webhook queue + worker registration |
| `packages/core/src/webhooks/signing.ts` | HMAC-SHA256 signing utilities |
| `scripts/product-webhook-smoke.mjs` | Smoke test |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
## Webhook Secret Encryption

Webhook secrets are encrypted at rest with `MANDARA_ENCRYPTION_PASSWORD`.

Development may use the value from `.env.product.example`:

```bash
MANDARA_ENCRYPTION_PASSWORD="change-me-dev-only-32-byte-minimum"
```

Staging and production must set a unique secret at least 16 characters long. If encryption is not configured, webhook creation returns a clear configuration error instead of storing plaintext or crashing unexpectedly.

Legacy local databases may have webhook rows created before `iv` and `tag` existed. Those columns are nullable so local migration can run without dropping data, but new webhook creation always writes encrypted ciphertext plus `iv` and `tag`. Run the local backfill after `product:db:push`:

```bash
npm run product:webhooks:backfill
```

Rows that cannot be backfilled are paused and marked as needing secret rotation. Dashboard/API users can rotate a secret with:

```http
POST /api/webhooks/:id/rotate-secret
```

The raw rotated secret is returned once. Production must never deliver using plaintext legacy secrets.

Mandara is devnet beta only. Ika is pre-alpha with a mock signer. This is not production custody.
