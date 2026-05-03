#!/usr/bin/env node
/**
 * Mandara Agent API Smoke Test (P6)
 * Verifies external /v1 endpoints authenticated by Bearer agent API key.
 */

const BASE = process.env.MANDARA_API_URL ?? "http://localhost:4000";
const ENQUEUE_TEST = process.env.PRODUCT_AGENT_API_SMOKE_ENQUEUE === "true";

async function request(path, opts = {}) {
  const url = `${BASE}${path}`;
  const hasBody = opts.body !== undefined;
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function ok(assertion, message) {
  if (!assertion) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  return true;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Mandara Agent API Smoke Test (P6)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const devHeader = { "x-mandara-dev-user": "dev@local" };
  const ts = Date.now();

  // 1. Health
  const health = await request("/health");
  ok(health.status === 200, "GET /health returns 200");

  // 2. Ready
  const ready = await request("/ready");
  ok(ready.status === 200, "GET /ready returns 200");
  if (ready.body?.data?.status !== "ready") {
    console.log("\n⚠️  API is not ready. Skipping DB tests.");
    return;
  }

  // 3. Find or create org
  const orgs = await request("/api/orgs", { headers: devHeader });
  ok(orgs.status === 200, "GET /api/orgs returns 200");

  let orgId = orgs.body?.data?.[0]?.id;
  if (!orgId) {
    const createOrg = await request("/api/orgs", {
      method: "POST",
      headers: devHeader,
      body: JSON.stringify({ name: `AgentAPI Org ${ts}`, slug: `agent-api-org-${ts}` }),
    });
    ok(createOrg.status === 201, "POST /api/orgs creates org");
    orgId = createOrg.body?.data?.id;
  }
  ok(orgId, "Have an organization ID");

  // 4. Create agent
  const agentRes = await request("/api/agents", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `AgentAPI Agent ${ts}`,
      description: "Created by agent API smoke test",
    }),
  });
  ok(agentRes.status === 201, "POST /api/agents creates agent");
  const agentId = agentRes.body?.data?.id;
  ok(agentId, "Have an agent ID");

  // 5. Import wallet
  const walletRes = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `AgentAPI Wallet ${ts}`,
      dwalletPda: `AgentAPIWallet${ts.toString(36)}`.padEnd(32, "0"),
      curve: "Secp256k1",
      signingPublicKey: "02".padEnd(66, "0"),
    }),
  });
  ok(walletRes.status === 201, "POST /api/wallets/import imports wallet");
  const walletId = walletRes.body?.data?.id;

  // 6. Create policy
  const policyRes = await request("/api/policies", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      ikaDwalletId: walletId,
      name: `AgentAPI Policy ${ts}`,
      chainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      perTxLimit: "100000000",
      dailyLimit: "500000000",
      totalLimit: "1000000000",
    }),
  });
  ok(policyRes.status === 201, "POST /api/policies creates policy");
  const policyId = policyRes.body?.data?.id;

  // 7. Create API key
  const keyRes = await request(`/api/agents/${agentId}/api-keys`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ name: `AgentAPI Key ${ts}` }),
  });
  ok(keyRes.status === 201, "POST /api/agents/:id/api-keys creates key");
  ok(keyRes.body?.data?.rawKey, "Created key returns rawKey");
  ok(keyRes.body?.data?.prefix, "Created key returns prefix");
  const rawKey = keyRes.body?.data?.rawKey;
  const keyId = keyRes.body?.data?.id;

  const bearerHeaders = {
    Authorization: `Bearer ${rawKey}`,
    "Content-Type": "application/json",
  };

  // 8. GET /v1/agent/status
  const statusRes = await request("/v1/agent/status", { headers: bearerHeaders });
  ok(statusRes.status === 200, "GET /v1/agent/status returns 200");
  ok(statusRes.body?.data?.agent?.id === agentId, "Status returns correct agent");
  ok(typeof statusRes.body?.data?.activePolicies === "number", "Status returns activePolicies count");

  // 9. POST /v1/signature-requests/preview allowed
  const previewAllowed = await request("/v1/signature-requests/preview", {
    method: "POST",
    headers: bearerHeaders,
    body: JSON.stringify({
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "Agent API smoke test allowed",
      policyId,
    }),
  });
  ok(previewAllowed.status === 200, "POST /v1/signature-requests/preview (allowed) returns 200");
  ok(previewAllowed.body?.data?.policyDecision?.allowed === true, "Preview allowed is allowed");
  ok(previewAllowed.body?.data?.messageDigest, "Preview returns messageDigest");

  // 10. POST /v1/signature-requests/preview rejected
  const previewRejected = await request("/v1/signature-requests/preview", {
    method: "POST",
    headers: bearerHeaders,
    body: JSON.stringify({
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "99900000000",
      message: "Agent API smoke test rejected",
      policyId,
    }),
  });
  ok(previewRejected.status === 200, "POST /v1/signature-requests/preview (rejected) returns 200");
  ok(previewRejected.body?.data?.policyDecision?.allowed === false, "Preview rejected is not allowed");

  // 11. POST /v1/signature-requests allowed with enqueue=false
  const createAllowed = await request("/v1/signature-requests", {
    method: "POST",
    headers: bearerHeaders,
    body: JSON.stringify({
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "Agent API smoke test create",
      policyId,
      enqueue: false,
    }),
  });
  ok(createAllowed.status === 201, "POST /v1/signature-requests creates allowed request");
  ok(createAllowed.body?.data?.status === "requested", "Created request status is requested");
  ok(createAllowed.body?.data?.signingRequest?.id, "Created request has id");
  const createdId = createAllowed.body?.data?.signingRequest?.id;

  // 12. GET /v1/signature-requests/:id
  const getReq = await request(`/v1/signature-requests/${createdId}`, { headers: bearerHeaders });
  ok(getReq.status === 200, "GET /v1/signature-requests/:id returns 200");
  ok(getReq.body?.data?.id === createdId, "Get returns correct request");
  ok(getReq.body?.data?.status === "requested", "Get returns correct status");

  // 13. POST /v1/signature-requests rejected (no persist)
  const createRejected = await request("/v1/signature-requests", {
    method: "POST",
    headers: bearerHeaders,
    body: JSON.stringify({
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "99900000000",
      message: "Agent API smoke test rejected create",
      policyId,
    }),
  });
  ok(createRejected.status === 422, "POST /v1/signature-requests rejected returns 422");
  ok(createRejected.body?.error?.code === "POLICY_REJECTED", "Rejection has POLICY_REJECTED code");

  // 14. Optional enqueue test
  if (ENQUEUE_TEST) {
    const createQueued = await request("/v1/signature-requests", {
      method: "POST",
      headers: bearerHeaders,
      body: JSON.stringify({
        destinationChainId: 84532,
        asset: "USDC:BASE_SEPOLIA",
        recipient: "0x1111111111111111111111111111111111111111",
        amount: "42000000",
        message: "Agent API smoke test enqueue",
        policyId,
        enqueue: true,
      }),
    });
    ok(createQueued.status === 201, "POST /v1/signature-requests with enqueue=true returns 201");
    ok(createQueued.body?.data?.status === "queued", "Enqueued request status is queued");
    ok(createQueued.body?.data?.execution?.jobId, "Enqueued request has jobId");
  }

  // 15. Revoke API key
  const revokeRes = await request(`/api/agents/${agentId}/api-keys/${keyId}`, {
    method: "DELETE",
    headers: devHeader,
  });
  ok(revokeRes.status === 200, "DELETE /api/agents/:id/api-keys/:keyId returns 200");
  ok(revokeRes.body?.data?.revokedAt, "Revoked key has revokedAt");

  // 16. Verify revoked key fails
  const revokedStatus = await request("/v1/agent/status", { headers: bearerHeaders });
  ok(revokedStatus.status === 401, "Revoked key returns 401");
  ok(revokedStatus.body?.error?.code === "UNAUTHORIZED", "Revoked key has UNAUTHORIZED code");

  console.log("\n═══════════════════════════════════════════════════════════");
  if (process.exitCode) {
    console.log("Agent API smoke test completed with failures.");
  } else {
    console.log("All agent API smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Agent API smoke test error:", err.message);
  process.exit(1);
});
