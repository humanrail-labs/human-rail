"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Bot, Shield, FileKey } from "lucide-react";

export default function AgentConnectionGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const envSnippet = `export MANDARA_API_URL="${process.env.NEXT_PUBLIC_MANDARA_API_URL || "http://localhost:4000"}"
export MANDARA_AGENT_API_KEY="YOUR_AGENT_API_KEY"`;

  const sdkSnippet = `import { MandaraClient } from "@mandara/sdk";

const client = new MandaraClient({
  apiUrl: process.env.MANDARA_API_URL,
  apiKey: process.env.MANDARA_AGENT_API_KEY,
});

// Preview before sending
const preview = await client.previewSignature({
  asset: "USDC:BASE_SEPOLIA",
  recipient: "0x1111111111111111111111111111111111111111",
  amount: "1000000",
  chainId: 84532,
});

if (preview.allowed) {
  const result = await client.requestSignature({
    asset: "USDC:BASE_SEPOLIA",
    recipient: "0x1111111111111111111111111111111111111111",
    amount: "1000000",
    chainId: 84532,
    message: "Payment for invoice #1234",
  });
  console.log("Request ID:", result.signingRequest.id);
}`;

  const hermesSnippet = `// Hermes / OpenClaw style tool description
{
  name: "request_signature",
  description: "Request a policy-governed signature via Mandara",
  parameters: {
    asset: "Asset identifier, e.g. USDC:BASE_SEPOLIA",
    recipient: "Recipient address",
    amount: "Amount in smallest unit",
    chainId: "Target chain ID",
    message: "Human-readable purpose",
  },
  handler: async ({ asset, recipient, amount, chainId, message }) => {
    const result = await mandaraClient.requestSignature({
      asset, recipient, amount, chainId, message,
    });
    return result.signingRequest.status === "signed"
      ? "Signature completed"
      : "Signature queued for processing";
  },
}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Agent Connection Guide</h2>
        <p className="text-sm text-neutral-500">
          How to connect your real AI agent to Mandara
        </p>
      </div>

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Bot className="h-4 w-4 text-sky-400" />
            What is a Mandara agent?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-400">
          <p>
            A Mandara agent is the control-plane identity for your real AI agent. It holds the
            mandate (policy) and links to the signing wallet. Your real AI agent does not run
            inside Mandara — it calls Mandara via API when it needs a signature.
          </p>
          <p>
            Mandara does not run your AI agent. It gives your agent permission to request
            signatures safely.
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Shield className="h-4 w-4 text-emerald-400" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-400">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Your AI agent decides it needs to sign a transaction.</li>
            <li>It sends a signature request to Mandara via REST API or SDK.</li>
            <li>Mandara checks the request against the agent&apos;s mandate.</li>
            <li>If allowed, Mandara queues the request for the signing worker.</li>
            <li>The worker calls Ika to produce the signature.</li>
            <li>Your agent receives the signature via webhook or polling.</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <FileKey className="h-4 w-4 text-amber-400" />
            Environment variables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded bg-black/30 p-3 text-xs text-neutral-300">
            {envSnippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => copyToClipboard(envSnippet)}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-base text-white">SDK snippet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded bg-black/30 p-3 text-xs text-neutral-300">
            {sdkSnippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => copyToClipboard(sdkSnippet)}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-base text-white">Hermes / OpenClaw tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded bg-black/30 p-3 text-xs text-neutral-300">
            {hermesSnippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => copyToClipboard(hermesSnippet)}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
