/**
 * Basic request example — create a signing request and check its status.
 *
 * Prerequisites:
 *   export MANDARA_AGENT_API_KEY="mandara_dev_..."
 *   export MANDARA_API_URL="http://localhost:4000" (optional)
 */

import { MandaraClient } from "@mandara/sdk";

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
  // 1. Check agent status
  const status = await client.getAgentStatus();
  console.log("Agent:", status.agent.name, "— active policies:", status.activePolicies);

  // 2. Preview a request (dry-run policy evaluation)
  const preview = await client.previewSignatureRequest({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
    message: "Pay vendor invoice #123",
  });
  console.log("Preview allowed:", preview.policyDecision.allowed);

  // 3. Create the request (do not enqueue automatically)
  const request = await client.requestSignature({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
    message: "Pay vendor invoice #123",
    enqueue: false,
  });
  console.log("Created request:", request.id, "status:", request.status);

  // 4. Poll for the current status
  const current = await client.getSignatureRequest(request.id);
  console.log("Current status:", current.status, "nextStep:", current.nextStep);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
