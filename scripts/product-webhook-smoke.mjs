#!/usr/bin/env node
/**
 * Mandara Webhook + Audit Export Smoke Test (P8)
 *
 * Spins up a local HTTP server to receive webhooks, creates a webhook
 * pointing to it, triggers signing request lifecycle events, and verifies
 * delivery. Also tests audit export JSON/CSV endpoints.
 */

import http from "node:http";

const BASE = process.env.MANDARA_API_URL ?? "http://localhost:4000";

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
  const contentType = res.headers.get("content-type") || "";
  let body;
  if (contentType.includes("text/csv")) {
    body = await res.text();
  } else {
    body = await res.json().catch(() => ({}));
  }
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
  console.log("  Mandara Webhook + Audit Export Smoke Test (P8)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const devHeader = { "x-mandara-dev-user": "dev@local" };
  const ts = Date.now();

  // 1. Health
  const health = await request("/health");
  ok(health.status === 200, "GET /health returns 200");

  const ready = await request("/ready");
  ok(ready.status === 200, "GET /ready returns 200");
  if (ready.body?.data?.status !== "ready") {
    console.log("\n⚠️  API is not ready. Skipping DB tests.");
    return;
  }

  // 2. Start local webhook receiver
  const receivedEvents = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      receivedEvents.push({
        headers: {
          event: req.headers["x-mandara-event"],
          delivery: req.headers["x-mandara-delivery"],
          signature: req.headers["x-mandara-signature"],
          timestamp: req.headers["x-mandara-timestamp"],
        },
        body: body ? JSON.parse(body) : null,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const webhookUrl = `http://127.0.0.1:${port}/webhook`;
  console.log(`Local webhook receiver listening on ${webhookUrl}\n`);

  // 3. Find or create org
  const orgs = await request("/api/orgs", { headers: devHeader });
  let orgId = orgs.body?.data?.[0]?.id;
  if (!orgId) {
    const createOrg = await request("/api/orgs", {
      method: "POST",
      headers: devHeader,
      body: JSON.stringify({ name: `Webhook Org ${ts}`, slug: `webhook-org-${ts}` }),
    });
    orgId = createOrg.body?.data?.id;
  }
  ok(orgId, "Have an organization ID");

  // 4. Create webhook
  const webhookRes = await request("/api/webhooks", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      url: webhookUrl,
      events: ["signature.requested", "signature.queued"],
    }),
  });
  ok(webhookRes.status === 201, "POST /api/webhooks creates webhook");
  ok(webhookRes.body?.data?.secret, "Created webhook returns secret");
  const webhookId = webhookRes.body?.data?.id;

  // 5. Create agent, wallet, policy
  const agentRes = await request("/api/agents", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Webhook Agent ${ts}`,
      description: "Created by webhook smoke test",
    }),
  });
  const agentId = agentRes.body?.data?.id;

  const walletRes = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Webhook Wallet ${ts}`,
      dwalletPda: `WebhookWallet${ts.toString(36)}`.padEnd(32, "0"),
      curve: "Secp256k1",
      signingPublicKey: "02".padEnd(66, "0"),
    }),
  });
  const walletId = walletRes.body?.data?.id;

  const policyRes = await request("/api/policies", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      ikaDwalletId: walletId,
      name: `Webhook Policy ${ts}`,
      chainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      perTxLimit: "100000000",
      dailyLimit: "500000000",
      totalLimit: "1000000000",
    }),
  });
  const policyId = policyRes.body?.data?.id;

  // 6. Create signing request (triggers signature.requested webhook)
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
      message: `Webhook smoke test ${ts}`,
    }),
  });
  ok(createRes.status === 201, "POST /api/signing-requests creates request");
  const sigReqId = createRes.body?.data?.signingRequest?.id;

  // 7. Enqueue signing request (triggers signature.queued webhook)
  const enqueueRes = await request(`/api/signing-requests/${sigReqId}/enqueue`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({}),
  });
  ok(enqueueRes.status === 200, "POST /api/signing-requests/:id/enqueue returns 200");

  // Wait a moment for webhooks to be delivered
  await new Promise((r) => setTimeout(r, 3000));

  // 8. Assert webhooks received
  ok(receivedEvents.length >= 1, `Local server received at least 1 webhook (got ${receivedEvents.length})`);

  const requestedEvent = receivedEvents.find((e) => e.headers.event === "signature.requested");
  ok(requestedEvent, "Received signature.requested webhook");
  ok(requestedEvent.body?.type === "signature.requested", "Webhook payload has correct type");
  ok(requestedEvent.body?.data?.signingRequestId, "Webhook payload has signingRequestId");
  ok(requestedEvent.headers.signature?.startsWith("sha256="), "Webhook has X-Mandara-Signature header");
  ok(requestedEvent.headers.timestamp, "Webhook has X-Mandara-Timestamp header");
  ok(requestedEvent.headers.delivery, "Webhook has X-Mandara-Delivery header");

  const queuedEvent = receivedEvents.find((e) => e.headers.event === "signature.queued");
  ok(queuedEvent, "Received signature.queued webhook");

  // 9. Verify webhook deliveries in DB
  const webhookDetail = await request(`/api/webhooks/${webhookId}`, { headers: devHeader });
  ok(webhookDetail.status === 200, "GET /api/webhooks/:id returns 200");
  ok(Array.isArray(webhookDetail.body?.data?.deliveries), "Webhook detail includes deliveries");

  const deliveredCount = webhookDetail.body?.data?.deliveries?.filter(
    (d) => d.status === "delivered"
  ).length ?? 0;
  ok(deliveredCount >= 1, `At least one delivery marked delivered (got ${deliveredCount})`);

  // 10. Audit export JSON
  const exportJson = await request(`/api/audit-events/export?format=json&limit=10`, {
    headers: devHeader,
  });
  ok(exportJson.status === 200, "GET /api/audit-events/export?format=json returns 200");
  ok(Array.isArray(exportJson.body?.data?.events), "JSON export returns events array");
  ok(exportJson.body?.data?.meta?.count > 0, "JSON export has count > 0");

  // 11. Audit export CSV
  const exportCsv = await request(`/api/audit-events/export?format=csv&limit=10`, {
    headers: devHeader,
  });
  ok(exportCsv.status === 200, "GET /api/audit-events/export?format=csv returns 200");
  ok(typeof exportCsv.body === "string" && exportCsv.body.includes("id,createdAt"), "CSV export has header row");

  // 12. Delete webhook
  const deleteRes = await request(`/api/webhooks/${webhookId}`, {
    method: "DELETE",
    headers: devHeader,
  });
  ok(deleteRes.status === 200, "DELETE /api/webhooks/:id returns 200");

  // Cleanup local server
  server.close();

  console.log("\n═══════════════════════════════════════════════════════════");
  if (process.exitCode) {
    console.log("Webhook smoke test completed with failures.");
  } else {
    console.log("All webhook smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Webhook smoke test error:", err.message);
  process.exit(1);
});
