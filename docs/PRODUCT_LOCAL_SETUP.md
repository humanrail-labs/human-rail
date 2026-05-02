# Mandara Product Local Setup

> Setup guide for running the Mandara Cloud backend locally.  
> **Phase:** P3 — Create/preview APIs complete.  
> **Last updated:** 2026-05-02

---

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Docker** + Docker Compose
- **Git**

Optional but recommended:
- `curl` and `jq` for quick API testing

---

## Quick Start

### 1. Environment

```bash
cp .env.product.example .env.product
```

Edit `.env.product` if you need to change ports or database credentials.

### 2. Start Docker services

```bash
npm run product:docker:up
```

This starts:
- **Postgres 16** on `localhost:5432`
- **Redis 7** on `localhost:6379`

### 3. Install dependencies

```bash
npm install
```

> **Note:** The root package now uses npm workspaces. `npm install` from root installs all workspace dependencies and creates symlinks.

### 4. Generate Prisma client

```bash
npm run product:db:generate
```

### 5. Push schema to database

```bash
npm run product:db:push
```

This creates tables in Postgres without migration files (suitable for local dev).

### 6. Import devnet artifacts (optional)

```bash
npm run product:import-devnet-artifacts
```

This idempotently imports the completed Mandara devnet proof into Postgres.

### 7. Start the API

```bash
npm run product:api:dev
```

The API will start on `http://localhost:4000` with auto-reload.

### 8. Start the Worker (optional)

In a separate terminal:

```bash
npm run product:worker:dev
```

The worker will connect to Redis and process signing request jobs.

---

## Verify It Works

### Health check

```bash
curl http://localhost:4000/health
```

Expected:
```json
{
  "data": {
    "status": "ok",
    "service": "mandara-api",
    "time": "2026-05-02T12:00:00.000Z",
    "env": "development"
  }
}
```

### Readiness check

```bash
curl http://localhost:4000/ready
```

Expected:
```json
{
  "data": {
    "status": "ready",
    "checks": {
      "database": "ok",
      "redis": "skipped"
    }
  }
}
```

### Version

```bash
curl http://localhost:4000/version
```

### Create an organization

```bash
curl -X POST http://localhost:4000/api/orgs \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"name": "Test Org", "slug": "test-org"}'
```

### Create an agent

```bash
curl -X POST http://localhost:4000/api/agents \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"name": "My Agent", "description": "Treasury bot"}'
```

### Import a wallet

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

### Create a policy

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

### Preview a signing request

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

### Create a signing request

```bash
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

---

## Smoke Tests

### API Smoke Test

```bash
npm run product:api:smoke
```

This verifies all P3 create/preview endpoints.

### Worker Smoke Test

```bash
# Ensure API is running
npm run product:api:start

# In another terminal
npm run product:worker:smoke
```

This verifies:
- `POST /api/signing-requests/:id/enqueue`
- Worker dry-run processor execution
- Status transitions and audit events
- `GET /api/signing-requests/:id/execution`

---

## Database Studio

Browse and edit data with Prisma Studio:

```bash
npm run product:db:studio
```

Opens at `http://localhost:5555`.

---

## Stop Everything

```bash
npm run product:docker:down
```

To also remove volumes (wipes local data):

```bash
docker compose down -v
```

---

## Known Limitations

- **No production authentication.** Dev auth uses `x-mandara-dev-user` header.
- **Dry-run is default.** Worker runs in `dry-run` mode by default. Live devnet execution requires explicit safety gates.
- **Live execution is gated.** Requires `MANDARA_WORKER_MODE=live-devnet` AND `MANDARA_ENABLE_LIVE_EXECUTION=true`.
- **Service wallet must be devnet-only.** Never use a mainnet keypair for live execution.
- **Devnet only.** All on-chain interactions target Solana devnet and Ika pre-alpha.
- **Ika pre-alpha disclaimer.** The mock signer is not production MPC custody.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Port 5432 already in use` | Stop local Postgres or change `DATABASE_URL` and compose port mapping |
| `prisma: command not found` | Run `npm install` from repo root |
| `Cannot find module '@mandara/db'` | Run `npm run product:db:generate` |
| `Database connection error` | Ensure Docker is running and `npm run product:docker:up` succeeded |
| `401 Unauthorized` | Add `x-mandara-dev-user: dev@local` header to requests |
| `400 ORG_AMBIGUOUS` | Provide `organizationId` in the request body, or ensure the user belongs to exactly one org |

---

*Back to [`docs/README.md`](README.md)*
