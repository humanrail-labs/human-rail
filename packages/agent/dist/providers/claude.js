"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ClaudeProvider {
    constructor(config) {
        this.client = new sdk_1.default({ apiKey: config.apiKey });
        this.model = config.model ?? "claude-sonnet-4-20250514";
    }
    async chat(params) {
        const anthropicTools = params.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
        }));
        const messages = params.messages.map((m) => {
            if (m.role === "tool") {
                return {
                    role: "user",
                    content: [
                        {
                            type: "tool_result",
                            tool_use_id: m.toolCallId || "unknown",
                            content: m.content,
                        },
                    ],
                };
            }
            return {
                role: m.role,
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
        const toolCalls = [];
        let textContent = "";
        for (const block of response.content) {
            if (block.type === "text") {
                textContent += block.text;
            }
            else if (block.type === "tool_use") {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input,
                });
            }
        }
        return {
            content: textContent || null,
            toolCalls,
        };
    }
}
exports.ClaudeProvider = ClaudeProvider;
//# sourceMappingURL=claude.js.map