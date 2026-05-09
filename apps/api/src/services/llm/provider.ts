import { env } from "../../config.js";
import { DeterministicAgentIntentProvider } from "./deterministicParser.js";
import { DeepSeekAgentIntentProvider } from "./deepseekProvider.js";
import { GeminiAgentIntentProvider } from "./geminiProvider.js";
import { GroqAgentIntentProvider } from "./groqProvider.js";
import type { AgentIntentProvider } from "./types.js";

export function createAgentIntentProvider(): AgentIntentProvider {
  if (env.MANDARA_LLM_ENABLED !== "true") {
    return new DeterministicAgentIntentProvider();
  }

  const provider = env.MANDARA_LLM_PROVIDER.toLowerCase();
  if (provider === "deepseek" && env.MANDARA_LLM_API_KEY) {
    return new DeepSeekAgentIntentProvider({
      apiKey: env.MANDARA_LLM_API_KEY,
      baseUrl: env.MANDARA_LLM_BASE_URL,
    });
  }

  if (provider === "gemini" && env.MANDARA_LLM_GEMINI_API_KEY) {
    return new GeminiAgentIntentProvider();
  }

  if (provider === "groq" && env.MANDARA_LLM_GROQ_API_KEY) {
    return new GroqAgentIntentProvider();
  }

  return new DeterministicAgentIntentProvider();
}
