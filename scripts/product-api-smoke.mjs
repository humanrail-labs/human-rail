#!/usr/bin/env node
/**
 * Mandara Product API Smoke Test
 * Verifies the API is running and basic endpoints respond correctly.
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

  // 4. Create org
  const testSlug = `smoke-${Date.now()}`;
  const createOrg = await request("/api/orgs", {
    method: "POST",
    headers: { "x-mandara-dev-user": "smoke@local" },
    body: JSON.stringify({ name: "Smoke Test Org", slug: testSlug }),
  });
  ok(createOrg.status === 201, "POST /api/orgs returns 201");
  ok(createOrg.body?.data?.id, "Created org has an id");
  const orgId = createOrg.body?.data?.id;

  // 5. List orgs
  const listOrgs = await request("/api/orgs", {
    headers: { "x-mandara-dev-user": "smoke@local" },
  });
  ok(listOrgs.status === 200, "GET /api/orgs returns 200");
  ok(Array.isArray(listOrgs.body?.data), "Org list is an array");

  // 6. List audit events
  const auditEvents = await request(`/api/audit-events?orgId=${orgId}`, {
    headers: { "x-mandara-dev-user": "smoke@local" },
  });
  ok(auditEvents.status === 200, "GET /api/audit-events returns 200");
  ok(Array.isArray(auditEvents.body?.data), "Audit events list is an array");
  ok(
    auditEvents.body?.data?.some((e) => e.eventType === "organization_created"),
    "Audit events contain organization_created"
  );

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
