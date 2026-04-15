export { AgentRuntime } from "./runtime.js";
export { ClaudeProvider } from "./providers/claude.js";
export { OpenAIProvider } from "./providers/openai.js";
export { AGENT_TEMPLATES } from "./templates.js";
export type { LLMProvider, ChatMessage, ToolDefinition, ToolCall, LLMResponse } from "./providers/types.js";
export type { AgentEvent } from "./runtime.js";
export type { AgentTemplate } from "./templates.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AgentRuntime } from "./runtime.js";
export declare function createAgent(config: {
    provider: "claude" | "openai";
    apiKey: string;
    model?: string;
    agentKeypair: Keypair;
    principalPubkey: PublicKey;
    rpcUrl?: string;
    systemPrompt?: string;
    onEvent?: (event: import("./runtime.js").AgentEvent) => void;
}): AgentRuntime;
//# sourceMappingURL=index.d.ts.map