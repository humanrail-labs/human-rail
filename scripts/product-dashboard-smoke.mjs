#!/usr/bin/env node
/**
 * Mandara Product Dashboard Smoke Test (P5)
 *
 * Verifies the exact API calls the dashboard uses.
 * Does NOT require a browser.
 *
 * Prerequisites:
 *   - API running at http://localhost:4000
 *   - Postgres seeded with devnet artifacts
 *
 * Usage:
 *   node scripts/product-dashboard-smoke.mjs
 *
 * To also test enqueue:
 *   PRODUCT_DASHBOARD_SMOKE_ENQUEUE=true node scripts/product-dashboard-smoke.mjs
 */

const BASE = process.env.MANDARA_API_URL || "http://localhost:4000";
const DEV_USER = process.env.NEXT_PUBLIC_MANDARA_DEV_USER || "dev@local";
const SHOULD_ENQUEUE = process.env.PRODUCT_DASHBOARD_SMOKE_ENQUEUE === "true";

async function request(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-mandara-dev-user": DEV_USER,
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
  console.log("  Mandara Product Dashboard Smoke Test (P5)");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Devnet demo
  const demo = await request("/api/product/devnet-demo");
  ok(demo.status === 200, "GET /api/product/devnet-demo returns 200");
  ok(demo.body?.data?.lifecycleStatus, "devnet-demo has lifecycleStatus");
  ok(typeof demo.body?.data?.signed === "boolean", "devnet-demo has signed boolean");

  const orgId = demo.body?.data?.organization?.id;
  ok(orgId, "devnet-demo has organization id");

  // 2. Agents
  const agents = await request("/api/agents");
  ok(agents.status === 200, "GET /api/agents returns 200");
  ok(Array.isArray(agents.body?.data), "agents returns array");
  const agentId = agents.body?.data?.[0]?.id;
  ok(agentId, "has at least one agent");

  // 3. Wallets
  const wallets = await request("/api/wallets");
  ok(wallets.status === 200, "GET /api/wallets returns 200");
  ok(Array.isArray(wallets.body?.data), "wallets returns array");
  const walletId = wallets.body?.data?.[0]?.id;
  ok(walletId, "has at least one wallet");

  // 4. Policies
  const policies = await request("/api/policies");
  ok(policies.status === 200, "GET /api/policies returns 200");
  ok(Array.isArray(policies.body?.data), "policies returns array");
  const policyId = policies.body?.data?.[0]?.id;
  ok(policyId, "has at least one policy");

  // 5. Signing requests
  const srs = await request("/api/signing-requests");
  ok(srs.status === 200, "GET /api/signing-requests returns 200");
  ok(Array.isArray(srs.body?.data), "signing-requests returns array");

  // 6. Message approvals
  const mas = await request("/api/message-approvals");
  ok(mas.status === 200, "GET /api/message-approvals returns 200");
  ok(Array.isArray(mas.body?.data), "message-approvals returns array");

  // 7. Audit events
  const audit = await request("/api/audit-events?limit=10");
  ok(audit.status === 200, "GET /api/audit-events returns 200");
  ok(Array.isArray(audit.body?.data), "audit-events returns array");

  // 8. Preview signing request
  const preview = await request("/api/signing-requests/preview", {
    method: "POST",
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "1000000",
      message: "Dashboard smoke test preview",
    }),
  });
  ok(preview.status === 200, "POST /api/signing-requests/preview returns 200");
  ok(preview.body?.data?.allowed === true, "preview is allowed");
  ok(preview.body?.data?.computed?.assetHash, "preview has computed assetHash");

  // 9. Create signing request
  const create = await request("/api/signing-requests", {
    method: "POST",
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      policyId,
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "1000000",
      message: "Dashboard smoke test create",
    }),
  });
  ok(create.status === 201, "POST /api/signing-requests returns 201");
  ok(create.body?.data?.signingRequest?.id, "create returns signingRequest id");
  ok(create.body?.data?.signingRequest?.status === "requested", "create status is requested");
  const createdId = create.body?.data?.signingRequest?.id;

  // 10. Enqueue (optional)
  if (SHOULD_ENQUEUE) {
    const enqueue = await request(`/api/signing-requests/${createdId}/enqueue`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    ok(enqueue.status === 200, "POST /api/signing-requests/:id/enqueue returns 200");
    ok(enqueue.body?.data?.signingRequest?.status === "queued", "enqueue status is queued");
    ok(enqueue.body?.data?.job?.id, "enqueue returns job id");
  } else {
    console.log("⚠️  Skipping enqueue test. Set PRODUCT_DASHBOARD_SMOKE_ENQUEUE=true to test.");
  }

  // 11. Execution endpoint
  const exec = await request(`/api/signing-requests/${createdId}/execution`);
  ok(exec.status === 200, "GET /api/signing-requests/:id/execution returns 200");
  ok(exec.body?.data?.signingRequest?.id === createdId, "execution returns correct signing request");
  ok(Array.isArray(exec.body?.data?.auditEvents), "execution returns audit events");

  console.log("\n═══════════════════════════════════════════════════════════");
  if (process.exitCode) {
    console.log("Dashboard smoke test completed with failures.");
  } else {
    console.log("All dashboard smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Dashboard smoke test error:", err.message);
  process.exit(1);
});
