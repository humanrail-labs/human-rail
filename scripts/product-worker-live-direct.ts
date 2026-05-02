#!/usr/bin/env tsx
/**
 * Mandara Product Worker — Direct Live Devnet Execution (P4C)
 *
 * This script runs the full live execution flow directly against Solana devnet,
 * bypassing the API and BullMQ queue for deterministic local testing.
 *
 * Prerequisites:
 *   - Postgres running with imported devnet artifacts
 *   - .local-ika/dwallet.json exists
 *   - MANDARA_SERVICE_WALLET_PATH set to a funded devnet keypair
 *   - MANDARA_WORKER_MODE=live-devnet
 *   - MANDARA_ENABLE_LIVE_EXECUTION=true
 *
 * Usage:
 *   MANDARA_WORKER_MODE=live-devnet MANDARA_ENABLE_LIVE_EXECUTION=true \
 *     MANDARA_SERVICE_WALLET_PATH=/home/codespace/.config/solana/id.json \
 *     npx tsx scripts/product-worker-live-direct.ts
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "@mandara/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.product") });

import { executeLiveDevnetSigningRequest } from "../apps/worker/dist/services/liveDevnetExecution.js";

const REQUIRED_ENVS = [
  "MANDARA_SERVICE_WALLET_PATH",
  "MANDARA_WORKER_MODE",
  "MANDARA_ENABLE_LIVE_EXECUTION",
];

function ok(assertion: boolean, message: string): asserts assertion {
  if (!assertion) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Mandara P4C — Direct Live Devnet Execution");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Verify env gates
  for (const key of REQUIRED_ENVS) {
    const val = process.env[key];
    ok(!!val && val !== "", `${key} is set`);
  }
  ok(
    process.env.MANDARA_WORKER_MODE === "live-devnet",
    "MANDARA_WORKER_MODE=live-devnet"
  );
  ok(
    process.env.MANDARA_ENABLE_LIVE_EXECUTION === "true",
    "MANDARA_ENABLE_LIVE_EXECUTION=true"
  );

  const prisma = createPrismaClient();

  try {
    // 2. Find imported demo org
    const org = await prisma.organization.findUnique({
      where: { slug: "mandara-devnet-demo" },
    });
    ok(!!org, "Demo organization exists");

    // 3. Find imported demo agent
    const agent = await prisma.agent.findFirst({
      where: { organizationId: org.id },
    });
    ok(!!agent, "Demo agent exists");

    // 4. Find imported demo dWallet
    const dwallet = await prisma.ikaDwallet.findFirst({
      where: { organizationId: org.id },
    });
    ok(!!dwallet, "Demo dWallet exists");

    // 5. Find imported demo policy (must have onChainPda)
    const policy = await prisma.guardedPolicy.findFirst({
      where: { organizationId: org.id },
    });
    ok(!!policy, "Demo policy exists");
    ok(!!policy.onChainPda, "Demo policy has onChainPda (GuardedDwallet PDA)");

    // 6. Create a NEW signing request with unique message to avoid PDA collision
    const ts = Date.now();
    const uniqueMessage = `Mandara product worker live execution ${ts}`;
    const amount = "1000000"; // 1 USDC unit, well within limits

    const signingRequest = await prisma.signingRequest.create({
      data: {
        organizationId: org.id,
        agentId: agent.id,
        policyId: policy.id,
        ikaDwalletId: dwallet.id,
        requestId: `req-live-${ts}`,
        messageDigest: "0000000000000000000000000000000000000000000000000000000000000000",
        messageMetadataDigest: "0000000000000000000000000000000000000000000000000000000000000000",
        destinationChainId: 84532,
        asset: "USDC:BASE_SEPOLIA",
        recipient: "0x1111111111111111111111111111111111111111",
        assetHash: policy.allowedAssetHash,
        recipientHash: policy.allowedRecipientHash,
        amount,
        message: uniqueMessage,
        signatureScheme: "EcdsaKeccak256",
        status: "requested",
      },
    });

    console.log("\n📋 Created signing request:", signingRequest.id);
    console.log("   Message:", uniqueMessage);
    console.log("   Amount:", amount);
    console.log("   Policy onChainPda:", policy.onChainPda);

    // 7. Execute live devnet signing directly
    console.log("\n🚀 Executing live devnet signing...\n");
    const result = await executeLiveDevnetSigningRequest(
      signingRequest.id,
      org.id
    );

    // 8. Verify result
    ok(result.success === true, "Live execution returned success=true");
    ok(result.status === "signed", `Live execution status is signed (got ${result.status})`);
    ok(!!result.guardSigningRequestPda, "Result has guardSigningRequestPda");
    ok(!!result.ikaMessageApprovalPda, "Result has ikaMessageApprovalPda");
    ok(!!result.signatureHex, "Result has signatureHex");
    ok((result.signatureLen ?? 0) > 0, "Result has positive signatureLen");

    // 9. Verify DB state
    const dbSr = await prisma.signingRequest.findUnique({
      where: { id: signingRequest.id },
      include: { messageApproval: true },
    });
    ok(!!dbSr, "DB signing request exists after execution");
    ok(dbSr.status === "signed", `DB status is signed (got ${dbSr.status})`);
    ok(!!dbSr.signatureHex, "DB has signatureHex");
    ok(!!dbSr.approveTxSignature, "DB has approveTxSignature");
    ok(!!dbSr.onChainRequestPda, "DB has onChainRequestPda");
    ok(!!dbSr.onChainMessageApprovalPda, "DB has onChainMessageApprovalPda");

    const dbMa = dbSr.messageApproval;
    ok(!!dbMa, "DB MessageApproval exists");
    ok(dbMa.status === "signed", `DB MessageApproval status is signed (got ${dbMa.status})`);
    ok((dbMa.signatureLength ?? 0) > 0, "DB MessageApproval has signatureLength > 0");
    ok(!!dbMa.signatureHex, "DB MessageApproval has signatureHex");

    // 10. Verify audit events
    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        organizationId: org.id,
        resourceType: "signing_request",
        resourceId: signingRequest.id,
      },
      orderBy: { createdAt: "asc" },
    });

    const eventTypes = auditEvents.map((e) => e.eventType);
    ok(
      eventTypes.includes("guard_message_approved"),
      "Audit events include guard_message_approved"
    );
    ok(
      eventTypes.includes("ika_message_approval_created"),
      "Audit events include ika_message_approval_created"
    );
    ok(
      eventTypes.includes("ika_signature_committed"),
      "Audit events include ika_signature_committed"
    );

    // 11. Print final proof
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  P4C Live Execution Proof");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  SigningRequest ID:", signingRequest.id);
    console.log("  Unique message:   ", uniqueMessage);
    console.log("  Approve tx sig:   ", dbSr.approveTxSignature);
    console.log("  GuardSigningRequest PDA:", result.guardSigningRequestPda);
    console.log("  MessageApproval PDA:    ", result.ikaMessageApprovalPda);
    console.log("  Signature length: ", result.signatureLen);
    console.log("  Signature hex:    ", result.signatureHex);
    console.log("  Signature b64:    ", result.signatureBase64);
    console.log("  Audit events:     ", eventTypes.join(", "));
    console.log("═══════════════════════════════════════════════════════════\n");

    console.log("🎉 P4C live end-to-end execution PASSED.");
  } catch (err: any) {
    console.error("\n❌ Live execution failed:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
