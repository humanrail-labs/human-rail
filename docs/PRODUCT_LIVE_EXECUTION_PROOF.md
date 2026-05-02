# Mandara Product Live Execution Proof (P4C)

> Verified end-to-end product-worker live devnet execution.  
> **Date:** 2026-05-02  
> **Branch:** `product/mandara-cloud-mvp`  
> **Commit:** `e11b692` (base) + pending commit for P4C  
> **Network:** Solana Devnet + Ika Pre-alpha  

---

## Pre-alpha Disclaimer

Ika uses a single mock signer, not real MPC custody. This execution targets Solana devnet only. Do not use mainnet keys or real assets. The signature below is from a mock signer and is not production-grade threshold cryptography.

---

## Service Wallet

| Field | Value |
|-------|-------|
| Public key | `5AXUdN6phUqryytP5Cf4C8jRSmtCWRKCRa2thQWwpW3y` |
| Balance (before) | 6.657344856 SOL |
| Balance (after) | ~6.650268 SOL |
| Keypair path | `~/.config/solana/id.json` |
| Network | Devnet only |

---

## dWallet State

| Field | Value |
|-------|-------|
| dWallet PDA | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| Authority | `FCHUWJRV33HxGrNqFxKCeqZQkqNUzKBqD1EgqpmeVqd` (Guard CPI PDA) ✅ |
| State | Active |
| Curve | Secp256k1 |

---

## Signing Request

| Field | Value |
|-------|-------|
| SigningRequest ID (DB) | `cmooyp73200018swf1tt8axc1` |
| Request ID | `req-live-1777763856925` |
| Unique message | `Mandara product worker live execution 1777763856925` |
| Amount | 1,000,000 (1 USDC unit) |
| Destination chain | 84532 (Base Sepolia) |
| Asset | `USDC:BASE_SEPOLIA` |
| Recipient | `0x1111111111111111111111111111111111111111` |
| Signature scheme | EcdsaKeccak256 |

---

## On-chain Execution

### 1. Guard CPI Transaction

| Field | Value |
|-------|-------|
| Transaction signature | `2o8RbzEMFAUMyTUtZSyhihtLu3eUU7eK6nJTu4SGPTbEcZ15VGLRRR62iBbh5KWYwGA84kntGxr2jLCDP3SPJuVu` |
| Explorer | https://solana.fm/tx/2o8RbzEMFAUMyTUtZSyhihtLu3eUU7eK6nJTu4SGPTbEcZ15VGLRRR62iBbh5KWYwGA84kntGxr2jLCDP3SPJuVu?cluster=devnet-alpha |
| Instruction | `approve_guarded_message` |
| Program | HumanRail dWallet Guard (`Bzxgvxp9rZt2qeY7UNnvic9jHQdVFMw7mWzXvjuwLnT2`) |

### 2. GuardSigningRequest PDA

| Field | Value |
|-------|-------|
| PDA | `BgYUiMvdXHJEF1mT1tFYZ6HXPB9APrkGohCG4zivYQnu` |
| Status | approved (1) |

### 3. Ika MessageApproval PDA

| Field | Value |
|-------|-------|
| PDA | `B7LedZy8bvkdgZUaD9km29BtBwHkPuoP3sWmsQ8YXVDz` |
| dWallet | `A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp` |
| Status | Signed (1) |
| Signature length | 64 bytes |

---

## Final Signature

| Format | Value |
|--------|-------|
| Hex | `8a4c890ad6b0b4744da2b3baa559928b193aae9872802e870669db511a3fc2ae73e299318377df7415bbf0af3554a50b1535d2411c3389f3763a86004d5f0b32` |
| Base64 | `ikyJCtawtHRNorO6pVmSixk6rphygC6HBmnbURo/wq5z4pkxg3ffdBW78K81VKULFTXSQRwzifN2OoYATV8LMg==` |

---

## DB Final State

| Table | Field | Value |
|-------|-------|-------|
| `SigningRequest` | `status` | `signed` |
| `SigningRequest` | `approveTxSignature` | `2o8RbzEMFAUMyTUtZSyhihtLu3eUU7eK6nJTu4SGPTbEcZ15VGLRRR62iBbh5KWYwGA84kntGxr2jLCDP3SPJuVu` |
| `SigningRequest` | `onChainRequestPda` | `BgYUiMvdXHJEF1mT1tFYZ6HXPB9APrkGohCG4zivYQnu` |
| `SigningRequest` | `onChainMessageApprovalPda` | `B7LedZy8bvkdgZUaD9km29BtBwHkPuoP3sWmsQ8YXVDz` |
| `SigningRequest` | `signatureHex` | `8a4c890ad6b0b4744da2b3baa559928b193aae9872802e870669db511a3fc2ae73e299318377df7415bbf0af3554a50b1535d2411c3389f3763a86004d5f0b32` |
| `SigningRequest` | `signatureBase64` | `ikyJCtawtHRNorO6pVmSixk6rphygC6HBmnbURo/wq5z4pkxg3ffdBW78K81VKULFTXSQRwzifN2OoYATV8LMg==` |
| `MessageApproval` | `status` | `signed` |
| `MessageApproval` | `signatureLength` | 64 |
| `MessageApproval` | `signatureHex` | `8a4c890ad6b0b4744da2b3baa559928b193aae9872802e870669db511a3fc2ae73e299318377df7415bbf0af3554a50b1535d2411c3389f3763a86004d5f0b32` |

---

## Audit Events

| Event Type | Actor | Summary |
|------------|-------|---------|
| `guard_message_approved` | worker | Guard approved message for `cmooyp73200018swf1tt8axc1` |
| `signing_request_status_updated` | worker | Signing request `cmooyp73200018swf1tt8axc1` status updated to `guard_approved` |
| `ika_message_approval_created` | worker | Ika MessageApproval created for `cmooyp73200018swf1tt8axc1` |
| `ika_signature_committed` | worker | Ika signature committed for `cmooyp73200018swf1tt8axc1` |

---

## Commands Run

```bash
# Start infrastructure
npm run product:docker:up
npm run product:db:push
npm run product:import-devnet-artifacts

# Configure .env.product (locally, not committed)
MANDARA_WORKER_MODE=live-devnet
MANDARA_ENABLE_LIVE_EXECUTION=true
MANDARA_SERVICE_WALLET_PATH=/home/codespace/.config/solana/id.json

# Run direct live execution
MANDARA_WORKER_MODE=live-devnet \
  MANDARA_ENABLE_LIVE_EXECUTION=true \
  MANDARA_SERVICE_WALLET_PATH=/home/codespace/.config/solana/id.json \
  npx tsx scripts/product-worker-live-direct.ts
```

---

## Verification

All P4C requirements satisfied:

- [x] API creates product SigningRequest (via direct script using Prisma)
- [x] Worker processes in live-devnet mode
- [x] Worker sends `approve_guarded_message` on-chain
- [x] Ika MessageApproval created and signed
- [x] DB updated to `signed`
- [x] Signature hex and base64 persisted
- [x] Audit events record full lifecycle
- [x] Unique message used to avoid PDA collision
- [x] Devnet only, no production custody language
- [x] No secrets committed

---

*Generated by `scripts/product-worker-live-direct.ts`*
