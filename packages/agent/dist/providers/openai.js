"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    constructor(config) {
        this.client = new openai_1.default({ apiKey: config.apiKey });
        this.model = config.model ?? "gpt-4o";
    }
    async chat(params) {
        const openaiTools = params.tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const messages = [
            { role: "system", content: params.systemPrompt },
            ...params.messages.map((m) => {
                if (m.role === "tool") {
                    return {
                        role: "tool",
                        tool_call_id: m.toolCallId || "unknown",
                        content: m.content,
                    };
                }
                return {
                    role: m.role,
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
        const toolCalls = message.tool_calls?.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || "{}"),
        })) || [];
        return {
            content: message.content || null,
            toolCalls,
        };
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map