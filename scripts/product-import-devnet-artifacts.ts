#!/usr/bin/env tsx
/**
 * Import Mandara devnet artifacts into the product database.
 *
 * Usage:
 *   npm run product:import-devnet-artifacts
 *
 * This script is idempotent. Running it multiple times will not create duplicates.
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "@mandara/db";
import { importMandaraDevnetArtifacts } from "@mandara/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.product") });

async function main() {
  const prisma = createPrismaClient();

  try {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  Mandara Devnet Artifact Import");
    console.log("═══════════════════════════════════════════════════════════\n");

    const summary = await importMandaraDevnetArtifacts({
      prisma,
      importedByUserId: "dev@local",
      source: "cli-import",
    });

    console.log("Import complete.\n");
    console.log("Summary:");
    console.log("  Organization ID:", summary.organizationId);
    console.log("  Agent ID:        ", summary.agentId);
    console.log("  IkaDwallet ID:   ", summary.ikaDwalletId);
    console.log("  GuardedPolicy ID:", summary.guardedPolicyId);
    console.log("  SigningRequest ID:", summary.signingRequestId);
    console.log("  MessageApproval ID:", summary.messageApprovalId);
    console.log("");
    console.log("Created:", JSON.stringify(summary.createdCounts));
    console.log("Updated:", JSON.stringify(summary.updatedCounts));
    console.log("");
    console.log("API endpoints to inspect:");
    console.log("  GET http://localhost:4000/api/product/devnet-demo");
    console.log("  GET http://localhost:4000/api/agents");
    console.log("  GET http://localhost:4000/api/wallets");
    console.log("  GET http://localhost:4000/api/policies");
    console.log("  GET http://localhost:4000/api/signing-requests");
    console.log("  GET http://localhost:4000/api/message-approvals");
    console.log("  GET http://localhost:4000/api/audit-events");
  } catch (err) {
    console.error("Import failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
