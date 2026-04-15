import type { LLMProvider, ChatMessage, ToolDefinition, LLMResponse } from "./types.js";
export declare class ClaudeProvider implements LLMProvider {
    private client;
    private model;
    constructor(config: {
        apiKey: string;
        model?: string;
    });
    chat(params: {
        systemPrompt: string;
        messages: ChatMessage[];
        tools: ToolDefinition[];
    }): Promise<LLMResponse>;
}
//# sourceMappingURL=claude.d.ts.map