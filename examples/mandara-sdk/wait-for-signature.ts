/**
 * Wait-for-signature example — create, enqueue, and poll until signed or terminal.
 *
 * Prerequisites:
 *   export MANDARA_AGENT_API_KEY="mandara_dev_..."
 *   export MANDARA_API_URL="http://localhost:4000" (optional)
 *   Worker must be running for the request to reach "signed" status.
 */

import { MandaraClient, assertSigned } from "@mandara/sdk";

const API_KEY = process.env.MANDARA_AGENT_API_KEY;
if (!API_KEY) {
  console.error("Missing MANDARA_AGENT_API_KEY");
  process.exit(1);
}

const client = new MandaraClient({
  apiKey: API_KEY,
  baseUrl: process.env.MANDARA_API_URL,
});

async function main() {
  // 1. Create and enqueue
  const request = await client.requestSignature({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
    message: "Wait-for-signature example " + Date.now(),
    enqueue: true,
  });
  console.log("Enqueued request:", request.id, "job:", request.execution?.jobId);

  // 2. Poll until signed (or terminal)
  try {
    const signed = await client.waitForSignature(request.id, {
      timeoutMs: 120_000,
      intervalMs: 3_000,
    });
    assertSigned(signed);
    console.log("Signature received:", signed.signature?.slice(0, 32) + "...");
  } catch (err) {
    console.error("Failed to obtain signature:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
