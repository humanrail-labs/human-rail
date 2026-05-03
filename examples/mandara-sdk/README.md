# Mandara SDK Examples

## Prerequisites

1. Mandara API running (`npm run product:api:dev`)
2. An agent API key (create via dashboard or `npm run product:create-dev-agent-key`)
3. Set environment variables:

```bash
export MANDARA_AGENT_API_KEY="mandara_dev_..."
export MANDARA_API_URL="http://localhost:4000"  # optional, defaults to localhost
```

## Examples

### Basic request

```bash
npx tsx basic-request.ts
```

Checks agent status, previews a request, creates a signing request, and polls its status.

### Preview only

```bash
npx tsx preview-only.ts
```

Dry-run policy evaluation for allowed and rejected requests without creating records.

### Wait for signature

```bash
npx tsx wait-for-signature.ts
```

Creates a signing request with `enqueue: true`, then polls until it reaches `signed` status.
Requires the worker to be running.

---

*See [`docs/MANDARA_SDK.md`](../../docs/MANDARA_SDK.md) for full SDK documentation.*
