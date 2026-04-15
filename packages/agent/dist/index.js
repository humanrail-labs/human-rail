"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_TEMPLATES = exports.OpenAIProvider = exports.ClaudeProvider = exports.AgentRuntime = void 0;
exports.createAgent = createAgent;
var runtime_js_1 = require("./runtime.js");
Object.defineProperty(exports, "AgentRuntime", { enumerable: true, get: function () { return runtime_js_1.AgentRuntime; } });
var claude_js_1 = require("./providers/claude.js");
Object.defineProperty(exports, "ClaudeProvider", { enumerable: true, get: function () { return claude_js_1.ClaudeProvider; } });
var openai_js_1 = require("./providers/openai.js");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_js_1.OpenAIProvider; } });
var templates_js_1 = require("./templates.js");
Object.defineProperty(exports, "AGENT_TEMPLATES", { enumerable: true, get: function () { return templates_js_1.AGENT_TEMPLATES; } });
const runtime_js_2 = require("./runtime.js");
const claude_js_2 = require("./providers/claude.js");
const openai_js_2 = require("./providers/openai.js");
function createAgent(config) {
    const llmProvider = config.provider === "claude"
        ? new claude_js_2.ClaudeProvider({ apiKey: config.apiKey, model: config.model })
        : new openai_js_2.OpenAIProvider({ apiKey: config.apiKey, model: config.model });
    return new runtime_js_2.AgentRuntime({
        llmProvider,
        agentKeypair: config.agentKeypair,
        principalPubkey: config.principalPubkey,
        rpcUrl: config.rpcUrl,
        systemPrompt: config.systemPrompt,
        onEvent: config.onEvent,
    });
}
//# sourceMappingURL=index.js.map