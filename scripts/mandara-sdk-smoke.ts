#!/usr/bin/env tsx
/**
 * Mandara SDK Smoke Test (P7)
 *
 * Requires:
 *   MANDARA_AGENT_API_KEY
 *   MANDARA_API_URL (optional)
 *
 * Optional:
 *   MANDARA_SDK_SMOKE_ENQUEUE=true  — also tests waitForSignature (requires worker)
 */

import { MandaraClient, isSigned, isRejected, assertSigned } from "@mandara/sdk";

const API_KEY = process.env.MANDARA_AGENT_API_KEY;
const BASE_URL = process.env.MANDARA_API_URL;
const ENQUEUE_TEST = process.env.MANDARA_SDK_SMOKE_ENQUEUE === "true";

function ok(assertion: unknown, message: string): boolean {
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
  console.log("  Mandara SDK Smoke Test (P7)");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (!API_KEY) {
    console.log("⚠️  Skipping: MANDARA_AGENT_API_KEY is not set.");
    console.log("   Create a key with: npm run product:create-dev-agent-key");
    console.log("   Then export MANDARA_AGENT_API_KEY=<key>");
    return;
  }

  const client = new MandaraClient({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
  });

  // 1. getAgentStatus
  const status = await client.getAgentStatus();
  ok(status.agent?.id, "getAgentStatus returns agent id");
  ok(typeof status.activePolicies === "number", "getAgentStatus returns activePolicies count");
  ok(typeof status.signingRequests?.total === "number", "getAgentStatus returns total signingRequests");

  // 2. previewSignatureRequest (allowed)
  const previewAllowed = await client.previewSignatureRequest({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
    message: "SDK smoke test allowed preview",
  });
  ok(previewAllowed.policyDecision.allowed === true, "preview allowed is allowed");
  ok(!!previewAllowed.messageDigest, "preview returns messageDigest");

  // 3. previewSignatureRequest (rejected)
  const previewRejected = await client.previewSignatureRequest({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "99900000000",
    message: "SDK smoke test rejected preview",
  });
  ok(previewRejected.policyDecision.allowed === false, "preview rejected is not allowed");
  ok(!!previewRejected.policyDecision.rejectionCode, "preview rejected has rejectionCode");

  // 4. requestSignature (allowed, no enqueue)
  const created = await client.requestSignature({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
    message: "SDK smoke test create " + Date.now(),
    enqueue: false,
  });
  ok(created.id, "requestSignature returns id");
  ok(created.status === "requested", "created status is requested");
  ok(created.signingRequest?.requestId, "created signingRequest has requestId");

  // 5. getSignatureRequest
  const fetched = await client.getSignatureRequest(created.id);
  ok(fetched.id === created.id, "getSignatureRequest returns correct id");
  ok(fetched.status === "requested", "fetched status is requested");

  // 6. Utility checks
  ok(!isSigned(fetched), "isSigned returns false for requested");
  ok(!isRejected(fetched), "isRejected returns false for requested");

  // 7. requestSignature (rejected)
  try {
    await client.requestSignature({
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "99900000000",
      message: "SDK smoke test rejected create",
    });
    ok(false, "requestSignature rejected should throw");
  } catch (err) {
    ok(
      err instanceof Error && err.message.includes("POLICY_REJECTED"),
      "rejected request throws POLICY_REJECTED error"
    );
  }

  // 8. Optional enqueue + wait
  if (ENQUEUE_TEST) {
    const queued = await client.requestSignature({
      destinationChainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "SDK smoke test enqueue " + Date.now(),
      enqueue: true,
    });
    ok(queued.status === "queued", "enqueued status is queued");
    ok(queued.execution?.jobId, "enqueued has jobId");

    try {
      const signed = await client.waitForSignature(queued.id, {
        timeoutMs: 120_000,
        intervalMs: 3_000,
      });
      ok(isSigned(signed), "waitForSignature resolves with signed status");
      assertSigned(signed);
      ok(!!signed.signature, "assertSigned confirms signature exists");
    } catch (err) {
      ok(false, `waitForSignature failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  if (process.exitCode) {
    console.log("SDK smoke test completed with failures.");
  } else {
    console.log("All SDK smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("SDK smoke test error:", err);
  process.exit(1);
});
