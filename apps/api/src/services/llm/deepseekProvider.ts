import { env } from "../../config.js";
import type { AgentIntentParserInput, AgentIntentProvider } from "./types.js";
import {
  buildMandaraIntentUserMessage,
  MANDARA_AGENT_CHAT_SYSTEM_PROMPT,
  parseStructuredIntentOutput,
} from "./structuredOutput.js";

export class DeepSeekAgentIntentProvider implements AgentIntentProvider {
  name = "deepseek";
  model = env.MANDARA_LLM_MODEL;

  constructor(
    private readonly options: {
      apiKey: string;
      baseUrl: string;
    }
  ) {}

  async extractIntent(input: AgentIntentParserInput) {
    const content = await this.requestJson(input, false).catch(async () => this.requestJson(input, true));
    const intent = parseStructuredIntentOutput(content);
    return { intent, provider: this.name, model: this.model };
  }

  private async requestJson(input: AgentIntentParserInput, retry: boolean) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.MANDARA_LLM_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: MANDARA_AGENT_CHAT_SYSTEM_PROMPT },
            {
              role: "user",
              content: retry
                ? `${buildMandaraIntentUserMessage(input)}\nReturn valid JSON only. No markdown.`
                : buildMandaraIntentUserMessage(input),
            },
          ],
          temperature: 0.1,
          max_tokens: env.MANDARA_LLM_MAX_OUTPUT_TOKENS,
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) {
        throw new Error(`DeepSeek provider failed with status ${response.status}`);
      }
      const body = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("DeepSeek provider returned no content");
      }
      if (retry) {
        parseStructuredIntentOutput(content);
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
}
