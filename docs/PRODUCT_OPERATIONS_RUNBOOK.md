# Mandara Product Operations Runbook

> **Branch:** `product/mandara-cloud-mvp`  
> **Scope:** Devnet beta operations for API, worker, Postgres, Redis, and Solana devnet.  
> **Last updated:** 2026-05-04

---

## 1. Start / Stop Services

### Docker Compose (Local / VPS)

```bash
# Start everything
docker compose -f docker-compose.beta.yml up -d

# Stop everything
docker compose -f docker-compose.beta.yml down

# Stop and wipe data (careful!)
docker compose -f docker-compose.beta.yml down -v

# Restart a single service
docker compose -f docker-compose.beta.yml restart api
docker compose -f docker-compose.beta.yml restart worker
```

### Individual Services (npm)

```bash
# API
npm run product:api:start

# Worker
npm run product:worker:start
```

---

## 2. Check API Health

```bash
# Liveness
curl -s http://localhost:4000/health | jq .

# Readiness (includes DB + Redis)
curl -s http://localhost:4000/ready | jq .

# Version + disclaimer
curl -s http://localhost:4000/version | jq .
```

Expected `/ready`:
```json
{
  "data": {
    "status": "ready",
    "checks": {
      "database": "ok",
      "redis": "ok"
    }
  }
}
```

---

## 3. Check Worker Health

If `MANDARA_WORKER_HEALTH_PORT` is set (e.g., `4001`):

```bash
curl -s http://localhost:4001/health | jq .
curl -s http://localhost:4001/ready | jq .
```

If no health port is exposed, check worker logs:

```bash
# Docker
docker compose -f docker-compose.beta.yml logs -f worker

# Render / Fly / Railway
Use platform log stream.
```

---

## 4. Inspect BullMQ Queue

```bash
# List queue lengths (requires redis-cli)
redis-cli LLEN bull:mandara.signing-requests:wait
redis-cli LLEN bull:mandara.signing-requests:active
redis-cli LLEN bull:mandara.webhook-deliveries:wait

# Or use BullMQ introspection via a small script
npx tsx -e "
import { Queue } from 'bullmq';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const q = new Queue('mandara.signing-requests', { connection: redis });
const counts = await q.getJobCounts('wait', 'active', 'completed', 'failed');
console.log(counts);
await redis.quit();
"
```

---

## 5. Retry Failed Webhook Delivery

Webhooks retry automatically via BullMQ (up to 3 attempts with exponential backoff).

To manually retry a specific delivery:

```bash
# Find the failed delivery ID in the database or logs
# Then re-enqueue via API (future feature) or directly in DB:

# Mark delivery as pending to trigger retry on next worker poll
# (Not recommended — instead, fix the endpoint and wait for next event)
```

**Immediate workaround:**
1. Fix the receiver endpoint (URL, auth, timeout).
2. Trigger a new signing request or status change to generate a new webhook event.

---

## 6. Retry Failed Signing Request

1. Identify the failed request:
   ```bash
   curl -s "http://localhost:4000/api/signing-requests?status=failed" \
     -H "x-mandara-dev-user: dev@local" | jq .
   ```

2. Check execution logs:
   ```bash
   curl -s "http://localhost:4000/api/signing-requests/<ID>/execution" \
     -H "x-mandara-dev-user: dev@local" | jq .
   ```

3. If the failure was transient (RPC timeout, devnet instability), re-enqueue:
   ```bash
   curl -X POST "http://localhost:4000/api/signing-requests/<ID>/enqueue" \
     -H "x-mandara-dev-user: dev@local" | jq .
   ```

4. Worker will pick it up and retry.

---

## 7. Rotate Agent API Key

1. Create a new key:
   ```bash
   curl -X POST "http://localhost:4000/api/agents/<AGENT_ID>/api-keys" \
     -H "Content-Type: application/json" \
     -H "x-mandara-dev-user: dev@local" \
     -d '{"name": "Rotated Key"}' | jq .
   ```

2. Copy the raw key (shown **once**).

3. Update the external agent with the new key.

4. Revoke the old key:
   ```bash
   curl -X DELETE "http://localhost:4000/api/agents/<AGENT_ID>/api-keys/<KEY_ID>" \
     -H "x-mandara-dev-user: dev@local"
   ```

---

## 8. Revoke Webhook

```bash
# Pause (stop deliveries, keep config)
curl -X PATCH "http://localhost:4000/api/webhooks/<WEBHOOK_ID>" \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{"status": "paused"}'

# Or delete entirely
curl -X DELETE "http://localhost:4000/api/webhooks/<WEBHOOK_ID>" \
  -H "x-mandara-dev-user: dev@local"
```

---

## 9. Export Audit Logs

```bash
# JSON export
curl -s "http://localhost:4000/api/audit-events/export?format=json&from=2026-05-01&to=2026-05-04" \
  -H "x-mandara-dev-user: dev@local" > audit.json

# CSV export
curl -s "http://localhost:4000/api/audit-events/export?format=csv&from=2026-05-01&to=2026-05-04" \
  -H "x-mandara-dev-user: dev@local" > audit.csv
```

---

## 10. Recover from Redis Outage

**Symptom:** Worker stops processing jobs; API enqueue requests may hang or fail.

**Recovery:**
1. Check Redis connectivity from API and worker hosts:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```
2. If Redis is down, restart it:
   ```bash
   docker compose -f docker-compose.beta.yml restart redis
   ```
3. Worker and API will reconnect automatically (ioredis + BullMQ handle reconnection).
4. Check for stale jobs:
   ```bash
   redis-cli KEYS 'bull:mandara.*'
   ```
5. If jobs were lost in a hard crash, re-enqueue signing requests manually via the API.

**Prevention:** Use managed Redis with AOF persistence and replication (e.g., Upstash, Redis Cloud).

---

## 11. Recover from Postgres Outage

**Symptom:** API returns 500 or degraded readiness; worker logs show Prisma connection errors.

**Recovery:**
1. Check Postgres connectivity:
   ```bash
   pg_isready -d "$DATABASE_URL"
   ```
2. Restart Postgres:
   ```bash
   docker compose -f docker-compose.beta.yml restart postgres
   ```
3. Verify API readiness returns `ready`.
4. If data was corrupted, restore from the most recent backup.

**Prevention:** Use managed Postgres with automated backups (e.g., Supabase, Neon, RDS).

---

## 12. Recover from Devnet Artifact Loss

**Symptom:** Live worker fails with "dWallet artifact not found" or "Service wallet not found."

**Recovery:**
1. If `.local-ika/dwallet.json` is missing, re-run artifact import:
   ```bash
   npm run product:import-devnet-artifacts
   ```
2. If the service wallet is lost, generate a new devnet keypair and fund it:
   ```bash
   solana-keygen new -o /secrets/new-wallet.json
   solana airdrop 2 /secrets/new-wallet.json --url devnet
   ```
3. Update `MANDARA_SERVICE_WALLET_PATH` to the new wallet.
4. **Note:** If the dWallet PDA itself is lost due to a devnet wipe, the entire dWallet must be recreated via Ika DKG.

---

## 13. Service Wallet Funding

Check balance:
```bash
solana balance <WALLET_ADDRESS> --url devnet
```

Airdrop (devnet only):
```bash
solana airdrop 1 <WALLET_ADDRESS> --url devnet
```

**Alert threshold:** If balance drops below 0.01 SOL, the worker will fail to submit transactions.

---

## 14. Incident Checklist

| Step | Action | Owner |
|------|--------|-------|
| 1 | Acknowledge incident in team channel | On-call |
| 2 | Check `/health` and `/ready` on API + worker | On-call |
| 3 | Check platform status (Render / Fly / Railway / VPS) | On-call |
| 4 | Check Solana devnet status (rpc, explorer) | On-call |
| 5 | If devnet is down → switch worker to `dry-run` mode | On-call |
| 6 | Inspect logs for error spikes | On-call |
| 7 | If signing requests are failing → re-enqueue after fix | On-call |
| 8 | Document root cause in incident log | Post-incident |
| 9 | Update runbook if gap found | Post-incident |

---

*Back to [`PRODUCT_IMPLEMENTATION_PLAN.md`](PRODUCT_IMPLEMENTATION_PLAN.md)*
