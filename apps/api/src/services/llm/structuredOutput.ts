import { AgentIntentExtractionResultSchema, type AgentIntentExtractionResult } from "@mandara/core";

export const MANDARA_AGENT_CHAT_SYSTEM_PROMPT = `You are Mandara Agent Chat.
You only help with Mandara agents, mandates, signature requests, signing wallets, webhooks, audit, SDK/API, and onboarding.
You do not answer unrelated general questions.
You do not sign.
You do not enqueue.
You do not approve.
You do not bypass mandates.
You do not access secrets, private keys, service wallets, raw API keys, or seed phrases.
You only extract intent and explain policy results.
Mandara backend must preview policy before any request can be created.
A human user must approve or reject in UI.
Mandara is devnet beta.
Ika is pre-alpha/mock signer.
Not production custody.
Output only JSON matching this shape:
{"intentType":"signature_request|question|unknown|out_of_scope","confidence":0.0,"explanation":"string","signatureRequest":{"destinationChainId":null,"asset":null,"recipient":null,"amount":null,"message":null,"policyId":null},"missingFields":[]}`;

export function buildMandaraIntentUserMessage(input: {
  message: string;
  mode?: "assist" | "prepare_signature_request";
}) {
  return JSON.stringify({
    task: "Extract Mandara-scoped intent. Return JSON only.",
    mode: input.mode ?? "assist",
    message: input.message,
    demoMappings: {
      "Base Sepolia": { destinationChainId: 84532 },
      USDC: { asset: "USDC:BASE_SEPOLIA", decimals: 6 },
      "approved recipient": "0x1111111111111111111111111111111111111111",
    },
  });
}

export function parseStructuredIntentOutput(content: string): AgentIntentExtractionResult {
  return AgentIntentExtractionResultSchema.parse(JSON.parse(content));
}
