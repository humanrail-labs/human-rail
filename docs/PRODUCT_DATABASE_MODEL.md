# Mandara Product Database Model

> **Status:** P0 draft. Proposed Prisma schema for the Mandara hosted product.  
> **Database:** PostgreSQL  
> **ORM:** Prisma  
> **Last updated:** 2026-05-02

---

## Overview

The Mandara database is the source of truth for product-level state: organizations, users, agents, API keys, policies, signing requests, and audit events. It mirrors and indexes on-chain state (Solana + Ika) but does not replace it. The HumanRail Guard program remains the ultimate policy enforcer.

---

## Table Reference

| Table | Purpose |
|-------|---------|
| `organizations` | Billing and namespace isolation |
| `users` | Authentication identity |
| `memberships` | Org membership + role |
| `agents` | AI agents mapped to on-chain registry |
| `agent_api_keys` | Hashed API keys for external agent access |
| `ika_dwallets` | Ika dWallet accounts tracked per org |
| `guarded_policies` | HumanRail Guard policy accounts |
| `signing_requests` | Signature request lifecycle |
| `message_approvals` | Ika MessageApproval results |
| `audit_events` | Immutable product-level audit trail |
| `webhooks` | Webhook endpoint configuration |
| `webhook_deliveries` | Delivery attempt log |
| `integration_secrets` | Encrypted third-party credentials |

---

## 1. organizations

**Purpose:** Top-level billing and namespace isolation. Every agent, wallet, and policy belongs to exactly one organization.

```prisma
model Organization {
  id        String   @id @default(cuid())
  slug      String   @unique // URL-safe identifier
  name      String
  tier      String   @default("free") // free, pro, enterprise
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  memberships Membership[]
  agents      Agent[]
  wallets     IkaDwallet[]
  policies    GuardedPolicy[]
  signingRequests SigningRequest[]
  auditEvents AuditEvent[]
  webhooks    Webhook[]
  integrationSecrets IntegrationSecret[]

  @@map("organizations")
}
```

**Indexes:**
- `slug` (unique) — used in URLs and API routing.

**Security notes:**
- Soft-delete not used; org deletion is explicit and cascades to related records.
- `tier` controls feature gates (e.g., number of agents, webhook destinations).

---

## 2. users

**Purpose:** Authentication identity. Mandara delegates auth to an external provider (Clerk/Supabase) and stores only the provider's user ID and profile cache.

```prisma
model User {
  id          String   @id @default(cuid())
  externalId  String   @unique // Clerk/Supabase user ID
  email       String   @unique
  displayName String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  memberships Membership[]

  @@map("users")
}
```

**Indexes:**
- `externalId` (unique) — fast lookup during session validation.
- `email` (unique) — contact and identity verification.

**Security notes:**
- No passwords stored locally.
- PII minimized; only email and display name cached.

---

## 3. memberships

**Purpose:** Many-to-many join between users and organizations with role-based access.

```prisma
model Membership {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   @default("member") // owner, admin, member
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@map("memberships")
}
```

**Indexes:**
- `[organizationId, userId]` (unique) — one membership per user per org.
- `userId` — list all orgs for a user.

**Security notes:**
- `owner` role required for destructive actions (delete org, rotate billing).
- Only `owner` and `admin` can create API keys or manage policies.

---

## 4. agents

**Purpose:** An AI agent registered by an organization. Maps to an on-chain HumanRail Agent Registry PDA.

```prisma
model Agent {
  id                String   @id @default(cuid())
  organizationId    String
  name              String
  description       String?
  status            String   @default("active") // active, suspended, revoked
  onChainAgentPda   String?  // Solana Agent Registry PDA (base58)
  onChainProfilePda String?  // Human Registry PDA of principal (base58)
  onChainCapabilityPda String? // Delegation capability PDA (base58)
  frozenAt          DateTime?
  revokedAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  organization    Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  apiKeys         AgentApiKey[]
  signingRequests SigningRequest[]
  policies        GuardedPolicy[]

  @@map("agents")
}
```

**Indexes:**
- `[organizationId, status]` — list active agents for an org.
- `onChainAgentPda` (unique, sparse) — correlate on-chain events.

**Relation to Solana:**
- `onChainAgentPda` is the PDA owned by the HumanRail Agent Registry program (`GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ`).
- Status changes (suspend, revoke) should eventually be mirrored on-chain via the SDK.

---

## 5. agent_api_keys

**Purpose:** API keys that external agent processes use to call Mandara.

```prisma
model AgentApiKey {
  id          String   @id @default(cuid())
  agentId     String
  name        String   // e.g., "production", "staging"
  prefix      String   // First 8 chars of the key, e.g. "mandara_"
  hash        String   // Argon2id or bcrypt hash of the full key
  scopes      String[] // e.g., ["signing:request", "signing:read"]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdAt   DateTime @default(now())

  // Relations
  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@map("agent_api_keys")
}
```

**Indexes:**
- `prefix` — fast lookup during authentication (before hash comparison).
- `agentId` — list keys for an agent.

**Security notes:**
- Plaintext API keys are shown **once** at creation and never stored.
- Hash algorithm: Argon2id (preferred) or bcrypt with cost factor ≥ 12.
- Revoked or expired keys are rejected immediately.

---

## 6. ika_dwallets

**Purpose:** Tracks Ika dWallet accounts created or connected by an organization.

```prisma
model IkaDwallet {
  id              String   @id @default(cuid())
  organizationId  String
  name            String?
  onChainPda      String   @unique // Solana dWallet PDA (base58)
  curve           String   // Secp256k1, Secp256r1, Curve25519, Ristretto
  publicKey       String?  // Hex-encoded public key
  state           String   @default("dkg_in_progress") // dkg_in_progress, active, frozen
  authority       String?  // Current authority PDA / pubkey (base58)
  authorityTransferredAt DateTime?
  createdVia      String   @default("grpc_dkg") // grpc_dkg, import
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  policies     GuardedPolicy[]

  @@map("ika_dwallets")
}
```

**Indexes:**
- `onChainPda` (unique) — prevent duplicate tracking.
- `[organizationId, state]` — list active wallets for an org.

**Relation to Ika:**
- `onChainPda` is derived from Ika's `deriveIkaDwalletPda` helper.
- `authority` must eventually match the HumanRail Guard CPI PDA for signing to work.
- `state` mirrors Ika's on-chain `DWalletState` enum.

---

## 7. guarded_policies

**Purpose:** HumanRail Guard policy accounts. Each policy binds an agent, a dWallet, and spending rules.

```prisma
model GuardedPolicy {
  id                  String   @id @default(cuid())
  organizationId      String
  agentId             String
  ikaDwalletId        String
  name                String?
  onChainPda          String   @unique // GuardedDwallet PDA (base58)
  allowedChainId      Int      // e.g., 84532 for Base Sepolia
  allowedAssetHash    String   // Hex-encoded keccak256 hash
  allowedRecipientHash String  // Hex-encoded keccak256 hash
  perTxLimit          BigInt   // Atomic units
  dailyLimit          BigInt   // Atomic units
  totalLimit          BigInt   // Atomic units (0 = unlimited)
  dailySpent          BigInt   @default(0)
  totalSpent          BigInt   @default(0)
  lastSpendDay        Int?     // Unix day (timestamp / 86400)
  expiresAt           DateTime
  frozen              Boolean  @default(false)
  frozenAt            DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  organization    Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  agent           Agent            @relation(fields: [agentId], references: [id], onDelete: Cascade)
  ikaDwallet      IkaDwallet       @relation(fields: [ikaDwalletId], references: [id], onDelete: Restrict)
  signingRequests SigningRequest[]

  @@map("guarded_policies")
}
```

**Indexes:**
- `onChainPda` (unique) — direct lookup from on-chain events.
- `[agentId, frozen]` — list active policies for an agent.

**Relation to Solana:**
- `onChainPda` is derived from `deriveGuardedDwallet(principal, agent, dwallet)`.
- Spend counters (`dailySpent`, `totalSpent`) are cached from on-chain state and refreshed after every approved request.
- `frozen` must be synced with on-chain `GuardedDwallet.frozen`.

---

## 8. signing_requests

**Purpose:** Lifecycle of a cross-chain signature request. Created when an agent calls the API; updated by the worker as on-chain state progresses.

```prisma
model SigningRequest {
  id                    String   @id @default(cuid())
  organizationId        String
  agentId               String
  policyId              String
  ikaDwalletId          String
  requestId             String   @unique // On-chain request_id (hex, 32 bytes)
  messageDigest         String   // Hex-encoded keccak256 (32 bytes)
  messageMetadataDigest String   // Hex-encoded (32 bytes)
  destinationChainId    Int
  assetHash             String
  recipientHash         String
  amount                BigInt
  signatureScheme       String   // e.g., "EcdsaKeccak256"
  status                String   @default("pending") // pending, approved, rejected, signed, failed
  rejectionCode         Int?     // Maps to GuardError enum
  rejectionReason       String?
  onChainRequestPda     String?  // GuardSigningRequest PDA
  onChainMessageApprovalPda String? // Ika MessageApproval PDA
  submittedAt           DateTime?
  signedAt              DateTime?
  signatureHex          String?  // Final signature bytes (hex)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  agent        Agent         @relation(fields: [agentId], references: [id], onDelete: Cascade)
  policy       GuardedPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@map("signing_requests")
}
```

**Indexes:**
- `requestId` (unique) — idempotency key.
- `[organizationId, createdAt]` — paginated audit list.
- `[agentId, status]` — agent-specific status queries.
- `onChainRequestPda` (unique, sparse) — correlate on-chain account.

**Relation to Solana / Ika:**
- `requestId` is the 32-byte random seed used in the GuardSigningRequest PDA derivation.
- `status` transitions:
  1. `pending` — created in DB, job queued.
  2. `approved` — Guard CPI succeeded, Ika MessageApproval created.
  3. `rejected` — Guard policy check failed (`rejectionCode` populated).
  4. `signed` — Ika signature committed on-chain (`signatureHex` populated).
  5. `failed` — Network or unexpected error (retryable).

---

## 9. message_approvals

**Purpose:** Denormalized cache of Ika MessageApproval account state. Updated by the worker after polling.

```prisma
model MessageApproval {
  id              String   @id @default(cuid())
  signingRequestId String  @unique
  onChainPda      String   @unique // Ika MessageApproval PDA
  dwalletPda      String
  messageDigest   String
  metadataDigest  String
  approver        String   // Guard CPI PDA
  userPubkey      String
  signatureScheme String
  epoch           BigInt
  status          String   // pending, signed
  signatureLength Int?
  signatureHex    String?
  fetchedAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("message_approvals")
}
```

**Indexes:**
- `signingRequestId` (unique) — one-to-one with signing request.
- `onChainPda` (unique) — direct on-chain lookup.

**Relation to Ika:**
- Mirrors `IkaMessageApproval` account layout (see `lib/ika/parsers.ts`).
- `signatureHex` is the final ECDSA signature produced by Ika.

---

## 10. audit_events

**Purpose:** Immutable product-level audit trail. Complements on-chain Receipts with off-chain context (API calls, dashboard actions, webhook deliveries).

```prisma
model AuditEvent {
  id             String   @id @default(cuid())
  organizationId String
  actorType      String   // user, agent, system, worker
  actorId        String?  // userId or agentId
  action         String   // e.g., "agent.created", "policy.frozen", "signing.requested"
  resourceType   String   // agent, policy, signing_request, wallet, api_key
  resourceId     String?
  metadata       Json?    // Flexible context (IP, user agent, tx signature, etc.)
  createdAt      DateTime @default(now())

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, createdAt])
  @@index([actorType, actorId])
  @@index([action])
  @@map("audit_events")
}
```

**Indexes:**
- `[organizationId, createdAt]` — paginated audit queries.
- `action` — analytics and compliance filtering.

**Security notes:**
- Append-only. No updates or deletes allowed by application code.
- `metadata` must not contain secrets or PII beyond actor identification.

---

## 11. webhooks

**Purpose:** Endpoint configuration for organizations that want real-time events.

```prisma
model Webhook {
  id             String   @id @default(cuid())
  organizationId String
  url            String
  secret         String   // HMAC-SHA256 secret for signature header
  events         String[] // e.g., ["signature.signed", "agent.frozen"]
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  deliveries     WebhookDelivery[]

  @@map("webhooks")
}
```

**Indexes:**
- `[organizationId, active]` — list active webhooks for an org.

**Security notes:**
- `secret` is hashed if possible, but must be recoverable for HMAC computation. Encrypt at rest (AES-256-GCM).
- URL validation required (no localhost, no internal IPs in production).

---

## 12. webhook_deliveries

**Purpose:** Log of every webhook delivery attempt.

```prisma
model WebhookDelivery {
  id          String   @id @default(cuid())
  webhookId   String
  eventType   String
  payload     Json
  responseStatus Int?  // HTTP status from destination
  responseBody String? // Truncated response body
  error       String?
  attemptedAt DateTime @default(now())
  retryCount  Int      @default(0)
  nextRetryAt DateTime?

  // Relations
  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId, attemptedAt])
  @@index([nextRetryAt])
  @@map("webhook_deliveries")
}
```

**Indexes:**
- `[webhookId, attemptedAt]` — delivery history.
- `nextRetryAt` — scheduled retry queries.

---

## 13. integration_secrets

**Purpose:** Encrypted storage for organization-specific configuration (custom RPC endpoints, Ika gRPC credentials, etc.).

```prisma
model IntegrationSecret {
  id             String   @id @default(cuid())
  organizationId String
  key            String   // e.g., "ika_grpc_endpoint"
  value          String   // AES-256-GCM encrypted
  iv             String   // Initialization vector (base64)
  tag            String   // Auth tag (base64)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, key])
  @@map("integration_secrets")
}
```

**Indexes:**
- `[organizationId, key]` (unique) — one secret per key per org.

**Security notes:**
- Encryption key lives in a KMS or environment variable, never in the database.
- Value is encrypted before insert and decrypted on read.

---

## Summary of Relations

```
Organization
├── Membership[] → User
├── Agent[]
│   └── AgentApiKey[]
│   └── SigningRequest[]
├── IkaDwallet[]
│   └── GuardedPolicy[]
│       └── SigningRequest[]
├── SigningRequest[] (via org)
├── AuditEvent[]
├── Webhook[]
│   └── WebhookDelivery[]
└── IntegrationSecret[]
```

---

*Next: [`PRODUCT_API_DESIGN.md`](PRODUCT_API_DESIGN.md)*
