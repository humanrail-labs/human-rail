import OpenAI from "openai";
import type { LLMProvider, ChatMessage, ToolDefinition, LLMResponse } from "./types.js";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? "gpt-4o";
  }

  async chat(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<LLMResponse> {
    const openaiTools = params.tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as any,
      },
    }));

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: params.systemPrompt },
      ...params.messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "tool" as const,
            tool_call_id: m.toolCallId || "unknown",
            content: m.content,
          };
        }
        return {
          role: m.role as "user" | "assistant",
          content: m.content,
        };
      }),
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: openaiTools,
    });

    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls =
      message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>,
      })) || [];

    return {
      content: message.content || null,
      toolCalls,
    };
  }
}
