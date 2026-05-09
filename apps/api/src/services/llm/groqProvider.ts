import { DeterministicAgentIntentProvider } from "./deterministicParser.js";

export class GroqAgentIntentProvider extends DeterministicAgentIntentProvider {
  name = "deterministic";
  model = "groq-placeholder-fallback";
}
