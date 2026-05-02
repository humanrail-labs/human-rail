#!/usr/bin/env node
/**
 * Mandara Live Devnet Smoke Test (P4B)
 *
 * Tests the live execution service:
 * 1. Module loads correctly
 * 2. Fails gracefully when prerequisites are missing (spawned in child process)
 * 3. If prerequisites exist, performs end-to-end Guard CPI + Ika sign
 *
 * Prerequisites for live test:
 *   - .local-ika/dwallet.json exists
 *   - MANDARA_SERVICE_WALLET_PATH points to a valid keypair
 *   - Service wallet has devnet SOL
 *   - Redis running
 *   - Postgres running
 *   - API running (for enqueue)
 */

import fs from "node:fs";
import { execSync } from "node:child_process";

const BASE = process.env.MANDARA_API_URL ?? "http://localhost:4000";
const LIVE_MODE = process.env.LIVE_SMOKETEST === "1";

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

async function testModuleLoad() {
  console.log("\n─── Test: Module Load ───");
  try {
    const mod = await import(
      new URL("../apps/worker/dist/services/liveDevnetExecution.js", import.meta.url)
    );
    ok(typeof mod.executeLiveDevnetSigningRequest === "function", "executeLiveDevnetSigningRequest is exported");
  } catch (err) {
    ok(false, `Module load failed: ${err.message}`);
  }
}

async function testGracefulFailureMissingDwallet() {
  console.log("\n─── Test: Graceful failure when dWallet artifact missing ───");

  const artifactPath = ".local-ika/dwallet.json";
  const backupPath = ".local-ika/dwallet.json.bak";
  let restored = false;

  if (fs.existsSync(artifactPath)) {
    fs.renameSync(artifactPath, backupPath);
    restored = true;
  }

  try {
    const script = `
      import { executeLiveDevnetSigningRequest } from "./apps/worker/dist/services/liveDevnetExecution.js";
      try {
        await executeLiveDevnetSigningRequest("test-id", "test-org");
        console.log("FAIL: Should have thrown");
        process.exit(1);
      } catch (err) {
        if (err.message.includes("dWallet artifact not found")) {
          console.log("PASS: Correct error message");
          process.exit(0);
        }
        console.log("FAIL: Wrong error:", err.message);
        process.exit(1);
      }
    `;
    const result = execSync("node --input-type=module", {
      input: script,
      encoding: "utf-8",
      cwd: process.cwd(),
      env: {
        ...process.env,
        MANDARA_SERVICE_WALLET_PATH: ".local-keys/humanrail_dwallet_guard-keypair.json",
      },
    });
    ok(result.includes("PASS"), "Child process reports correct error for missing dWallet artifact");
  } catch (err) {
    ok(false, `Child process failed: ${err.stderr || err.message}`);
  } finally {
    if (restored) {
      fs.renameSync(backupPath, artifactPath);
    }
  }
}

async function testGracefulFailureMissingWallet() {
  console.log("\n─── Test: Graceful failure when service wallet missing ───");

  const script = `
    import { executeLiveDevnetSigningRequest } from "./apps/worker/dist/services/liveDevnetExecution.js";
    try {
      await executeLiveDevnetSigningRequest("test-id", "test-org");
      console.log("FAIL: Should have thrown");
      process.exit(1);
    } catch (err) {
      if (err.message.includes("MANDARA_SERVICE_WALLET_PATH is required")) {
        console.log("PASS: Correct error message");
        process.exit(0);
      }
      console.log("FAIL: Wrong error:", err.message);
      process.exit(1);
    }
  `;
  try {
    const result = execSync("node --input-type=module", {
      input: script,
      encoding: "utf-8",
      cwd: process.cwd(),
      env: {
        ...process.env,
        MANDARA_SERVICE_WALLET_PATH: "",
      },
    });
    ok(result.includes("PASS"), "Child process reports correct error for missing service wallet");
  } catch (err) {
    ok(false, `Child process failed: ${err.stderr || err.message}`);
  }
}

async function testLiveEndToEnd() {
  console.log("\n─── Test: Live End-to-End (requires devnet artifacts) ───");

  const artifactPath = ".local-ika/dwallet.json";
  const walletPath = process.env.MANDARA_SERVICE_WALLET_PATH;

  if (!fs.existsSync(artifactPath)) {
    console.log("⚠️  Skipping live test: .local-ika/dwallet.json not found");
    return;
  }
  if (!walletPath || !fs.existsSync(walletPath)) {
    console.log("⚠️  Skipping live test: service wallet not found");
    return;
  }

  const devHeader = { "x-mandara-dev-user": "dev@local" };
  const ts = Date.now();

  // 1. Get or create org
  const orgs = await request("/api/orgs", { headers: devHeader });
  let orgId = orgs.body?.data?.[0]?.id;
  if (!orgId) {
    const createOrg = await request("/api/orgs", {
      method: "POST",
      headers: devHeader,
      body: JSON.stringify({ name: `Live Smoke Org ${ts}`, slug: `live-smoke-${ts}` }),
    });
    ok(createOrg.status === 201, "POST /api/orgs creates org");
    orgId = createOrg.body?.data?.id;
  }
  ok(orgId, "Have an organization ID");

  // 2. Create agent
  const agentRes = await request("/api/agents", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ organizationId: orgId, name: `Live Agent ${ts}` }),
  });
  ok(agentRes.status === 201, "POST /api/agents creates agent");
  const agentId = agentRes.body?.data?.id;

  // 3. Import dWallet
  const dwalletArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const walletRes = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Live Wallet ${ts}`,
      dwalletPda: dwalletArtifact.dwallet_pda,
      curve: dwalletArtifact.curve ?? "Secp256k1",
      signingPublicKey: dwalletArtifact.dwallet_signing_public_key_hex,
      state: dwalletArtifact.state ?? "Active",
      authority: dwalletArtifact.authority,
    }),
  });
  ok(walletRes.status === 201, "POST /api/wallets/import imports dWallet");
  const walletId = walletRes.body?.data?.id;

  // 4. Create policy with on-chain PDA (use dWallet PDA as guarded dwallet for test)
  const policyRes = await request("/api/policies", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      ikaDwalletId: walletId,
      name: `Live Policy ${ts}`,
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

  // 5. Create signing request
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
      amount: "1000000",
      message: `Live smoke test ${ts}`,
    }),
  });
  ok(createRes.status === 201, "POST /api/signing-requests creates allowed request");
  const srId = createRes.body?.data?.signingRequest?.id;
  ok(srId, "Have signing request ID");

  // 6. Enqueue
  const enqueueRes = await request(`/api/signing-requests/${srId}/enqueue`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({}),
  });
  ok(enqueueRes.status === 200, "POST /api/signing-requests/:id/enqueue returns 200");

  // 7. Process job in live-devnet mode
  const { processSigningRequestJob } = await import(
    new URL("../apps/worker/dist/jobs/signingRequestJob.js", import.meta.url)
  );

  const result = await processSigningRequestJob({
    signingRequestId: srId,
    organizationId: orgId,
    requestedBy: "live-smoke-test",
    mode: "live-devnet",
  });

  ok(result.success === true, "Live execution returns success=true");
  ok(result.status === "signed", `Live execution status is signed (got ${result.status})`);
  ok(result.guardSigningRequestPda, "Result has guardSigningRequestPda");
  ok(result.ikaMessageApprovalPda, "Result has ikaMessageApprovalPda");
  ok(result.signatureHex, "Result has signatureHex");
  ok(result.signatureLen > 0, "Result has positive signatureLen");

  // 8. Verify DB state
  const afterRes = await request(`/api/signing-requests/${srId}`, { headers: devHeader });
  ok(afterRes.status === 200, "GET /api/signing-requests/:id returns 200 after live execution");
  const afterSr = afterRes.body?.data;
  ok(afterSr?.status === "signed", "DB status is signed after live execution");
  ok(afterSr?.signatureHex, "DB has signatureHex after live execution");
  ok(afterSr?.onChainRequestPda === result.guardSigningRequestPda, "DB onChainRequestPda matches");
  ok(afterSr?.onChainMessageApprovalPda === result.ikaMessageApprovalPda, "DB onChainMessageApprovalPda matches");

  // 9. Verify MessageApproval in DB
  const maRes = await request(`/api/signing-requests/${srId}/execution`, { headers: devHeader });
  ok(maRes.status === 200, "GET /api/signing-requests/:id/execution returns 200");

  const hasSignedEvent = maRes.body?.data?.auditEvents?.some(
    (e) => e.eventType === "ika_signature_committed"
  );
  ok(hasSignedEvent, "Audit events include ika_signature_committed");

  const hasGuardApproved = maRes.body?.data?.auditEvents?.some(
    (e) => e.eventType === "guard_message_approved"
  );
  ok(hasGuardApproved, "Audit events include guard_message_approved");

  console.log("\n🎉 Live end-to-end test passed!");
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Mandara Live Devnet Smoke Test (P4B)");
  console.log("═══════════════════════════════════════════");

  // Build first
  console.log("\nBuilding worker...");
  try {
    execSync("npm run build -w @mandara/worker", { stdio: "inherit", cwd: process.cwd() });
  } catch {
    console.error("Build failed");
    process.exit(1);
  }

  await testModuleLoad();
  await testGracefulFailureMissingDwallet();
  await testGracefulFailureMissingWallet();

  if (LIVE_MODE) {
    await testLiveEndToEnd();
  } else {
    console.log("\n⚠️  Skipping live end-to-end test. Set LIVE_SMOKETEST=1 to run.");
  }

  console.log("\n═══════════════════════════════════════════");
  if (process.exitCode) {
    console.log("Live smoke test completed with failures.");
  } else {
    console.log("All live smoke tests passed.");
  }
}

main().catch((err) => {
  console.error("Live smoke test error:", err.message);
  process.exit(1);
});
