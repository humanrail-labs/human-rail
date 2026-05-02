# Mandara Devnet Artifact Import

> Import the completed Mandara / HumanRail / Ika devnet lifecycle into the product database.  
> **Phase:** P2 — Artifact persistence.  
> **Last updated:** 2026-05-02

---

## What Gets Imported

The import script takes the publicly-known devnet artifacts and stores them as product database records:

| On-Chain Artifact | DB Record | Public Identifier |
|-------------------|-----------|-------------------|
| Ika dWallet | `IkaDwallet` | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| GuardedDwallet Policy | `GuardedPolicy` | `C4kAideEcvxk2xgfepFkejUJywNusMQNEnC5qSi2Ycup` |
| GuardSigningRequest | `SigningRequest` | `f655534b...` |
| Ika MessageApproval | `MessageApproval` | `Csrk5KVNrsBzgA7GE9CN1vMEFqzcNsVNoVZ9DBGgZ1MM` |

It also creates:
- `Organization` — "Mandara Devnet Demo"
- `Agent` — "Cross-Chain Treasury Agent"
- `AuditEvent` records for each imported artifact

---

## What Is NOT Imported

To maintain security and avoid committing secrets:

- ❌ `.local-ika` DKG attestation payloads
- ❌ `.local-keys` keypairs
- ❌ Private signatures or coordinator secrets
- ❌ Any data from `.env.product`

Only **public on-chain addresses, transaction signatures, and hashes** are stored.

---

## Prerequisites

```bash
# 1. Environment
cp .env.product.example .env.product

# 2. Docker services
npm run product:docker:up

# 3. Prisma schema pushed
npm run product:db:push
```

---

## Commands

### Import artifacts

```bash
npm run product:import-devnet-artifacts
```

Expected output:
```
Import complete.

Summary:
  Organization ID:   cmo...
  Agent ID:          cmo...
  IkaDwallet ID:     cmo...
  GuardedPolicy ID:  cmo...
  SigningRequest ID: cmo...
  MessageApproval ID: cmo...

Created: { ... }
Updated: { ... }
```

### Inspect imported data

```bash
# Start the API
npm run product:api:dev

# In another terminal:
curl http://localhost:4000/api/product/devnet-demo \
  -H "x-mandara-dev-user: dev@local"

curl http://localhost:4000/api/agents \
  -H "x-mandara-dev-user: dev@local"

curl http://localhost:4000/api/wallets \
  -H "x-mandara-dev-user: dev@local"

curl http://localhost:4000/api/policies \
  -H "x-mandara-dev-user: dev@local"

curl http://localhost:4000/api/signing-requests \
  -H "x-mandara-dev-user: dev@local"

curl http://localhost:4000/api/message-approvals \
  -H "x-mandara-dev-user: dev@local"

curl http://localhost:4000/api/audit-events \
  -H "x-mandara-dev-user: dev@local"
```

### Automated smoke test

```bash
npm run product:api:smoke
```

---

## Idempotency

The import is **fully idempotent**. Running it multiple times will:
- **Not** create duplicate organizations, agents, wallets, policies, requests, or approvals.
- **Not** create duplicate audit events (deduplicated by `eventType + resourceType + resourceId + source`).
- **Update** existing records if public artifact details change.

---

## API Endpoints

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/product/devnet-demo` | ✅ Implemented | Full demo lifecycle snapshot |
| `GET /api/agents` | ✅ DB-backed | List agents |
| `GET /api/wallets` | ✅ DB-backed | List Ika dWallets |
| `GET /api/policies` | ✅ DB-backed | List GuardedPolicies |
| `GET /api/signing-requests` | ✅ DB-backed | List signing requests |
| `GET /api/signing-requests/:id` | ✅ DB-backed | Single request detail |
| `GET /api/message-approvals` | ✅ DB-backed | List MessageApprovals |
| `GET /api/audit-events` | ✅ DB-backed | List audit events with filters |

---

## Known Limitations

- **No new Ika operations.** This imports existing proof; it does not create new dWallets or submit new signing requests.
- **Devnet only.** All imported artifacts reference Solana devnet and Ika pre-alpha.
- **Mock signer.** Ika pre-alpha uses a single mock signer, not production MPC custody.
- **No production auth.** Dev auth uses `x-mandara-dev-user` header.

---

*Back to [`docs/README.md`](README.md)*
