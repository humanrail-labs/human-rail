# HumanRail / Mandara Security Audit Report

**Date:** 2026-05-04
**Auditor:** Codebase Security Scan
**Scope:** Full monorepo (`apps/api`, `apps/worker`, `packages/*`, frontend `app/`, `components/`, infrastructure)
**Risk Score:** **7.2 / 10** (High — multiple critical vulnerabilities in auth, authorization, and secret handling)

---

## Executive Summary

The HumanRail/Mandara monorepo is a full-stack Solana-integrated AI agent control plane with a Next.js frontend, Fastify API, BullMQ worker, and PostgreSQL/Redis backend. While the codebase shows good hygiene in some areas (Zod input validation, Prisma ORM parameterized queries, structured error handling), it contains **several critical security gaps** that must be addressed before production use:

1. **Broken Access Control (IDOR):** Most list/detail API endpoints return data across all organizations without verifying the caller's membership.
2. **SSRF via Webhooks:** The worker makes HTTP requests to user-controlled webhook URLs with no validation, allowing internal network probing.
3. **Secret Exposure:** A server-side secret is bundled into the frontend via `NEXT_PUBLIC_`, and database-stored webhook secrets are kept in plaintext.
4. **Missing Rate Limiting:** Rate limiting is implemented but completely disabled and never invoked.
5. **Weak Authentication:** The "dev auth" mechanism relies on a forgeable HTTP header with no signature, JWT, or session validation.

**Immediate Action Required:** Fix IDOR scoping, webhook URL validation, and remove `NEXT_PUBLIC_AGENT_SERVER_SECRET` from the client bundle.

---

## 1. Critical Vulnerabilities (Act Now)

### 1.1 SSRF — Webhook Delivery Fetches User-Controlled URLs (CRITICAL)

**File:** `apps/worker/src/services/webhookDelivery.ts`  
**Line:** 56  
**Severity:** 🔴 Critical

The worker calls `fetch(delivery.webhook.url, ...)` where `webhook.url` is fully user-controlled (set via `/api/webhooks` POST/PATCH). There is no validation to block internal addresses.

**Exploit Scenario:**
An attacker creates a webhook with URL `http://169.254.169.254/latest/meta-data/iam/security-credentials/` and triggers a signing request. The worker will POST the signed payload to the AWS metadata endpoint, potentially exfiltrating IAM role credentials.

**Current Code:**
```typescript
// apps/worker/src/services/webhookDelivery.ts:56
const response = await fetch(delivery.webhook.url, {
  method: "POST",
  headers: { /* ... */ },
  body: rawBody,
  signal: controller.signal,
});
```

**Fix:**
```typescript
// apps/worker/src/services/webhookDelivery.ts
import { URL } from "node:url";

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // AWS metadata
];

function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") return false; // enforce HTTPS
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) return false;
    if (hostname.endsWith(".local")) return false;
    if (hostname.endsWith(".internal")) return false;
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

// In processWebhookDeliveryJob, before fetch:
if (!isUrlAllowed(delivery.webhook.url)) {
  logger.warn("Blocked webhook URL", { url: delivery.webhook.url });
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: "failed", error: "URL not allowed" },
  });
  return;
}
```

---

### 1.2 IDOR — List Endpoints Return Data Across All Organizations (CRITICAL)

**Files:**
- `apps/api/src/routes/orgs.ts:19`
- `apps/api/src/routes/agents.ts:38`
- `apps/api/src/routes/signingRequests.ts:44`
- `apps/api/src/routes/policies.ts:35`
- `apps/api/src/routes/wallets.ts:34`
- `apps/api/src/routes/messageApprovals.ts:29`
- `apps/api/src/routes/auditEvents.ts:52`

**Severity:** 🔴 Critical

Multiple `GET` list endpoints accept an optional `orgId` query parameter but do not verify that the requesting dev user is a member of that organization. Omitting `orgId` returns records from **all organizations**.

**Exploit Scenario:**
An authenticated attacker (or anyone who can set `x-mandara-dev-user: any@email.com`) calls `GET /api/agents?limit=100` with no `orgId`. They receive every agent in the database, including names, statuses, and organization IDs — a complete data leak.

**Current Code (orgs.ts):**
```typescript
// apps/api/src/routes/orgs.ts:19
const orgs = await prisma.organization.findMany({
  orderBy: { createdAt: "desc" },
  take: 100,
});
```

**Fix — Add mandatory org scoping:**

1. Update the dev auth plugin to resolve the user's memberships:

```typescript
// apps/api/src/plugins/auth.ts
import { prisma } from "@mandara/db";

fastify.addHook("onRequest", async (request: FastifyRequest) => {
  const header = request.headers["x-mandara-dev-user"];
  const email =
    typeof header === "string" && header.includes("@")
      ? header
      : isDev
        ? "dev@local"
        : undefined;

  if (!email) return;

  const id = `dev_${Buffer.from(email).toString("base64url")}`;
  
  // Resolve memberships so routes can enforce org scoping
  const memberships = await prisma.membership.findMany({
    where: { user: { email } },
    select: { organizationId: true, role: true },
  });
  
  (request as FastifyRequest & { devUser: DevUser }).devUser = {
    email,
    id,
    organizationIds: memberships.map((m) => m.organizationId),
    isAdmin: memberships.some((m) => m.role === "admin"),
  };
});
```

2. Update the `DevUser` interface:
```typescript
export interface DevUser {
  email: string;
  id: string;
  organizationIds: string[];
  isAdmin: boolean;
}
```

3. Update list endpoints to enforce scoping:
```typescript
// apps/api/src/routes/agents.ts:22
fastify.get("/api/agents", async (request, reply) => {
  const user = request.devUser;
  if (!user) {
    return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
  }

  const query = ListAgentsQuery.safeParse(request.query);
  if (!query.success) {
    return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
  }

  const { orgId, status, limit } = query.data;
  
  // Enforce: user can only query orgs they belong to
  const effectiveOrgId = orgId ?? user.organizationIds[0];
  if (!effectiveOrgId || !user.organizationIds.includes(effectiveOrgId)) {
    return reply.status(403).send(errorResponse("FORBIDDEN", "Not a member of this organization"));
  }

  const where: Record<string, unknown> = { organizationId: effectiveOrgId };
  if (status) where.status = status;

  const agents = await prisma.agent.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
  return success(agents);
});
```

Apply the same pattern to `/api/signing-requests`, `/api/policies`, `/api/wallets`, `/api/message-approvals`, `/api/audit-events`, and `/api/orgs` (which should only return orgs the user is a member of).

---

### 1.3 Frontend Secret Exposure — `NEXT_PUBLIC_AGENT_SERVER_SECRET` (CRITICAL)

**File:** `app/vault/agents/[agentId]/chat/page-client.tsx:145`  
**Severity:** 🔴 Critical

The agent chat page embeds `process.env.NEXT_PUBLIC_AGENT_SERVER_SECRET` directly into the client JavaScript bundle. Any user can view the page source or DevTools Network tab to extract this bearer token and call the agent server API directly.

**Current Code:**
```typescript
// app/vault/agents/[agentId]/chat/page-client.tsx:145
headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_AGENT_SERVER_SECRET || ""}`,
},
```

**Fix — Move secret to a server-side API route:**

Create a new Next.js API route that holds the secret server-side:

```typescript
// app/api/agents/[id]/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL;
const AGENT_SERVER_SECRET = process.env.AGENT_SERVER_SECRET; // NO NEXT_PUBLIC_ prefix

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!AGENT_SERVER_URL || !AGENT_SERVER_SECRET) {
    return NextResponse.json({ error: "Agent server not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${AGENT_SERVER_URL}/agents/${id}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_SERVER_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Agent server unreachable" }, { status: 502 });
  }
}
```

Then update the frontend to call your own API route:
```typescript
// app/vault/agents/[agentId]/chat/page-client.tsx:143
const res = await fetch(`/api/agents/${agentId}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text }),
});
```

**Also:** Remove `NEXT_PUBLIC_AGENT_SERVER_SECRET` from `.env.example` and any documentation. Add `AGENT_SERVER_SECRET` (without `NEXT_PUBLIC_`) as a server-side-only env var.

---

### 1.4 Plaintext Secrets in Database (CRITICAL)

**Files:**
- `apps/api/src/routes/webhooks.ts:72` — stores `rawSecret` directly
- `packages/db/prisma/schema.prisma:361` — `Webhook.secret` is plain `String`
- `packages/db/prisma/schema.prisma:403` — `IntegrationSecret.value` claims AES-256-GCM encryption but no encryption logic exists

**Severity:** 🔴 Critical

Webhook secrets are stored in the database as plaintext. If the database is compromised, attackers gain full access to webhook signatures, allowing them to forge webhook payloads to subscribers.

**Current Code:**
```typescript
// apps/api/src/routes/webhooks.ts:67-75
const webhook = await prisma.webhook.create({
  data: {
    organizationId,
    url,
    events,
    secret: rawSecret,  // <-- PLAINTEXT
    status: isActive ? "active" : "paused",
  },
});
```

**Fix — Encrypt at the application layer:**

```typescript
// apps/api/src/lib/encryption.ts
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY = crypto.scryptSync(process.env.MANDARA_ENCRYPTION_PASSWORD || "changeme", "salt", 32);

export function encrypt(plaintext: string): { value: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    value: encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt(value: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let decrypted = decipher.update(value, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

Update webhook creation to use encryption:
```typescript
import { encrypt } from "../lib/encryption.js";

const encrypted = encrypt(rawSecret);
const webhook = await prisma.webhook.create({
  data: {
    organizationId,
    url,
    events,
    secret: encrypted.value,
    iv: encrypted.iv,
    tag: encrypted.tag,
    status: isActive ? "active" : "paused",
  },
});
```

Update Prisma schema to add `iv` and `tag` fields to `Webhook` (they already exist on `IntegrationSecret` but are unused). Then update `signWebhookPayload` and `processWebhookDeliveryJob` to decrypt before signing.

**Critical:** `MANDARA_ENCRYPTION_PASSWORD` must be a strong, randomly generated 32+ character secret stored in the deployment environment, never committed to git.

---

### 1.5 Rate Limiting Completely Disabled (HIGH)

**File:** `apps/api/src/lib/rateLimit.ts:14-18`  
**Severity:** 🔴 High

Rate limiting exists as a module but is `enabled: false` by default and is **never invoked anywhere in the codebase**.

**Impact:**
- Brute-force API key guessing on `/v1/signature-requests`
- Enumeration attacks on `/api/agents`, `/api/signing-requests`
- Webhook delivery abuse

**Current Code:**
```typescript
// apps/api/src/lib/rateLimit.ts:14-18
const defaultConfig: RateLimitConfig = {
  enabled: false,
  windowMs: 60_000,
  maxRequests: 100,
};
```

**Fix — Enable Redis-backed rate limiting:**

```typescript
// apps/api/src/lib/rateLimit.ts
import { Redis } from "ioredis";
import { env } from "../config.js";

const redis = new Redis(env.REDIS_URL);

export async function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / windowMs)}`;
  const current = await redis.incr(windowKey);
  if (current === 1) {
    await redis.pexpire(windowKey, windowMs);
  }
  const allowed = current <= maxRequests;
  const resetAt = Date.now() + windowMs;
  return { allowed, remaining: Math.max(0, maxRequests - current), resetAt };
}
```

Then apply it to sensitive routes:
```typescript
// apps/api/src/routes/v1/signatureRequests.ts (in the route handler)
const { allowed, remaining } = await checkRateLimit(`agent:${request.agentAuth?.apiKeyId ?? request.ip}`, 30, 60_000);
if (!allowed) {
  return reply.status(429).send(errorResponse("RATE_LIMITED", "Too many requests"));
}
```

Also apply stricter limits to auth endpoints and webhook creation.

---

### 1.6 Dev Auth Bypass — Forgeable Header with No Validation (HIGH)

**File:** `apps/api/src/plugins/auth.ts:13-29`  
**Severity:** 🔴 High

The authentication mechanism for dashboard routes relies entirely on the `x-mandara-dev-user` HTTP header. There is no JWT, no signature, no OAuth, no password. In development mode, if the header is missing, it defaults to `dev@local`. In production/staging, anyone who can set this header can impersonate any user.

**Current Code:**
```typescript
// apps/api/src/plugins/auth.ts:13-28
fastify.addHook("onRequest", async (request: FastifyRequest) => {
  const header = request.headers["x-mandara-dev-user"];
  const email =
    typeof header === "string" && header.includes("@")
      ? header
      : isDev
        ? "dev@local"
        : undefined;

  if (!email) return;

  const id = `dev_${Buffer.from(email).toString("base64url")}`;
  (request as FastifyRequest & { devUser: DevUser }).devUser = { email, id };
});
```

**Fix — Implement proper authentication:**

For a production-ready system, replace this with one of:
1. **Wallet-signed message auth** (most aligned with Solana ethos): User signs a nonce with their Solana wallet; API verifies the signature on-chain.
2. **JWT + OAuth2** (e.g., Auth0, Clerk, or Supabase Auth) with short-lived access tokens and refresh tokens.
3. **API key + HMAC** for service-to-service calls.

At minimum, if keeping the header approach temporarily:
```typescript
// Add a shared secret that must accompany the dev-user header
const DEV_AUTH_SECRET = env.MANDARA_DEV_AUTH_SECRET; // strong random string

fastify.addHook("onRequest", async (request: FastifyRequest) => {
  const header = request.headers["x-mandara-dev-user"];
  const secret = request.headers["x-mandara-dev-secret"];
  
  if (!header || typeof header !== "string" || !header.includes("@")) {
    if (isDev) {
      (request as FastifyRequest & { devUser: DevUser }).devUser = {
        email: "dev@local",
        id: "dev_devlocal",
      };
    }
    return;
  }

  // In non-dev, require a shared secret
  if (!isDev && secret !== DEV_AUTH_SECRET) {
    return;
  }

  const id = `dev_${Buffer.from(header).toString("base64url")}`;
  (request as FastifyRequest & { devUser: DevUser }).devUser = { email: header, id };
});
```

**Note:** This is still a temporary measure. A proper auth system (wallet-signed messages or OAuth) must be implemented before any real user data is stored.

---

### 1.7 Default Database Credentials Committed to Repository (HIGH)

**File:** `.env.product`  
**Severity:** 🔴 High

The `.env.product` file contains default database credentials (`postgresql://mandara:mandara@localhost:5432/mandara_dev`) and is **not gitignored**. While `.env.local` is ignored, `.env.product` is not.

**Fix:**
1. Immediately rotate the password if this was ever used in any deployed environment.
2. Add `.env.product` to `.gitignore`:
```gitignore
# .gitignore
.env.product
.env.*
!.env.example
!.env.product.example
```
3. Remove the file from git history:
```bash
git rm --cached .env.product
git commit -m "remove committed env file"
git push origin main
```
4. Use `.env.product.example` as a template with placeholder values.

---

## 2. High Severity Issues

### 2.1 Weak API Key Hashing (SHA-256)

**File:** `apps/api/src/lib/apiKeys.ts:39-41`  
**Severity:** 🟠 High

Agent API keys are hashed with SHA-256, a fast general-purpose hash. While API keys are high-entropy (40 bytes random), SHA-256 is still orders of magnitude faster than bcrypt/Argon2 for brute-force attacks.

**Current Code:**
```typescript
export function hashAgentApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}
```

**Fix:**
```typescript
import crypto from "node:crypto";

const PEPPER = process.env.MANDARA_API_KEY_PEPPER || "";

export function hashAgentApiKey(rawKey: string): string {
  // HMAC-SHA256 with a server-side pepper adds brute-force resistance
  // without the storage overhead of bcrypt salts
  return crypto.createHmac("sha256", PEPPER).update(rawKey).digest("hex");
}
```

**Note:** After changing the hash function, all existing API keys will be invalidated. This is acceptable for a pre-production system. For production migration, maintain both hash types during a transition period.

---

### 2.2 Worker Trusts Queue Data Without Organization Verification

**File:** `apps/worker/src/jobs/signingRequestJob.ts:14-27`  
**Severity:** 🟠 High

The worker loads `signingRequest` by `id` only. The `organizationId` passed in `job.data` is never validated against the signing request's actual `organizationId`. If an attacker injects a job into the Redis queue with a different `organizationId`, audit events will be recorded for the wrong org.

**Fix:**
```typescript
// In processSigningRequestJob and processWebhookDeliveryJob
const signingRequest = await prisma.signingRequest.findUnique({
  where: { id: signingRequestId },
});

if (!signingRequest) {
  throw new Error(`Signing request ${signingRequestId} not found`);
}

if (signingRequest.organizationId !== organizationId) {
  logger.warn("Organization mismatch in job data", { expected: signingRequest.organizationId, got: organizationId });
  throw new Error("Organization mismatch");
}
```

---

### 2.3 Unauthenticated Redis in Docker Compose

**File:** `docker-compose.yml:22-34`  
**Severity:** 🟠 High

Redis is exposed on `0.0.0.0:6379` with no `requirepass` and no ACL. Anyone with network access can read queue payloads, inject fake jobs, or delete queues.

**Fix:**
```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD:-changeme}
  ports:
    - "127.0.0.1:6379:6379"  # Bind to localhost only in dev
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
```

In production (Render/Upstash), ensure Redis uses TLS and AUTH.

---

### 2.4 CORS `credentials: true` with Environment-Controlled Origin

**File:** `apps/api/src/server.ts:28-32`  
**Severity:** 🟠 High

```typescript
await fastify.register(import("@fastify/cors"), {
  origin: env.MANDARA_CORS_ORIGIN,
  credentials: true,
});
```

If `MANDARA_CORS_ORIGIN` is ever set to `*` or reflects the `Origin` header, `credentials: true` will allow cross-origin authenticated requests from any domain.

**Fix:**
```typescript
const allowedOrigins = env.MANDARA_CORS_ORIGIN
  ? env.MANDARA_CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

await fastify.register(import("@fastify/cors"), {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
});
```

Also validate at startup that `MANDARA_CORS_ORIGIN` does not contain `*`.

---

## 3. Medium Severity Issues

### 3.1 CSV Formula Injection

**File:** `apps/api/src/routes/auditEvents.ts:17-31`  
**Severity:** 🟡 Medium

The CSV export only escapes double quotes but does not sanitize formula injection characters (`=`, `+`, `-`, `@`, `\t`). Opening a malicious CSV in Excel could execute arbitrary commands.

**Fix:**
```typescript
function sanitizeCsvValue(value: string): string {
  const dangerous = /^[=+\-@\t\r]/;
  let sanitized = value.replace(/"/g, '""');
  if (dangerous.test(sanitized)) {
    sanitized = "'" + sanitized; // Prepend apostrophe to neutralize formulas
  }
  return `"${sanitized}"`;
}

function rowToCsv(row: Record<string, unknown>): string {
  const values = [
    String(row.id ?? ""),
    String(row.createdAt ?? ""),
    // ...
  ];
  return values.map((v) => sanitizeCsvValue(v)).join(",");
}
```

---

### 3.2 Idempotency Key Not Enforced

**File:** `apps/api/src/routes/v1/signatureRequests.ts`  
**Severity:** 🟡 Medium

The `idempotencyKey` field is stored in metadata but never checked for duplicates. An attacker can replay the same request multiple times, creating duplicate signing requests.

**Fix:** Store idempotency keys in Redis or a dedicated DB table with a TTL:
```typescript
// Before creating a signing request
if (idempotencyKey) {
  const existing = await redis.get(`idempotency:${idempotencyKey}`);
  if (existing) {
    return reply.status(409).send(errorResponse("CONFLICT", "Duplicate request"));
  }
  await redis.setex(`idempotency:${idempotencyKey}`, 86400, "1"); // 24h TTL
}
```

---

### 3.3 No Request Body Size Limits

**File:** `apps/api/src/server.ts:22`  
**Severity:** 🟡 Medium

Fastify is instantiated with no `bodyLimit`, allowing attackers to upload massive JSON payloads, causing memory exhaustion.

**Fix:**
```typescript
const fastify = Fastify({
  logger: { level: env.MANDARA_ENV === "development" ? "debug" : "info" },
  bodyLimit: 1024 * 1024, // 1 MB
});
```

---

### 3.4 Missing Security Headers on API

**File:** `apps/api/src/server.ts`  
**Severity:** 🟡 Medium

The API server does not set HSTS, CSP, X-Frame-Options, or X-Content-Type-Options. While the frontend middleware sets these, the API responses do not.

**Fix:**
```typescript
await fastify.register(import("@fastify/helmet"), {
  contentSecurityPolicy: false, // API doesn't serve HTML
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
});
```

---

## 4. Low Severity Issues & Code Smells

### 4.1 Information Disclosure on `/version`

**File:** `apps/api/src/routes/health.ts:52-62`  
**Severity:** 🟢 Low

The `/version` endpoint exposes program IDs, git commit hash, and version number. While not directly exploitable, this aids reconnaissance.

**Fix:** Move version details behind authentication or remove the endpoint from public access.

### 4.2 Missing Uniqueness Constraint on `AgentApiKey.prefix`

**File:** `packages/db/prisma/schema.prisma:187`  
**Severity:** 🟢 Low

`prefix` only has `@@index([prefix])`, not `@unique`. If two keys share a prefix (unlikely but possible with 8 random bytes), `findFirst` in `agentAuth.ts:46` may match the wrong key.

**Fix:** Add `@unique` to the `prefix` field or query by `agentId` as well.

### 4.3 No Database Migrations

**File:** `packages/db/prisma/`  
**Severity:** 🟢 Low

No `migrations/` folder exists. Production deployments rely on `prisma db push`, which can drop columns and lose data without history.

**Fix:** Run `prisma migrate dev` to create the initial migration, then use `prisma migrate deploy` in production.

### 4.4 `.local-ika/` Not Gitignored

**File:** `.gitignore`  
**Severity:** 🟢 Low

`.local-ika/` contains blockchain artifacts (`dwallet.json`, `signing-request.json`) and is not in `.gitignore`.

**Fix:** Add `.local-ika/` to `.gitignore`.

---

## 5. Dependencies Audit

| Package | Version | CVE Status | Note |
|---------|---------|-----------|------|
| `next` | ^16.1.6 | No known critical CVEs | Latest stable |
| `fastify` | ^5.2.0 | No known critical CVEs | Latest stable |
| `@fastify/cors` | ^10.0.0 | No known critical CVEs | Latest stable |
| `prisma` | ^6.0.0 | No known critical CVEs | Latest stable |
| `@solana/web3.js` | ^1.98.4 | No known critical CVEs | Monitor for supply-chain |
| `bullmq` | ^5.0.0 | No known critical CVEs | Latest stable |
| `ioredis` | ^5.4.0 | No known critical CVEs | Latest stable |
| `zod` | ^3.25.0 | No known critical CVEs | Latest stable |
| `ws` | ^8.18.0 | CVE-2024-37890 (fixed in 8.17.1) | ✅ Patched |
| `openai` | ^4.77.0 | No known critical CVEs | Monitor for key leaks |
| `@anthropic-ai/sdk` | ^0.39.0 | No known critical CVEs | Monitor for key leaks |

**No critical dependency CVEs found.** All major packages are on recent stable versions.

---

## 6. Architecture & Code Quality Observations

### Positive Patterns
- ✅ **Zod validation** on all POST/PUT request bodies
- ✅ **Prisma ORM** with parameterized queries (no SQL injection)
- ✅ **Structured audit logging** via `recordAuditEvent`
- ✅ **Global error handler** suppresses 500 stack traces in production
- ✅ **Solana RPC proxy** (`/api/rpc`) keeps private RPC keys server-side
- ✅ **Webhook payload signing** with HMAC-SHA256
- ✅ **Timing-safe comparison** for API key verification (`crypto.timingSafeEqual`)

### Anti-Patterns
- ❌ **No separation of auth mechanisms** — dev user auth and agent API key auth are completely different but coexist without clear boundaries
- ❌ **Fire-and-forget DB updates** — `lastUsedAt` updates in `agentAuth.ts` are unawaited with swallowed errors
- ❌ **Monolithic route files** — Some route files are 400+ lines; consider splitting into service layers
- ❌ **In-memory rate limiting** — The existing implementation would not work across multiple API instances (no Redis backend)

---

## 7. Next Steps (Recommended Roadmap)

### Phase 1 — Immediate (This Week)
1. **Fix IDOR scoping** on all list/detail endpoints (Section 1.2)
2. **Add webhook URL validation** to block SSRF (Section 1.1)
3. **Remove `NEXT_PUBLIC_AGENT_SERVER_SECRET`** from frontend (Section 1.3)
4. **Rotate and encrypt webhook secrets** (Section 1.4)
5. **Add `.env.product` to `.gitignore`** and rotate exposed credentials (Section 1.7)

### Phase 2 — Short Term (Next 2 Weeks)
6. **Implement proper authentication** (wallet-signed messages or OAuth) to replace `x-mandara-dev-user` (Section 1.6)
7. **Enable Redis-backed rate limiting** on all external-facing routes (Section 1.5)
8. **Harden Redis** with AUTH and TLS (Section 2.3)
9. **Add request body limits** and helmet security headers (Section 3.3, 3.4)
10. **Fix CSV formula injection** (Section 3.1)

### Phase 3 — Medium Term (Next Month)
11. **Implement idempotency key enforcement** (Section 3.2)
12. **Add database migrations** and remove `prisma db push` from production
13. **Strengthen API key hashing** with HMAC + pepper (Section 2.1)
14. **Add organization validation in worker jobs** (Section 2.2)
15. **Implement PostgreSQL Row-Level Security (RLS)** as a defense-in-depth layer

### Phase 4 — Long Term
16. **Security monitoring** — Add alerting for suspicious patterns (unusual API key usage, failed auth spikes, webhook URL changes to internal IPs)
17. **Penetration testing** — Engage a third-party security firm for a full black-box assessment before mainnet launch
18. **Bug bounty program** — Consider launching a bug bounty for the smart contract layer

---

*End of Report*
