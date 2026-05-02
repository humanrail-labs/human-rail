# Mandara Product Local Setup

> Setup guide for running the Mandara Cloud backend locally.  
> **Phase:** P1 — Backend API + Prisma DB foundation.  
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

### 6. Start the API

```bash
npm run product:api:dev
```

The API will start on `http://localhost:4000` with auto-reload.

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

### List organizations

```bash
curl http://localhost:4000/api/orgs \
  -H "x-mandara-dev-user: dev@local"
```

### List audit events

```bash
curl "http://localhost:4000/api/audit-events?orgId=<ORG_ID>" \
  -H "x-mandara-dev-user: dev@local"
```

---

## Smoke Test

Run the automated smoke test:

```bash
npm run product:api:smoke
```

This verifies:
- `/health`
- `/version`
- `/ready`
- `POST /api/orgs`
- `GET /api/orgs`
- `GET /api/audit-events`

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

## Known Limitations (P1)

- **No production authentication.** Dev auth uses `x-mandara-dev-user` header. Do not deploy to production without replacing with Clerk/Supabase Auth.
- **No Ika mutations.** The API does not yet create dWallets or submit signing requests on-chain. That arrives in P4.
- **No worker jobs.** Redis is started but BullMQ is not wired yet.
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

---

*Back to [`docs/README.md`](README.md)*
