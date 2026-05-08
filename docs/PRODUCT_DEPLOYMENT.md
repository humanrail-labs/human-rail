# Mandara Devnet Beta Deployment Guide

> **Branch:** `product/mandara-cloud-mvp`  
> **Phase:** P9 — Hosted devnet beta deployment package  
> **Status:** Devnet only. Ika pre-alpha mock signer. Not production custody.  
> **Last updated:** 2026-05-04

---

## 1. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HOSTED DEVNET BETA                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │  Dashboard  │  │  Mandara    │  │  Agent (external process)   │  │
│  │  (Vercel)   │  │  TS SDK     │  │  calls Mandara API          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────────────┘  │
│         │                │                     │                     │
│         └────────────────┼─────────────────────┘                     │
│                          ▼                                           │
│              ┌─────────────────────┐                                 │
│              │   Mandara API       │                                 │
│              │   (Docker / Render) │                                 │
│              │   Port 4000         │                                 │
│              └──────────┬──────────┘                                 │
│                         │                                            │
│         ┌───────────────┼───────────────┐                           │
│         ▼               ▼               ▼                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │  Postgres  │  │   Redis    │  │  Worker    │                    │
│  │  (managed) │  │  (managed) │  │  (Docker)  │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
│                                                         │          │
└─────────────────────────────────────────────────────────┼──────────┘
                                                          ▼
                                              ┌─────────────────────┐
                                              │   Solana Devnet     │
                                              │   Ika Pre-alpha     │
                                              └─────────────────────┘
```

---

## 2. Environment Variables

Copy `.env.product.example` to `.env.product` and fill in hosted values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | Postgres connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection string |
| `MANDARA_API_PORT` | — | `4000` | API server port |
| `MANDARA_API_HOST` | — | `0.0.0.0` | API bind host |
| `MANDARA_ENV` | — | `development` | `development` / `staging` / `production` |
| `MANDARA_CORS_ORIGIN` | — | `http://localhost:3000` | Dashboard origin for CORS |
| `MANDARA_WORKER_MODE` | — | `dry-run` | `dry-run` or `live-devnet` |
| `MANDARA_ENABLE_LIVE_EXECUTION` | — | `false` | Additional safety gate for live signing |
| `MANDARA_SERVICE_WALLET_PATH` | Live only | `""` | Path to devnet service wallet keypair |
| `MANDARA_SOLANA_RPC_URL` | — | Devnet RPC | Solana RPC endpoint |
| `MANDARA_IKA_GRPC_URL` | — | Pre-alpha gRPC | Ika gRPC endpoint |
| `MANDARA_HUMANRAIL_GUARD_PROGRAM_ID` | — | Devnet ID | HumanRail Guard program |
| `MANDARA_IKA_DWALLET_PROGRAM_ID` | — | Devnet ID | Ika dWallet program |

**Important:** Never commit `.env.product`. It is listed in `.gitignore`.

---

## 3. Local Beta Stack (Docker Compose)

Build and run the full stack locally:

```bash
# 1. Environment
cp .env.product.example .env.product

# 2. Start beta stack
docker compose -f docker-compose.beta.yml up --build

# 3. In another terminal, run database migrations
npm run product:db:migrate

# 4. Import devnet artifacts (optional)
npm run product:import-devnet-artifacts
```

Services:
- **API** — `http://localhost:4000`
- **Worker** — background job processor (health on `:4001` if enabled)
- **Postgres** — `localhost:5432`
- **Redis** — `localhost:6379`

Stop:
```bash
docker compose -f docker-compose.beta.yml down
```

---

## 4. Health Checks

### API

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — returns `status: ok` |
| `GET /ready` | Readiness — checks Postgres + Redis connectivity |
| `GET /version` | Service version, program IDs, Ika pre-alpha disclaimer |

Example:
```bash
curl http://localhost:4000/ready
```

### Worker

The worker exposes an optional HTTP health server on the port specified by `MANDARA_WORKER_HEALTH_PORT` (e.g., `4001`).

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness + database + Redis check |
| `GET /ready` | Same as health; returns 503 if degraded |

Example:
```bash
curl http://localhost:4001/health
```

---

## 5. Platform Deployment Guides

### 5.1 Render

**Web Service (API):**
- Build Command: `npm ci && npm run product:db:generate && npm run product:api:build`
- Start Command: `npm run product:api:start`
- Health Check Path: `/health`
- Environment: paste contents of `.env.product`

**Background Worker:**
- Create a separate Background Worker service
- Build Command: same as API
- Start Command: `npm run product:worker:start`
- Environment: same as API, plus `MANDARA_WORKER_MODE=dry-run` (or `live-devnet` with secrets mounted)

**PostgreSQL:**
- Create a managed PostgreSQL instance on Render
- Copy `Internal Database URL` to `DATABASE_URL`

**Redis:**
- Create a managed Redis instance (or use Upstash)
- Copy connection URL to `REDIS_URL`

**Live-Devnet Worker on Render:**
- Render does not support secret file mounts easily.
- For live-devnet, encode the service wallet keypair as a base64 secret and write it to a file in the start command:
  ```bash
  echo "$SERVICE_WALLET_B64" | base64 -d > /tmp/wallet.json && MANDARA_SERVICE_WALLET_PATH=/tmp/wallet.json npm run product:worker:start
  ```
- **Devnet only.** Never upload a mainnet keypair.

---

### 5.2 Fly.io

```bash
# Install flyctl and login
fly auth login

# Launch API app
fly apps create mandara-api-beta
fly deploy -c fly.api.toml

# Launch worker app
fly apps create mandara-worker-beta
fly deploy -c fly.worker.toml
```

Example `fly.api.toml`:
```toml
app = 'mandara-api-beta'
primary_region = 'iad'

[build]
  dockerfile = 'Dockerfile.api'

[http_service]
  internal_port = 4000
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 1
  processes = ['app']

[checks.health]
  port = 4000
  type = 'http'
  interval = '10s'
  timeout = '5s'
  grace_period = '10s'
  method = 'GET'
  path = '/health'
```

Secrets:
```bash
fly secrets set DATABASE_URL="..." REDIS_URL="..." -a mandara-api-beta
```

---

### 5.3 Railway

- Connect GitHub repo, select `product/mandara-cloud-mvp` branch
- Add a **Service** for the API with `Dockerfile.api`
- Add a **Service** for the worker with `Dockerfile.worker`
- Add managed **PostgreSQL** and **Redis** services
- Copy connection strings to environment variables
- Set health check path to `/health` for the API service

---

### 5.4 VPS / Self-Hosted

```bash
# 1. Clone repo
git clone <repo> && cd human-rail
git checkout product/mandara-cloud-mvp

# 2. Environment
cp .env.product.example .env.product
# edit .env.product with hosted Postgres/Redis URLs

# 3. Build images
docker build -f Dockerfile.api -t mandara-api:latest .
docker build -f Dockerfile.worker -t mandara-worker:latest .

# 4. Run with docker-compose.beta.yml
# (update the compose file to point to your images instead of build context)
docker compose -f docker-compose.beta.yml up -d

# 5. Run migrations
docker compose -f docker-compose.beta.yml exec api npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

---

## 6. Dashboard (Vercel)

The Next.js dashboard is deployed separately from the API.

```bash
# Deploy root Next.js app to Vercel
vercel --prod
```

**Required environment variable:**
- `NEXT_PUBLIC_MANDARA_API_URL` — point to your hosted API (e.g., `https://api.devnet.mandara.humanrail.io`)

**Constraints:**
- The dashboard still uses dev auth (`x-mandara-dev-user` header) in this phase.
- Gate access with Vercel password protection or IP allowlisting until real auth is implemented.

---

## 7. Service Wallet Handling

The live-devnet worker requires a Solana devnet keypair to pay for transaction fees.

**Rules:**
- Use a **devnet-only** keypair with a small amount of SOL (≤ 1 SOL).
- Never use a mainnet keypair.
- Never commit the keypair to version control.
- Mount as a secret volume in Docker, or inject via secret manager in hosted platforms.

**Docker Compose example:**
```yaml
worker:
  volumes:
    - /host/path/to/service-wallet.json:/secrets/wallet.json:ro
  environment:
    MANDARA_SERVICE_WALLET_PATH: /secrets/wallet.json
```

---

## 8. dWallet Artifact Handling

The live worker currently reads `.local-ika/dwallet.json` to verify the dWallet on-chain before signing.

**Options:**
1. **Mount artifact as secret volume** (current approach):
   ```yaml
   volumes:
     - /host/path/to/dwallet.json:/app/.local-ika/dwallet.json:ro
   ```
2. **Future:** Store dWallet metadata in the database and remove the filesystem dependency.

---

## 9. Database Migrations

For hosted Postgres, use Prisma Migrate instead of `db push`:

```bash
# Local development
npm run product:db:migrate

# Production / beta deployment
cd packages/db && npx prisma migrate deploy
```

**Note:** `migrate deploy` is safe for CI/CD. It only applies pending migrations and does not generate new ones.

---

## 10. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Ika pre-alpha mock signer** | Not real MPC custody | Clear disclaimer in all UI, docs, and API responses |
| **Devnet only** | No mainnet support | Hardcoded devnet RPC and program IDs |
| **Webhook secret encryption** | Requires `MANDARA_ENCRYPTION_PASSWORD` | Set a unique secret outside development |
| **Dev auth header** | No real user authentication | Gate dashboard access via platform-level protection |
| **No billing / rate limits** | Unlimited API usage | Add rate limiting and metering before paid beta |
| **Service wallet fee funding** | Worker stops if wallet runs out of SOL | Monitor balance; fund manually on devnet faucet |
| **Redis single-node** | No HA for job queues | Use managed Redis with persistence |

---

## 11. Rollback

If a deployment fails:

```bash
# Docker Compose
docker compose -f docker-compose.beta.yml down
docker compose -f docker-compose.beta.yml up --build -d

# Render / Fly / Railway
Use platform-native rollback to previous deploy.
```

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
## Required Secrets

Set `MANDARA_ENCRYPTION_PASSWORD` for every non-development deployment. It encrypts webhook signing secrets at rest and must be unique per environment.

```bash
MANDARA_ENCRYPTION_PASSWORD="replace-with-a-unique-secret"
```

The example development value in `.env.product.example` is not safe for shared environments. Do not commit `.env.product`, service wallets, keypairs, `.local-ika`, `.local-keys`, `.local-worker`, or `target/deploy` keypairs.

Mandara product pages do not require browser wallet access. Advanced HumanRail Protocol proof pages may require a Solana wallet and should be reached through `/advanced`.

Mandara is devnet beta only. Ika is pre-alpha with a mock signer. This is not production custody.
