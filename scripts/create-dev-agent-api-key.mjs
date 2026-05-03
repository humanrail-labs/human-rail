#!/usr/bin/env node
/**
 * Create a dev agent API key for local SDK testing.
 *
 * Creates an org, agent, wallet, and policy if needed, then creates an API key
 * and prints the raw key to stdout.
 */

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
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const devHeader = { "x-mandara-dev-user": "dev@local" };
  const ts = Date.now();

  // Health check
  const health = await request("/health");
  if (health.status !== 200) {
    console.error("API is not running at", BASE);
    console.error("Start it with: npm run product:api:dev");
    process.exit(1);
  }

  // Find or create org
  const orgs = await request("/api/orgs", { headers: devHeader });
  let orgId = orgs.body?.data?.[0]?.id;
  if (!orgId) {
    const createOrg = await request("/api/orgs", {
      method: "POST",
      headers: devHeader,
      body: JSON.stringify({ name: `Dev Org ${ts}`, slug: `dev-org-${ts}` }),
    });
    orgId = createOrg.body?.data?.id;
  }

  // Create agent
  const agentRes = await request("/api/agents", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Dev Agent ${ts}`,
      description: "Created by create-dev-agent-api-key",
    }),
  });
  const agentId = agentRes.body?.data?.id;

  // Import wallet
  const walletRes = await request("/api/wallets/import", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      name: `Dev Wallet ${ts}`,
      dwalletPda: `DevWallet${ts.toString(36)}`.padEnd(32, "0"),
      curve: "Secp256k1",
      signingPublicKey: "02".padEnd(66, "0"),
    }),
  });
  const walletId = walletRes.body?.data?.id;

  // Create policy
  await request("/api/policies", {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({
      organizationId: orgId,
      agentId,
      ikaDwalletId: walletId,
      name: `Dev Policy ${ts}`,
      chainId: 84532,
      asset: "USDC:BASE_SEPOLIA",
      recipient: "0x1111111111111111111111111111111111111111",
      perTxLimit: "100000000",
      dailyLimit: "500000000",
      totalLimit: "1000000000",
    }),
  });

  // Create API key
  const keyRes = await request(`/api/agents/${agentId}/api-keys`, {
    method: "POST",
    headers: devHeader,
    body: JSON.stringify({ name: "sdk-dev-key" }),
  });

  const rawKey = keyRes.body?.data?.rawKey;
  const prefix = keyRes.body?.data?.prefix;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Dev Agent API Key Created");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("Agent ID:   ", agentId);
  console.log("Prefix:     ", prefix);
  console.log("\nRaw Key (copy now — it will not be shown again):");
  console.log(rawKey);
  console.log("\nExport it:");
  console.log(`  export MANDARA_AGENT_API_KEY="${rawKey}"`);
  console.log("\nThen run SDK smoke test:");
  console.log("  npm run mandara-sdk:smoke");
  console.log("\n═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
