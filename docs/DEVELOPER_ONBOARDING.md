# Mandara Developer Onboarding Guide

> **Branch:** `product/mandara-cloud-mvp`  
> **Phase:** P10 — Devnet beta  
> **Goal:** Get a developer from zero to their first policy-governed signature in 10 minutes.  
> **Last updated:** 2026-05-04

---

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Git
- `curl` and `jq` (optional, for quick API testing)

---

## 1. Start the Local Stack

```bash
# Clone and checkout
git clone <repo>
cd human-rail
git checkout product/mandara-cloud-mvp

# Environment
cp .env.product.example .env.product

# Start Postgres and Redis
npm run product:docker:up

# Install dependencies
npm install

# Generate Prisma client
npm run product:db:generate

# Push schema to database
npm run product:db:push
```

---

## 2. Import Devnet Artifacts

This imports the verified HumanRail / Ika devnet lifecycle into your local database.

```bash
npm run product:import-devnet-artifacts
```

Verify it worked:
```bash
curl -s http://localhost:4000/api/product/devnet-demo | jq .
```

---

## 3. Start API and Worker

Terminal 1 — API:
```bash
npm run product:api:dev
```

Terminal 2 — Worker:
```bash
npm run product:worker:dev
```

Health checks:
```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

---

## 4. Create an Organization

```bash
curl -X POST http://localhost:4000/api/orgs \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"name": "My Team", "slug": "my-team"}'
```

Save the returned `id` as `ORG_ID`.

---

## 5. Create an Agent

```bash
curl -X POST http://localhost:4000/api/agents \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"name": "Treasury Bot", "description": "USDC payout agent"}'
```

Save the returned `id` as `AGENT_ID`.

---

## 6. Import a Wallet

```bash
curl -X POST http://localhost:4000/api/wallets/import \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "name": "Base Wallet",
    "dwalletPda": "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
    "curve": "Secp256k1",
    "signingPublicKey": "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d"
  }'
```

Save the returned `id` as `WALLET_ID`.

---

## 7. Create a Policy

```bash
curl -X POST http://localhost:4000/api/policies \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "agentId": "<AGENT_ID>",
    "ikaDwalletId": "<WALLET_ID>",
    "name": "Base Sepolia USDC",
    "chainId": 84532,
    "asset": "USDC:BASE_SEPOLIA",
    "recipient": "0x1111111111111111111111111111111111111111",
    "perTxLimit": "100000000",
    "dailyLimit": "500000000",
    "totalLimit": "1000000000"
  }'
```

Save the returned `id` as `POLICY_ID`.

---

## 8. Create an API Key

```bash
npm run product:create-dev-agent-key
```

Or via API:
```bash
curl -X POST "http://localhost:4000/api/agents/<AGENT_ID>/api-keys" \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"name": "SDK Key"}'
```

**Copy the raw key immediately.** It is shown only once.

Save it as `MANDARA_AGENT_API_KEY`.

---

## 9. Use the SDK

```bash
export MANDARA_API_URL=http://localhost:4000
export MANDARA_AGENT_API_KEY=mandara_xxxxxxxx...

npm run mandara-sdk:smoke
```

Or use it in your own script:

```typescript
import { MandaraClient } from "@mandara/sdk";

const client = new MandaraClient({
  apiKey: process.env.MANDARA_AGENT_API_KEY!,
  baseUrl: process.env.MANDARA_API_URL ?? "http://localhost:4000",
});

async function main() {
  // 1. Preview
  const preview = await client.previewSignatureRequest({
    policyId: "<POLICY_ID>",
    messageDigest: "0x" + "5c".repeat(32),
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
  });
  console.log("Preview:", preview.data);

  // 2. Request signature
  const req = await client.requestSignature({
    policyId: "<POLICY_ID>",
    messageDigest: "0x" + "5c".repeat(32),
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
  });
  console.log("Request:", req.data);

  // 3. Wait for signature
  const result = await client.waitForSignature(req.data.id, {
    timeoutMs: 120_000,
    pollIntervalMs: 3_000,
  });
  console.log("Signed:", result.data);
}

main();
```

---

## 10. Preview a Signing Request

```bash
curl -X POST http://localhost:4000/api/signing-requests/preview \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "agentId": "<AGENT_ID>",
    "policyId": "<POLICY_ID>",
    "destinationChainId": 84532,
    "asset": "USDC:BASE_SEPOLIA",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "42000000",
    "message": "Transfer 42 USDC to treasury"
  }'
```

---

## 11. Create and Enqueue a Request

```bash
# Create
curl -X POST http://localhost:4000/api/signing-requests \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "agentId": "<AGENT_ID>",
    "policyId": "<POLICY_ID>",
    "destinationChainId": 84532,
    "asset": "USDC:BASE_SEPOLIA",
    "recipient": "0x1111111111111111111111111111111111111111",
    "amount": "42000000",
    "message": "Transfer 42 USDC to treasury"
  }'
```

Save the returned `id` as `REQUEST_ID`.

Enqueue:
```bash
curl -X POST "http://localhost:4000/api/signing-requests/<REQUEST_ID>/enqueue" \
  -H "x-mandara-dev-user: dev@local"
```

---

## 12. Check Status

```bash
curl -s "http://localhost:4000/api/signing-requests/<REQUEST_ID>" \
  -H "x-mandara-dev-user: dev@local" | jq .
```

Or poll execution detail:
```bash
curl -s "http://localhost:4000/api/signing-requests/<REQUEST_ID>/execution" \
  -H "x-mandara-dev-user: dev@local" | jq .
```

---

## 13. Webhook Setup

```bash
curl -X POST http://localhost:4000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "url": "https://your-service.com/webhooks/mandara",
    "secret": "whsec_test_123",
    "events": ["signature.signed", "signature.rejected"]
  }'
```

Your endpoint will receive HMAC-signed POST requests. See [`PRODUCT_WEBHOOKS.md`](PRODUCT_WEBHOOKS.md) for verification.

---

## 14. Frontend Console (Non-Technical Users)

For a guided UI experience, open the Mandara Console:

```bash
# In a new terminal
npm run dev
```

Then open http://localhost:3000/mandara/app/onboarding

The onboarding wizard walks through:
1. Creating an agent
2. Importing a signing wallet
3. Setting a mandate
4. Creating a connection key
5. Sending a test signature request

For technical details (PDAs, Ika program IDs, transaction signatures), use `/vault/dwallets`.

---

## 15. Audit Export

```bash
# JSON
curl -s "http://localhost:4000/api/audit-events/export?format=json&from=2026-05-01&to=2026-05-04" \
  -H "x-mandara-dev-user: dev@local" > audit.json

# CSV
curl -s "http://localhost:4000/api/audit-events/export?format=csv&from=2026-05-01&to=2026-05-04" \
  -H "x-mandara-dev-user: dev@local" > audit.csv
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module '@mandara/db'` | Run `npm run product:db:generate` |
| `Database connection error` | Ensure `npm run product:docker:up` succeeded |
| `401 Unauthorized` | Add `x-mandara-dev-user: dev@local` header |
| `POLICY_REJECTED` | Check amount against per-tx/daily/total limits |
| Worker not processing jobs | Ensure Redis is running and worker is started |
| Live execution fails | Check service wallet path, balance, and `.local-ika/dwallet.json` |

---

*Back to [`docs/README.md`](README.md)*
