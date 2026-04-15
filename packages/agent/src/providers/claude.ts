import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ChatMessage, ToolDefinition, LLMResponse } from "./types.js";

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? "claude-sonnet-4-20250514";
  }

  async chat(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<LLMResponse> {
    const anthropicTools = params.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as any,
    }));

    const messages: Anthropic.Messages.MessageParam[] = params.messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: m.toolCallId || "unknown",
              content: m.content,
            } as any,
          ],
        };
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      };
    });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: params.systemPrompt,
      messages,
      tools: anthropicTools,
    });

    const toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = [];
    let textContent = "";

    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content: textContent || null,
      toolCalls,
    };
  }
}
