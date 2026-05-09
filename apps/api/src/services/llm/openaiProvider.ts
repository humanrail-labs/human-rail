import { AgentIntentExtractionResultSchema } from "@mandara/core";
import type { AgentIntentParserInput, AgentIntentProvider } from "./types.js";

const SYSTEM_PROMPT = `You are a Mandara agent assistant.
You do not sign transactions.
You do not enqueue execution.
You do not bypass mandates.
You only prepare structured signature request proposals.
You must explain that Mandara is devnet beta and Ika is pre-alpha/mock signer when execution is discussed.
You must never ask for seed phrases, private keys, service wallets, API secrets, or raw keypairs.
You must output only JSON matching the schema.`;

export class OpenAiAgentIntentProvider implements AgentIntentProvider {
  name = "openai";
  model: string;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      baseUrl?: string;
    }
  ) {
    this.model = options.model;
  }

  async extractIntent(input: AgentIntentParserInput) {
    const baseUrl = this.options.baseUrl || "https://api.openai.com/v1";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              message: input.message,
              mode: input.mode ?? "assist",
              schema: {
                intentType: "signature_request | question | unknown",
                confidence: "number 0..1",
                explanation: "string",
                signatureRequest: {
                  destinationChainId: "number optional",
                  asset: "string optional",
                  recipient: "string optional",
                  amount: "integer string optional",
                  message: "string optional",
                  policyId: "string optional",
                },
                missingFields: "string[] optional",
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM provider failed with status ${response.status}`);
    }

    const body = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM provider returned no content");
    }

    const intent = AgentIntentExtractionResultSchema.parse(JSON.parse(content));
    return { intent, provider: this.name, model: this.model };
  }
}
