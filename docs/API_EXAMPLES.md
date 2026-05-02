# Mandara Product API Examples

> Practical `curl` examples for the Mandara Dashboard API.  
> **Base URL:** `http://localhost:4000`  
> **Dev Auth Header:** `x-mandara-dev-user: dev@local`  
> **Phase:** P3 — Create/preview APIs

---

## 1. Create Organization

```bash
curl -X POST http://localhost:4000/api/orgs \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "name": "Acme Corp",
    "slug": "acme-corp"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "cmoxyz...",
    "slug": "acme-corp",
    "name": "Acme Corp",
    "tier": "free",
    "createdAt": "2026-05-02T12:00:00.000Z"
  }
}
```

---

## 2. Create Agent

```bash
curl -X POST http://localhost:4000/api/agents \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "name": "Treasury Bot",
    "description": "Cross-chain treasury operations"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "cmoxyz...",
    "organizationId": "cmoabc...",
    "name": "Treasury Bot",
    "description": "Cross-chain treasury operations",
    "status": "active",
    "createdAt": "2026-05-02T12:00:00.000Z"
  }
}
```

---

## 3. Import Wallet

```bash
curl -X POST http://localhost:4000/api/wallets/import \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "name": "Base Sepolia Wallet",
    "dwalletPda": "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
    "curve": "Secp256k1",
    "signingPublicKey": "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d",
    "state": "Active"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "cmoxyz...",
    "organizationId": "cmoabc...",
    "name": "Base Sepolia Wallet",
    "onChainPda": "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
    "curve": "Secp256k1",
    "state": "Active",
    "createdAt": "2026-05-02T12:00:00.000Z"
  }
}
```

---

## 4. Create Policy

```bash
curl -X POST http://localhost:4000/api/policies \
  -H "Content-Type: application/json" \
  -H "x-mandara-dev-user: dev@local" \
  -d '{
    "agentId": "<AGENT_ID>",
    "ikaDwalletId": "<WALLET_ID>",
    "name": "Base Sepolia USDC Mandate",
    "chainId": 84532,
    "asset": "USDC:BASE_SEPOLIA",
    "recipient": "0x1111111111111111111111111111111111111111",
    "perTxLimit": "100000000",
    "dailyLimit": "500000000",
    "totalLimit": "1000000000"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "cmoxyz...",
    "agentId": "<AGENT_ID>",
    "ikaDwalletId": "<WALLET_ID>",
    "name": "Base Sepolia USDC Mandate",
    "allowedChainId": 84532,
    "allowedAsset": "USDC:BASE_SEPOLIA",
    "allowedRecipient": "0x1111111111111111111111111111111111111111",
    "allowedAssetHash": "d077eb814e4c6cbcfd7be7a842579801e25a2e7966242efb0497d724b4707593",
    "allowedRecipientHash": "efda2c2822100aaf94fb77c3765831ce37fc3c02cbc11603dd6ffa9c0d25ec55",
    "perTxLimit": "100000000",
    "dailyLimit": "500000000",
    "totalLimit": "1000000000",
    "status": "active",
    "createdAt": "2026-05-02T12:00:00.000Z"
  }
}
```

---

## 5. Preview Signing Request (Allowed)

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

**Response:**
```json
{
  "data": {
    "allowed": true,
    "reason": "Request passes all policy checks. Awaiting worker execution in P4.",
    "computed": {
      "assetHash": "d077eb814e4c6cbcfd7be7a842579801e25a2e7966242efb0497d724b4707593",
      "recipientHash": "efda2c2822100aaf94fb77c3765831ce37fc3c02cbc11603dd6ffa9c0d25ec55",
      "messageDigest": "5c125f25f32ea5fa95ade18eabba8299fb1497f53fcac4799e4b5eefa7fdf46b"
    },
    "limits": {
      "perTxLimit": "100000000",
      "dailyLimit": "500000000",
      "totalLimit": "1000000000",
      "requestedAmount": "42000000"
    }
  }
}
```

---

## 6. Preview Signing Request (Rejected)

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
    "amount": "99900000000",
    "message": "Transfer way too much USDC"
  }'
```

**Response:**
```json
{
  "data": {
    "allowed": false,
    "reason": "Amount 99900000000 exceeds per-tx limit 100000000",
    "rejectionCode": "PER_TX_LIMIT_EXCEEDED",
    "computed": {
      "assetHash": "d077eb814e4c6cbcfd7be7a842579801e25a2e7966242efb0497d724b4707593",
      "recipientHash": "efda2c2822100aaf94fb77c3765831ce37fc3c02cbc11603dd6ffa9c0d25ec55",
      "messageDigest": "b2f7c..."
    },
    "limits": {
      "perTxLimit": "100000000",
      "dailyLimit": "500000000",
      "totalLimit": "1000000000",
      "requestedAmount": "99900000000"
    }
  }
}
```

---

## 7. Create Signing Request (Allowed)

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

**Response:**
```json
{
  "data": {
    "signingRequest": {
      "id": "cmoxyz...",
      "requestId": "a1b2c3...",
      "status": "requested",
      "destinationChainId": 84532,
      "amount": "42000000",
      "createdAt": "2026-05-02T12:00:00.000Z"
    },
    "evaluation": { ... },
    "nextStep": "Awaiting worker execution in P4"
  }
}
```

---

## 8. Create Signing Request (Rejected, Not Persisted)

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
    "amount": "99900000000",
    "message": "Transfer way too much USDC"
  }'
```

**Response (422):**
```json
{
  "error": {
    "code": "POLICY_REJECTED",
    "message": "Amount 99900000000 exceeds per-tx limit 100000000",
    "details": {
      "evaluation": { ... }
    }
  }
}
```

---

## 9. Create Signing Request (Rejected, Persisted)

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
    "amount": "99900000000",
    "message": "Transfer way too much USDC",
    "persistIfRejected": true
  }'
```

**Response (201):**
```json
{
  "data": {
    "signingRequest": {
      "id": "cmoxyz...",
      "requestId": "a1b2c3...",
      "status": "policy_rejected",
      "rejectionReason": "Amount 99900000000 exceeds per-tx limit 100000000",
      "createdAt": "2026-05-02T12:00:00.000Z"
    },
    "evaluation": { ... }
  }
}
```

---

## Notes

- Replace `<AGENT_ID>` and `<POLICY_ID>` with actual IDs from your environment.
- In P3, `POST /api/signing-requests` only creates a database record. No Ika gRPC or Solana transaction is executed.
- On-chain execution will be implemented in P4 via background workers.
- All requests require the `x-mandara-dev-user` header in development.

---

*Back to [`PRODUCT_API_DESIGN.md`](PRODUCT_API_DESIGN.md)*
