#!/usr/bin/env node
/**
 * Mandara Product API Smoke Test (P3)
 * Verifies create/preview APIs and DB-backed endpoints.
 */

const BASE = process.env.MANDARA_API_URL ?? "http://localhost:4000";

async function request(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
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
  console.log(`Smoke testing Mandara API at ${BASE}\n`);

  const devHeader = { "x-mandara-dev-user": "dev@local" };
  const ts = Date.now();

  // 1. Health
  const health = await request("/health");
  ok(health.status === 200, "GET /health returns 200");
  ok(health.body?.data?.status === "ok", "Health status is ok");

  // 2. Version
  const version = await request("/version");
  ok(version.status === 200, "GET /version returns 200");
  ok(typeof version.body?.data?.service === "string", "Version has service name");

  // 3. Ready
  const ready = await request("/ready");
  ok(ready.status === 200, "GET /ready returns 200");
  ok(["ready", "degraded"].includes(ready.body?.data?.status), "Ready status is ready or degraded");

  // Only proceed with DB tests if ready
  if (ready.body?.data?.status !== "ready") {
    console.log("\n⚠️  API is not ready (DB may be unavailable). Skipping DB tests.");
    return;
  }

  // 4. Devnet demo status
  const demo = await request("/api/product/devnet-demo", { headers: devHeader });
  ok(demo.status === 200, "GET /api/product/devnet-demo returns 200");

  const hasLifecycle = demo.body?.data?.lifecycleStatus;
  if (hasLifecycle === "imported") {
    ok(demo.body?.data?.signed === true, "Devnet demo is signed");
    ok(demo.body?.data?.messageApproval?.signatureLength === 64, "Signature length is 64");
    ok(demo.body?.data?.messageApproval?.status === "signed", "MessageApproval status is signed");
  } else {
    console.log("\n⚠️  Devnet demo not yet imported. Run: npm run product:import-devnet-artifacts");
  }

  // 5. Orgs
  const orgs = await request("/api/orgs", { headers: devHeader });
  ok(orgs.status === 200, "GET /api/orgs returns 200");
  ok(Array.isArray(orgs.body?.data), "Org list is an array");

  let orgId = orgs.body?.data?.[0]?.id;
  if (!orgId) {
    const createOrg = await request("/api/orgs", {
      method: "POST",
      headers: devHeader,
      body: JSON.stringify({ name: `Smoke Org ${ts}`, slug: `smoke-org-${ts}` }),
    });
    ok(createOrg.status === 201, "POST /api/orgs creates org");
    orgId = createOrg.body?.data?.id;
  }
  ok(orgId, "Have an organization ID");

  // 6. Create agent
  const agentRes = await request("/api/agents", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Smoke Agent ${ts}`,
      description: "Created by smoke test",
    }),
  });
  ok(agentRes.status === 201, "POST /api/agents creates agent");
  ok(agentRes.body?.data?.name === `Smoke Agent ${ts}`, "Agent name matches");
  const agentId = agentRes.body?.data?.id;

  // 7. Import wallet
  const walletRes = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Smoke Wallet ${ts}`,
      dwalletPda: `SmokeWalletPDA${ts.toString(36)}`.padEnd(32, "0"),
      curve: "Secp256k1",
      signingPublicKey: "02".padEnd(66, "0"),
    }),
  });
  ok(walletRes.status === 201, "POST /api/wallets/import imports wallet");
  const walletId = walletRes.body?.data?.id;

  // 8. Create policy
  const policyRes = await request("/api/policies", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      ikaDwalletId: walletId,
      name: `Smoke Policy ${ts}`,
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

  // 9. Preview allowed signing request
  const previewAllowed = await request("/api/signing-requests/preview", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "Smoke test allowed request",
    }),
  });
  ok(previewAllowed.status === 200, "POST /api/signing-requests/preview returns 200");
  ok(previewAllowed.body?.data?.allowed === true, "Preview allowed request is allowed");
  ok(previewAllowed.body?.data?.computed?.assetHash, "Preview has assetHash");
  ok(previewAllowed.body?.data?.computed?.messageDigest, "Preview has messageDigest");

  // 10. Preview rejected signing request (too large)
  const previewRejected = await request("/api/signing-requests/preview", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "99900000000",
      message: "Smoke test rejected request",
    }),
  });
  ok(previewRejected.status === 200, "POST /api/signing-requests/preview (rejected) returns 200");
  ok(previewRejected.body?.data?.allowed === false, "Preview rejected request is not allowed");
  ok(previewRejected.body?.data?.rejectionCode, "Preview rejection has code");

  // 11. Create allowed signing request
  const createAllowed = await request("/api/signing-requests", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "Smoke test create allowed",
    }),
  });
  ok(createAllowed.status === 201, "POST /api/signing-requests creates allowed request");
  ok(createAllowed.body?.data?.signingRequest?.status === "requested", "Allowed request status is requested");
  ok(createAllowed.body?.data?.nextStep, "Allowed request has nextStep");

  // 12. Create rejected signing request with persistIfRejected
  const createRejected = await request("/api/signing-requests", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "99900000000",
      message: "Smoke test create rejected",
      persistIfRejected: true,
    }),
  });
  ok(createRejected.status === 201, "POST /api/signing-requests with persistIfRejected returns 201");
  ok(createRejected.body?.data?.signingRequest?.status === "policy_rejected", "Persisted rejected status is policy_rejected");

  // 13. Create rejected signing request without persistIfRejected
  const createRejectedNoPersist = await request("/api/signing-requests", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "99900000000",
      message: "Smoke test no persist",
    }),
  });
  ok(createRejectedNoPersist.status === 422, "POST /api/signing-requests without persist returns 422");
  ok(createRejectedNoPersist.body?.error?.code === "POLICY_REJECTED", "Rejection has POLICY_REJECTED code");

  // 14. GET lists still work
  const agents = await request("/api/agents", { headers: devHeader });
  ok(agents.status === 200, "GET /api/agents returns 200");
  ok(Array.isArray(agents.body?.data), "Agent list is an array");

  const wallets = await request("/api/wallets", { headers: devHeader });
  ok(wallets.status === 200, "GET /api/wallets returns 200");
  ok(Array.isArray(wallets.body?.data), "Wallet list is an array");

  const policies = await request("/api/policies", { headers: devHeader });
  ok(policies.status === 200, "GET /api/policies returns 200");
  ok(Array.isArray(policies.body?.data), "Policy list is an array");

  const sigReqs = await request("/api/signing-requests", { headers: devHeader });
  ok(sigReqs.status === 200, "GET /api/signing-requests returns 200");
  ok(Array.isArray(sigReqs.body?.data), "Signing request list is an array");

  // 15. Audit events
  const auditEvents = await request("/api/audit-events", { headers: devHeader });
  ok(auditEvents.status === 200, "GET /api/audit-events returns 200");
  ok(Array.isArray(auditEvents.body?.data), "Audit events list is an array");

  const hasAgentCreated = auditEvents.body?.data?.some(
    (e) => e.eventType === "agent_created" && e.resourceId === agentId
  );
  ok(hasAgentCreated, "Audit events include agent_created");

  const hasPolicyCreated = auditEvents.body?.data?.some(
    (e) => e.eventType === "guarded_policy_created" && e.resourceId === policyId
  );
  ok(hasPolicyCreated, "Audit events include guarded_policy_created");

  console.log("\n═══════════════════════════════════════");
  if (process.exitCode) {
    console.log("Smoke test completed with failures.");
  } else {
    console.log("All smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Smoke test error:", err.message);
  process.exit(1);
});
