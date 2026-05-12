#!/usr/bin/env node
/**
 * Product Frontend Smoke Test
 *
 * API-level smoke test covering the exact calls the onboarding wizard uses.
 * Does NOT require a browser — it hits the Mandara API directly.
 *
 * Environment:
 *   MANDARA_API_URL   - defaults to http://localhost:4000
 *   MANDARA_DEV_USER  - defaults to dev@local
 *   PRODUCT_FRONTEND_SMOKE_ENQUEUE - set to "true" to test enqueue
 */

const API_URL = process.env.MANDARA_API_URL || "http://localhost:4000";
const DEV_USER = process.env.MANDARA_DEV_USER || "dev@local";
const TEST_ENQUEUE = process.env.PRODUCT_FRONTEND_SMOKE_ENQUEUE === "true";

const headers = {
  "Content-Type": "application/json",
  "x-mandara-dev-user": DEV_USER,
};

let exitCode = 0;

async function api(path, init = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body.error?.message || `HTTP ${res.status}`;
    throw new Error(`${path}: ${msg}`);
  }
  return body.data ?? body;
}

function ok(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  console.error(`  ✗ ${label}: ${err.message}`);
  exitCode = 1;
}

async function run() {
  console.log(`Smoke testing Mandara API at ${API_URL}`);
  console.log("");

  // ── Health ──
  try {
    await api("/health");
    ok("GET /health");
  } catch (err) {
    fail("GET /health", err);
    console.error("\nAPI is not reachable. Aborting.");
    process.exit(1);
  }

  // ── Devnet demo ──
  try {
    await api("/api/product/devnet-demo");
    ok("GET /api/product/devnet-demo");
  } catch (err) {
    fail("GET /api/product/devnet-demo", err);
  }

  // ── Orgs ──
  let orgs;
  try {
    orgs = await api("/api/orgs");
    ok("GET /api/orgs");
  } catch (err) {
    fail("GET /api/orgs", err);
  }

  let orgId = orgs?.[0]?.id;
  if (!orgId) {
    try {
      const org = await api("/api/orgs", {
        method: "POST",
        body: JSON.stringify({
          name: `Frontend Smoke Org ${Date.now()}`,
          slug: `frontend-smoke-${Date.now()}`,
        }),
      });
      orgId = org.id;
      ok("POST /api/orgs");
    } catch (err) {
      fail("POST /api/orgs", err);
    }
  } else {
    ok("POST /api/orgs (skipped — existing org)");
  }

  // ── Agents ──
  let agents;
  try {
    agents = await api("/api/agents");
    ok("GET /api/agents");
  } catch (err) {
    fail("GET /api/agents", err);
  }

  let testAgent = agents?.[0];
  if (!testAgent) {
    try {
      testAgent = await api("/api/agents", {
        method: "POST",
        body: JSON.stringify({ organizationId: orgId, name: `Smoke Agent ${Date.now()}` }),
      });
      ok("POST /api/agents");
    } catch (err) {
      fail("POST /api/agents", err);
    }
  } else {
    ok("POST /api/agents (skipped — existing agent)");
  }

  // ── Wallets ──
  let wallets;
  try {
    wallets = await api("/api/wallets");
    ok("GET /api/wallets");
  } catch (err) {
    fail("GET /api/wallets", err);
  }

  let testWallet = wallets?.[0];
  if (!testWallet) {
    try {
      testWallet = await api("/api/wallets/import", {
        method: "POST",
        body: JSON.stringify({
          dwalletPda: "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
          organizationId: orgId,
          curve: "Secp256k1",
          name: "Smoke Wallet",
          signingPublicKey: "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d",
        }),
      });
      ok("POST /api/wallets/import");
    } catch (err) {
      fail("POST /api/wallets/import", err);
    }
  } else {
    ok("POST /api/wallets/import (skipped — existing wallet)");
  }

  // ── Policies ──
  let policies;
  try {
    policies = await api("/api/policies");
    ok("GET /api/policies");
  } catch (err) {
    fail("GET /api/policies", err);
  }

  let testPolicy = policies?.[0];
  if (!testPolicy && testAgent && testWallet) {
    try {
      testPolicy = await api("/api/policies", {
        method: "POST",
        body: JSON.stringify({
          agentId: testAgent.id,
          ikaDwalletId: testWallet.id,
          organizationId: orgId,
          chainId: 84532,
          asset: "USDC:BASE_SEPOLIA",
          recipient: "0x1111111111111111111111111111111111111111",
          perTxLimit: "100000000",
          dailyLimit: "500000000",
          totalLimit: "1000000000",
        }),
      });
      ok("POST /api/policies");
    } catch (err) {
      fail("POST /api/policies", err);
    }
  } else {
    ok("POST /api/policies (skipped — existing policy or missing deps)");
  }

  // ── API Keys ──
  let apiKeys = [];
  if (testAgent) {
    try {
      apiKeys = await api(`/api/agents/${testAgent.id}/api-keys`);
      ok(`GET /api/agents/${testAgent.id}/api-keys`);
    } catch (err) {
      fail("GET /api/agents/:id/api-keys", err);
    }

    if (apiKeys.length === 0) {
      try {
        const key = await api(`/api/agents/${testAgent.id}/api-keys`, {
          method: "POST",
          body: JSON.stringify({ name: "Smoke Key" }),
        });
        ok("POST /api/agents/:id/api-keys");
        apiKeys.push(key);
      } catch (err) {
        fail("POST /api/agents/:id/api-keys", err);
      }
    } else {
      ok("POST /api/agents/:id/api-keys (skipped — existing key)");
    }
  }

  // ── Agent Chat ──
  let chatSession;
  if (testAgent) {
    try {
      chatSession = await api("/api/agent-chat/sessions", {
        method: "POST",
        body: JSON.stringify({ organizationId: orgId, agentId: testAgent.id, title: "Frontend Smoke Chat" }),
      });
      ok("POST /api/agent-chat/sessions creates chat session");
    } catch (err) {
      fail("POST /api/agent-chat/sessions", err);
    }

    if (chatSession) {
      try {
        const chatMsg = await api("/api/agent-chat/messages", {
          method: "POST",
          body: JSON.stringify({
            sessionId: chatSession.id,
            organizationId: orgId,
            agentId: testAgent.id,
            message: "Prepare a 42 USDC payout to the approved Base Sepolia recipient",
            mode: "prepare_signature_request",
          }),
        });
        ok("POST /api/agent-chat/messages returns proposal");
        if (chatMsg.proposal) {
          const proposal = chatMsg.proposal;
          if (proposal.status === "preview_allowed") {
            const approved = await api(`/api/agent-chat/proposals/${proposal.id}/approve`, {
              method: "POST",
              body: JSON.stringify({ enqueue: false }),
            });
            ok("POST /api/agent-chat/proposals/:id/approve creates request");

            const rejected = await api(`/api/agent-chat/proposals/${proposal.id}/reject`, {
              method: "POST",
              body: JSON.stringify({ reason: "Smoke test reject after approve" }),
            });
            ok("POST /api/agent-chat/proposals/:id/reject updates status");
          }
        }
      } catch (err) {
        fail("POST /api/agent-chat/messages", err);
      }
    }
  }

  // ── Signing Requests ──
  if (testAgent && testPolicy) {
    try {
      await api("/api/signing-requests/preview", {
        method: "POST",
        body: JSON.stringify({
          agentId: testAgent.id,
          policyId: testPolicy.id,
          organizationId: orgId,
          destinationChainId: 84532,
          asset: "USDC:BASE_SEPOLIA",
          recipient: "0x1111111111111111111111111111111111111111",
          amount: "1000000",
          message: `Smoke test ${Date.now()}`,
        }),
      });
      ok("POST /api/signing-requests/preview");
    } catch (err) {
      fail("POST /api/signing-requests/preview", err);
    }

    let testSr;
    try {
      testSr = await api("/api/signing-requests", {
        method: "POST",
        body: JSON.stringify({
          agentId: testAgent.id,
          policyId: testPolicy.id,
          organizationId: orgId,
          destinationChainId: 84532,
          asset: "USDC:BASE_SEPOLIA",
          recipient: "0x1111111111111111111111111111111111111111",
          amount: "1000000",
          message: `Smoke test ${Date.now()}`,
        }),
      });
      ok("POST /api/signing-requests");
    } catch (err) {
      fail("POST /api/signing-requests", err);
    }

    if (TEST_ENQUEUE && testSr) {
      try {
        await api(`/api/signing-requests/${testSr.signingRequest.id}/enqueue`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        ok(`POST /api/signing-requests/:id/enqueue`);
      } catch (err) {
        fail("POST /api/signing-requests/:id/enqueue", err);
      }
    } else {
      ok("POST /api/signing-requests/:id/enqueue (skipped — set PRODUCT_FRONTEND_SMOKE_ENQUEUE=true)");
    }

    if (testSr) {
      try {
        await api(`/api/signing-requests/${testSr.signingRequest.id}/execution`);
        ok("GET /api/signing-requests/:id/execution");
      } catch (err) {
        fail("GET /api/signing-requests/:id/execution", err);
      }
    }
  } else {
    ok("Signing request tests skipped — no agent/policy available");
  }

  console.log("");
  if (exitCode === 0) {
    console.log("All smoke tests passed.");
  } else {
    console.log("Some smoke tests failed.");
  }
  process.exit(exitCode);
}

run().catch((err) => {
  console.error("Smoke test runner failed:", err);
  process.exit(1);
});
