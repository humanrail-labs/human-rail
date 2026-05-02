#!/usr/bin/env node
/**
 * Mandara Worker Smoke Test (P4A)
 * Verifies the worker dry-run processor without long-running worker process.
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
  console.log(`Worker smoke testing Mandara API at ${BASE}\n`);

  const devHeader = { "x-mandara-dev-user": "dev@local" };
  const ts = Date.now();

  // 1. Health
  const health = await request("/health");
  ok(health.status === 200, "GET /health returns 200");

  // 2. Ready
  const ready = await request("/ready");
  ok(ready.status === 200, "GET /ready returns 200");
  if (ready.body?.data?.status !== "ready") {
    console.log("\n⚠️  API is not ready. Skipping worker tests.");
    return;
  }

  // 3. Get or create org
  const orgs = await request("/api/orgs", { headers: devHeader });
  let orgId = orgs.body?.data?.[0]?.id;
  if (!orgId) {
    const createOrg = await request("/api/orgs", {
      method: "POST",
      headers: devHeader,
      body: JSON.stringify({ name: `Worker Smoke Org ${ts}`, slug: `worker-smoke-${ts}` }),
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
      name: `Worker Smoke Agent ${ts}`,
    }),
  });
  ok(agentRes.status === 201, "POST /api/agents creates agent");
  const agentId = agentRes.body?.data?.id;

  // 5. Import wallet
  const walletRes = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Worker Smoke Wallet ${ts}`,
      dwalletPda: `WorkerWalletPDA${ts.toString(36)}`.padEnd(32, "0"),
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
      name: `Worker Smoke Policy ${ts}`,
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

  // 7. Create signing request
  const createRes = await request("/api/signing-requests", {
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
      message: "Worker smoke test request",
    }),
  });
  ok(createRes.status === 201, "POST /api/signing-requests creates allowed request");
  const signingRequest = createRes.body?.data?.signingRequest;
  ok(signingRequest?.status === "requested", "Signing request status is requested");
  const srId = signingRequest.id;

  // 8. Enqueue the signing request
  const enqueueRes = await request(`/api/signing-requests/${srId}/enqueue`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({}),
  });
  ok(enqueueRes.status === 200, "POST /api/signing-requests/:id/enqueue returns 200");
  ok(enqueueRes.body?.data?.job?.id, "Enqueue response includes job id");
  ok(enqueueRes.body?.data?.signingRequest?.status === "queued", "Status becomes queued after enqueue");

  // 9. Run worker processor directly (dry-run mode)
  const { processSigningRequestJob } = await import(
    new URL("../apps/worker/dist/jobs/signingRequestJob.js", import.meta.url)
  );

  const result = await processSigningRequestJob({
    signingRequestId: srId,
    organizationId: orgId,
    requestedBy: "smoke-test",
    mode: "dry-run",
  });

  ok(result.wouldExecute === true, "Dry-run returns wouldExecute=true");
  ok(result.mode === "dry-run", "Dry-run result has mode dry-run");
  ok(Array.isArray(result.nextLiveSteps), "Dry-run result has nextLiveSteps");

  // 10. Verify signing request status after worker processing
  const afterRes = await request(`/api/signing-requests/${srId}`, { headers: devHeader });
  ok(afterRes.status === 200, "GET /api/signing-requests/:id returns 200 after worker");
  const afterSr = afterRes.body?.data;
  ok(afterSr?.status === "requested", "Status returns to requested after dry-run");
  ok(afterSr?.metadata?.workerDryRun === true, "Metadata has workerDryRun=true");

  // 11. Verify execution status endpoint
  const execRes = await request(`/api/signing-requests/${srId}/execution`, { headers: devHeader });
  ok(execRes.status === 200, "GET /api/signing-requests/:id/execution returns 200");
  ok(execRes.body?.data?.signingRequest?.id === srId, "Execution endpoint returns correct signing request");
  ok(Array.isArray(execRes.body?.data?.auditEvents), "Execution endpoint returns audit events");

  const hasQueued = execRes.body?.data?.auditEvents?.some(
    (e) => e.eventType === "signing_request_queued"
  );
  ok(hasQueued, "Audit events include signing_request_queued");

  const hasDryRun = execRes.body?.data?.auditEvents?.some(
    (e) => e.eventType === "signing_request_dry_run_completed"
  );
  ok(hasDryRun, "Audit events include signing_request_dry_run_completed");

  const hasProcessing = execRes.body?.data?.auditEvents?.some(
    (e) => e.eventType === "signing_request_processing"
  );
  ok(hasProcessing, "Audit events include signing_request_processing");

  console.log("\n═══════════════════════════════════════");
  if (process.exitCode) {
    console.log("Worker smoke test completed with failures.");
  } else {
    console.log("All worker smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Worker smoke test error:", err.message);
  process.exit(1);
});
