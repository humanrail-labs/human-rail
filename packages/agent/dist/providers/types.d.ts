export interface LLMProvider {
    chat(params: {
        systemPrompt: string;
        messages: ChatMessage[];
        tools: ToolDefinition[];
    }): Promise<LLMResponse>;
}
export interface ChatMessage {
    role: "user" | "assistant" | "tool";
    content: string;
    toolCallId?: string;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
export interface LLMResponse {
    content: string | null;
    toolCalls: ToolCall[];
}
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map