import { Keypair, PublicKey } from "@solana/web3.js";
import { HumanRailAgent } from "@humanrail/sdk";
import type { LLMProvider } from "./providers/types.js";
export type AgentEvent = {
    type: "message_received";
    content: string;
} | {
    type: "tool_call";
    tool: string;
    args: Record<string, unknown>;
} | {
    type: "tool_result";
    tool: string;
    result: string;
} | {
    type: "response";
    content: string;
};
export declare class AgentRuntime {
    private provider;
    private executor;
    readonly agent: HumanRailAgent;
    private systemPrompt;
    private conversationHistory;
    private onEvent?;
    constructor(config: {
        llmProvider: LLMProvider;
        agentKeypair: Keypair;
        principalPubkey: PublicKey;
        rpcUrl?: string;
        systemPrompt?: string;
        onEvent?: (event: AgentEvent) => void;
    });
    private buildSystemPrompt;
    processMessage(userMessage: string): Promise<string>;
    resetConversation(): void;
    private emit;
}
//# sourceMappingURL=runtime.d.ts.map