import type { AgentIntentExtractionResult } from "@mandara/core";

export interface AgentIntentParserInput {
  message: string;
  mode?: "assist" | "prepare_signature_request";
}

export interface AgentIntentProviderResult {
  intent: AgentIntentExtractionResult;
  provider: string;
  model: string;
  fallbackUsed?: boolean;
}

export interface AgentIntentProvider {
  name: string;
  model: string;
  extractIntent(input: AgentIntentParserInput): Promise<AgentIntentProviderResult>;
}
