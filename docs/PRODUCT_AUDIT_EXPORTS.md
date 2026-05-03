# Mandara Audit Exports

> Download audit events for compliance and analysis.  
> **Phase:** P8 — Webhooks and Audit Exports  
> **Last updated:** 2026-05-02

---

## Overview

Mandara records every significant action as an audit event. You can export these events as JSON or CSV for compliance review, debugging, or external analysis.

---

## Export Endpoint

```http
GET /api/audit-events/export?format=json&limit=1000
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `organizationId` | string | resolved from dev user | Filter by organization |
| `eventType` | string | — | Filter by event type |
| `resourceType` | string | — | Filter by resource type |
| `from` | ISO datetime | — | Start date (inclusive) |
| `to` | ISO datetime | — | End date (inclusive) |
| `format` | `json` or `csv` | `json` | Export format |
| `limit` | number | `1000` | Max records (1–10000) |

### JSON Response

```json
{
  "data": {
    "events": [
      {
        "id": "cl...",
        "createdAt": "2026-05-02T22:00:00.000Z",
        "organizationId": "cl...",
        "actorType": "user",
        "actorId": "dev_...",
        "eventType": "signing_request_created",
        "resourceType": "signing_request",
        "resourceId": "cl...",
        "summary": "Created signing request ...",
        "metadata": { "requestId": "...", "allowed": true }
      }
    ],
    "meta": {
      "count": 150,
      "format": "json"
    }
  }
}
```

### CSV Response

Content-Type: `text/csv`

Columns:
```
id,createdAt,organizationId,actorType,actorId,eventType,resourceType,resourceId,summary,metadata
```

---

## Audit Event Types

| Category | Events |
|----------|--------|
| Organization | `organization_created`, `organization_updated` |
| Agent | `agent_created`, `agent_updated`, `agent_frozen`, `agent_revoked` |
| Policy | `policy_created`, `policy_updated`, `policy_frozen`, `policy_expired` |
| Signing Request | `signing_request_created`, `signing_request_queued`, `signing_request_processing`, `signing_request_policy_rejected`, `signing_request_dry_run_completed`, `signing_request_execution_failed`, `signing_request_worker_skipped` |
| On-chain | `guard_message_approved`, `ika_message_approval_created`, `ika_signature_committed` |
| API Key | `api_key_created`, `api_key_revoked`, `agent_api_key_used` |
| Webhook | `webhook_created`, `webhook_updated`, `webhook_deleted`, `webhook_delivery_scheduled`, `webhook_delivery_succeeded`, `webhook_delivery_failed` |
| Export | `audit_export_created` |

---

## Files

| File | Purpose |
|------|---------|
| `apps/api/src/routes/auditEvents.ts` | Export endpoint |
| `docs/PRODUCT_AUDIT_EXPORTS.md` | This document |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
