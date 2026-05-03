/**
 * Preview-only example — evaluate a request against policy without creating a record.
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
  // Allowed request
  const allowed = await client.previewSignatureRequest({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "42000000",
    message: "Preview allowed request",
  });
  console.log("Allowed preview:", allowed.policyDecision.allowed);
  console.log("  reason:", allowed.policyDecision.reason);
  console.log("  messageDigest:", allowed.messageDigest);

  // Rejected request (amount too large)
  const rejected = await client.previewSignatureRequest({
    destinationChainId: 84532,
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "99900000000",
    message: "Preview rejected request",
  });
  console.log("Rejected preview:", rejected.policyDecision.allowed);
  console.log("  reason:", rejected.policyDecision.reason);
  console.log("  rejectionCode:", rejected.policyDecision.rejectionCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
