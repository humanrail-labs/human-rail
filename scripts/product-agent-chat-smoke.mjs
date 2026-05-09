#!/usr/bin/env node
/**
 * Mandara Agent Chat Smoke Test (P12)
 * Verifies chat proposal preview, explicit approval, and rejection without live execution.
 */

const BASE = process.env.MANDARA_API_URL ?? "http://localhost:4000";
const ENQUEUE_TEST = process.env.PRODUCT_AGENT_CHAT_SMOKE_ENQUEUE === "true";

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
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS: ${message}`);
  return true;
}

async function main() {
  console.log(`Smoke testing Mandara Agent Chat at ${BASE}\n`);
  const ts = Date.now();
  const devHeader = { "x-mandara-dev-user": `agent-chat-smoke-${ts}@local.test` };

  const health = await request("/health");
  ok(health.status === 200, "GET /health returns 200");

  const ready = await request("/ready");
  ok(ready.status === 200, "GET /ready returns 200");
  if (ready.body?.data?.status !== "ready") {
    console.log("API is not ready. Skipping Agent Chat DB tests.");
    return;
  }

  const org = await request("/api/orgs", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ name: `Agent Chat Smoke Org ${ts}`, slug: `agent-chat-smoke-${ts}` }),
  });
  ok(org.status === 201, "POST /api/orgs creates org");
  const organizationId = org.body?.data?.id;

  const agent = await request("/api/agents", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId,
      name: `Agent Chat Smoke Agent ${ts}`,
      description: "Created by Agent Chat smoke test",
    }),
  });
  ok(agent.status === 201, "POST /api/agents creates agent");
  const agentId = agent.body?.data?.id;

  const wallet = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId,
      name: `Agent Chat Smoke Wallet ${ts}`,
      dwalletPda: `AgentChatWallet${ts.toString(36)}`.padEnd(32, "0"),
      curve: "Secp256k1",
      signingPublicKey: "02".padEnd(66, "0"),
      state: "Active",
    }),
  });
  ok(wallet.status === 201, "POST /api/wallets/import imports wallet");
  const ikaDwalletId = wallet.body?.data?.id;

  const policy = await request("/api/policies", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId,
      agentId,
      ikaDwalletId,
      name: `Agent Chat Smoke Mandate ${ts}`,
      chainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      perTxLimit: "100000000",
      dailyLimit: "500000000",
      totalLimit: "1000000000",
    }),
  });
  ok(policy.status === 201, "POST /api/policies creates mandate");

  const session = await request("/api/agent-chat/sessions", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ organizationId, agentId, title: "Smoke Agent Chat" }),
  });
  ok(session.status === 201, "POST /api/agent-chat/sessions creates session");
  const sessionId = session.body?.data?.id;

  const allowedMessage = await request("/api/agent-chat/messages", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      sessionId,
      organizationId,
      agentId,
      message: "Prepare a 42 USDC payout to the approved Base Sepolia recipient",
      mode: "prepare_signature_request",
    }),
  });
  ok(allowedMessage.status === 200, "POST /api/agent-chat/messages returns allowed proposal");
  const allowedProposal = allowedMessage.body?.data?.proposal;
  ok(Boolean(allowedProposal?.id), "Assistant returns proposal");
  ok(allowedMessage.body?.data?.policyDecision?.allowed === true, "Allowed proposal passes mandate preview");
  ok(allowedProposal?.status === "preview_allowed", "Allowed proposal status is preview_allowed");
  ok(Boolean(allowedMessage.body?.data?.assistantMessage?.provider), "Assistant message includes provider metadata");

  const approve = await request(`/api/agent-chat/proposals/${allowedProposal.id}/approve`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ enqueue: ENQUEUE_TEST }),
  });
  ok(approve.status === 200, "POST /api/agent-chat/proposals/:id/approve succeeds");
  ok(Boolean(approve.body?.data?.signingRequest?.id), "Approval creates SigningRequest");
  ok(
    ["request_created", "queued"].includes(approve.body?.data?.proposal?.status),
    "Proposal status updates after approval"
  );
  if (ENQUEUE_TEST) {
    ok(approve.body?.data?.proposal?.status === "queued", "Optional enqueue marks proposal queued");
    ok(approve.body?.data?.execution?.status === "queued", "Optional enqueue returns execution info");
  }

  const rejectedMessage = await request("/api/agent-chat/messages", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      sessionId,
      organizationId,
      agentId,
      message: "Prepare a 150 USDC payout to the approved Base Sepolia recipient",
      mode: "prepare_signature_request",
    }),
  });
  ok(rejectedMessage.status === 200, "POST /api/agent-chat/messages returns rejected proposal");
  const rejectedProposal = rejectedMessage.body?.data?.proposal;
  ok(rejectedMessage.body?.data?.policyDecision?.allowed === false, "Rejected proposal fails mandate preview");
  ok(rejectedProposal?.status === "preview_rejected", "Rejected proposal status is preview_rejected");

  const reject = await request(`/api/agent-chat/proposals/${rejectedProposal.id}/reject`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ reason: "Smoke test rejection" }),
  });
  ok(reject.status === 200, "POST /api/agent-chat/proposals/:id/reject succeeds");
  ok(reject.body?.data?.proposal?.status === "user_rejected", "Rejected proposal status updates");

  const outOfScope = await request("/api/agent-chat/messages", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      sessionId,
      organizationId,
      agentId,
      message: "Write my university essay about history",
      mode: "assist",
    }),
  });
  ok(outOfScope.status === 200, "Out-of-scope message returns 200 with refusal");
  ok(outOfScope.body?.data?.scope?.allowed === false, "Out-of-scope message is scope rejected");
  ok(!outOfScope.body?.data?.proposal, "Out-of-scope message creates no proposal");
  ok(
    outOfScope.body?.data?.assistantMessage?.provider === "scope_guard",
    "Out-of-scope message does not call LLM provider"
  );

  const subscription = await request("/api/subscription", { headers: devHeader });
  ok(subscription.status === 200, "GET /api/subscription returns 200");
  ok(
    subscription.body?.data?.usage?.agentChatMessages >= 2,
    "Subscription usage tracks accepted Agent Chat messages"
  );

  if (process.exitCode) {
    console.log("\nAgent Chat smoke test completed with failures.");
  } else {
    console.log("\nAll Agent Chat smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Agent Chat smoke test error:", err);
  process.exit(1);
});
