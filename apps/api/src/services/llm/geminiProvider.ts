import { DeterministicAgentIntentProvider } from "./deterministicParser.js";

export class GeminiAgentIntentProvider extends DeterministicAgentIntentProvider {
  name = "deterministic";
  model = "gemini-placeholder-fallback";
}
