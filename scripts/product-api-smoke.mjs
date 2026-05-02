#!/usr/bin/env node
/**
 * Mandara Product API Smoke Test (P2)
 * Verifies the API is running and DB-backed endpoints respond correctly.
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

  const devHeader = { "x-mandara-dev-user": "smoke@local" };

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

  // 6. Agents
  const agents = await request("/api/agents", { headers: devHeader });
  ok(agents.status === 200, "GET /api/agents returns 200");
  ok(Array.isArray(agents.body?.data), "Agent list is an array");

  // 7. Wallets
  const wallets = await request("/api/wallets", { headers: devHeader });
  ok(wallets.status === 200, "GET /api/wallets returns 200");
  ok(Array.isArray(wallets.body?.data), "Wallet list is an array");

  // 8. Policies
  const policies = await request("/api/policies", { headers: devHeader });
  ok(policies.status === 200, "GET /api/policies returns 200");
  ok(Array.isArray(policies.body?.data), "Policy list is an array");

  // 9. Signing requests
  const sigReqs = await request("/api/signing-requests", { headers: devHeader });
  ok(sigReqs.status === 200, "GET /api/signing-requests returns 200");
  ok(Array.isArray(sigReqs.body?.data), "Signing request list is an array");

  // 10. Message approvals
  const msgApprovals = await request("/api/message-approvals", { headers: devHeader });
  ok(msgApprovals.status === 200, "GET /api/message-approvals returns 200");
  ok(Array.isArray(msgApprovals.body?.data), "Message approval list is an array");

  // 11. Audit events
  const auditEvents = await request("/api/audit-events", { headers: devHeader });
  ok(auditEvents.status === 200, "GET /api/audit-events returns 200");
  ok(Array.isArray(auditEvents.body?.data), "Audit events list is an array");

  // 12. Signing request detail (if any exist)
  if (sigReqs.body?.data?.length > 0) {
    const firstId = sigReqs.body.data[0].id;
    const detail = await request(`/api/signing-requests/${firstId}`, { headers: devHeader });
    ok(detail.status === 200, "GET /api/signing-requests/:id returns 200");
    ok(detail.body?.data?.id === firstId, "Signing request detail matches ID");
  }

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
