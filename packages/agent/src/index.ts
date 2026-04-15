export { AgentRuntime } from "./runtime.js";
export { ClaudeProvider } from "./providers/claude.js";
export { OpenAIProvider } from "./providers/openai.js";
export { AGENT_TEMPLATES } from "./templates.js";
export type { LLMProvider, ChatMessage, ToolDefinition, ToolCall, LLMResponse } from "./providers/types.js";
export type { AgentEvent } from "./runtime.js";
export type { AgentTemplate } from "./templates.js";

import { Keypair, PublicKey } from "@solana/web3.js";
import { AgentRuntime } from "./runtime.js";
import { ClaudeProvider } from "./providers/claude.js";
import { OpenAIProvider } from "./providers/openai.js";

export function createAgent(config: {
  provider: "claude" | "openai";
  apiKey: string;
  model?: string;
  agentKeypair: Keypair;
  principalPubkey: PublicKey;
  rpcUrl?: string;
  systemPrompt?: string;
  onEvent?: (event: import("./runtime.js").AgentEvent) => void;
}): AgentRuntime {
  const llmProvider =
    config.provider === "claude"
      ? new ClaudeProvider({ apiKey: config.apiKey, model: config.model })
      : new OpenAIProvider({ apiKey: config.apiKey, model: config.model });

  return new AgentRuntime({
    llmProvider,
    agentKeypair: config.agentKeypair,
    principalPubkey: config.principalPubkey,
    rpcUrl: config.rpcUrl,
    systemPrompt: config.systemPrompt,
    onEvent: config.onEvent,
  });
}
