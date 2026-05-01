#!/usr/bin/env tsx
/**
 * Test Agent Cross-Chain Signature Tool — Phase 6
 *
 * Tests the request_cross_chain_signature tool executor directly
 * without requiring a full LLM provider or agent runtime.
 *
 * Usage:
 *   npm run test:agent-cross-chain-tool
 */

import { ToolExecutor } from "../packages/agent/src/executor.js";
import { computePolicyHashes } from "../packages/agent/src/crossChainPolicy.js";

// Minimal mock HumanRailAgent (only methods used by ToolExecutor)
const mockAgent = {
  checkCapability: async () => ({ authorized: true, reason: "mock" }),
  executePayment: async () => ({ success: true, signatures: [], error: null }),
  executeDataAction: async () => ({ success: true, signatures: [], error: null }),
  signDocument: async () => ({ success: true, signatures: [], error: null }),
  getStatus: async () => ({
    agent: { status: "Active" },
    frozen: false,
    capabilities: [],
    totalSpent: BigInt(0),
    recentReceipts: [],
  }),
  isFrozen: async () => false,
} as unknown as import("@humanrail/sdk").HumanRailAgent;

const executor = new ToolExecutor(mockAgent);

async function testPreviewAllowed() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Test A: preview allowed request");
  console.log("═══════════════════════════════════════════════════════════");

  const result = await executor.execute({
    id: "test-a",
    name: "request_cross_chain_signature",
    arguments: {
      destination_chain_id: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "HumanRail Mandara demo approved request: Base Sepolia USDC transfer 42",
      mode: "preview",
    },
  });

  const parsed = JSON.parse(result);
  console.log("policyAllowed:", parsed.policyAllowed);
  console.log("policyReason:", parsed.policyReason);
  console.log("messageDigest:", parsed.messageDigest);
  console.log("nextStep:", parsed.nextStep);

  if (!parsed.policyAllowed) {
    console.error("❌ FAIL: expected allowed=true");
    process.exit(1);
  }
  console.log("✅ PASS");
}

async function testPreviewRejected() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Test B: preview rejected request (amount too high)");
  console.log("═══════════════════════════════════════════════════════════");

  const result = await executor.execute({
    id: "test-b",
    name: "request_cross_chain_signature",
    arguments: {
      destination_chain_id: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "101000000", // exceeds 100M limit
      message: "HumanRail Mandara demo approved request: Base Sepolia USDC transfer 101",
      mode: "preview",
    },
  });

  const parsed = JSON.parse(result);
  console.log("policyAllowed:", parsed.policyAllowed);
  console.log("policyReason:", parsed.policyReason);

  if (parsed.policyAllowed) {
    console.error("❌ FAIL: expected allowed=false");
    process.exit(1);
  }
  console.log("✅ PASS");
}

async function testDevnetExistingArtifact() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Test C: devnet_existing_artifact");
  console.log("═══════════════════════════════════════════════════════════");

  const result = await executor.execute({
    id: "test-c",
    name: "request_cross_chain_signature",
    arguments: {
      destination_chain_id: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "HumanRail Mandara demo approved request: Base Sepolia USDC transfer 42",
      mode: "devnet_existing_artifact",
    },
  });

  const parsed = JSON.parse(result);
  console.log("policyAllowed:", parsed.policyAllowed);
  console.log("artifacts.exists:", parsed.artifacts?.exists);

  if (parsed.artifacts?.exists) {
    console.log("dWalletPda:", parsed.artifacts.dWalletPda);
    console.log("messageApprovalStatus:", parsed.artifacts.messageApprovalStatus);
    console.log("signatureLen:", parsed.artifacts.signatureLen);
    if (parsed.artifacts.signatureHex) {
      console.log("signatureHex:", parsed.artifacts.signatureHex.slice(0, 32) + "…");
    }
  } else {
    console.log("artifacts.error:", parsed.artifacts?.error);
  }

  console.log("✅ PASS (artifact read attempted)");
}

async function testDevnetExecuteDisabled() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Test D: devnet_execute_new_request with env DISABLED");
  console.log("═══════════════════════════════════════════════════════════");

  // Ensure env var is NOT set
  const original = process.env.HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING;
  delete process.env.HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING;

  const result = await executor.execute({
    id: "test-d",
    name: "request_cross_chain_signature",
    arguments: {
      destination_chain_id: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      amount: "42000000",
      message: "HumanRail Mandara demo approved request: Base Sepolia USDC transfer 42",
      mode: "devnet_execute_new_request",
    },
  });

  // Restore
  if (original !== undefined) {
    process.env.HUMANRAIL_AGENT_ALLOW_DEVNET_SIGNING = original;
  }

  const parsed = JSON.parse(result);
  console.log("error:", parsed.error);
  console.log("reason:", parsed.reason);

  if (parsed.error !== "SAFETY_GATE_DISABLED") {
    console.error("❌ FAIL: expected SAFETY_GATE_DISABLED");
    process.exit(1);
  }
  console.log("✅ PASS");
}

async function testPolicyHashes() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Test E: policy hashes match Phase 5D artifact");
  console.log("═══════════════════════════════════════════════════════════");

  const hashes = computePolicyHashes();
  console.log("assetHash:", hashes.assetHash);
  console.log("recipientHash:", hashes.recipientHash);

  // These should match the values in .local-ika/signing-request.json
  const expectedAssetHash = "d077eb814e4c6cbcfd7be7a842579801e25a2e7966242efb0497d724b4707593";
  const expectedRecipientHash = "efda2c2822100aaf94fb77c3765831ce37fc3c02cbc11603dd6ffa9c0d25ec55";

  if (hashes.assetHash !== expectedAssetHash) {
    console.error("❌ FAIL: assetHash mismatch");
    process.exit(1);
  }
  if (hashes.recipientHash !== expectedRecipientHash) {
    console.error("❌ FAIL: recipientHash mismatch");
    process.exit(1);
  }
  console.log("✅ PASS (hashes match Phase 5D artifact)");
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Agent Cross-Chain Signature Tool Tests — Phase 6");
  console.log("═══════════════════════════════════════════════════════════");

  await testPreviewAllowed();
  await testPreviewRejected();
  await testDevnetExistingArtifact();
  await testDevnetExecuteDisabled();
  await testPolicyHashes();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  ALL TESTS PASSED");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
