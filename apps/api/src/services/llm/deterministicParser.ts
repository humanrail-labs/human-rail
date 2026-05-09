import { AgentIntentExtractionResultSchema } from "@mandara/core";
import type { AgentIntentParserInput, AgentIntentProvider } from "./types.js";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const DEMO_USDC_ASSET = "USDC:BASE_SEPOLIA";
const APPROVED_RECIPIENT = "0x1111111111111111111111111111111111111111";

export class DeterministicAgentIntentProvider implements AgentIntentProvider {
  name = "deterministic";
  model = "mandara-demo-parser";

  async extractIntent(input: AgentIntentParserInput) {
    const message = input.message.trim();
    const lower = message.toLowerCase();

    const looksLikeSignatureRequest =
      input.mode === "prepare_signature_request" ||
      /\b(prepare|request|pay|send|payout)\b/.test(lower) ||
      /\busdc\b/.test(lower);

    if (!looksLikeSignatureRequest) {
      const intent = AgentIntentExtractionResultSchema.parse({
        intentType: lower.includes("mandate") ? "question" : "unknown",
        confidence: lower.includes("mandate") ? 0.8 : 0.35,
        explanation: lower.includes("mandate")
          ? "The user is asking for information about the agent mandate."
          : "The message does not contain enough detail to prepare a signature request.",
        missingFields: [],
      });
      return { intent, provider: this.name, model: this.model };
    }

    const amountMatch = lower.match(/(\d+(?:\.\d+)?)\s*usdc/);
    const amount = amountMatch ? toUsdcDemoUnits(amountMatch[1]) : undefined;
    const recipientMatch = message.match(/0x[a-fA-F0-9]{40}/);
    const mentionsApprovedRecipient = lower.includes("approved") && lower.includes("recipient");

    const signatureRequest = {
      destinationChainId: lower.includes("base sepolia") ? BASE_SEPOLIA_CHAIN_ID : undefined,
      asset: lower.includes("usdc") ? DEMO_USDC_ASSET : undefined,
      recipient: recipientMatch?.[0] ?? (mentionsApprovedRecipient ? APPROVED_RECIPIENT : undefined),
      amount,
      message,
    };

    const missingFields = [
      !signatureRequest.destinationChainId ? "destinationChainId" : undefined,
      !signatureRequest.asset ? "asset" : undefined,
      !signatureRequest.recipient ? "recipient" : undefined,
      !signatureRequest.amount ? "amount" : undefined,
      !signatureRequest.message ? "message" : undefined,
    ].filter((field): field is string => Boolean(field));

    const intent = AgentIntentExtractionResultSchema.parse({
      intentType: "signature_request",
      confidence: missingFields.length === 0 ? 0.9 : 0.7,
      explanation: "Prepared a structured signature request from the user's natural language request.",
      signatureRequest,
      missingFields,
    });
    return { intent, provider: this.name, model: this.model };
  }
}

function toUsdcDemoUnits(value: string): string {
  const [wholeRaw, fractionRaw = ""] = value.split(".");
  const whole = BigInt(wholeRaw || "0") * BigInt(1_000_000);
  const fraction = BigInt((fractionRaw.padEnd(6, "0").slice(0, 6) || "0"));
  return (whole + fraction).toString();
}
