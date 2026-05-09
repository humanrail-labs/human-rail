#!/usr/bin/env node
/**
 * Optional live LLM smoke for Agent Chat. Disabled by default.
 */

if (
  process.env.MANDARA_LLM_LIVE_SMOKE !== "true" ||
  process.env.MANDARA_LLM_ENABLED !== "true" ||
  !process.env.MANDARA_LLM_API_KEY
) {
  console.log("Skipping live Agent Chat LLM smoke. Set MANDARA_LLM_LIVE_SMOKE=true, MANDARA_LLM_ENABLED=true, and MANDARA_LLM_API_KEY.");
  process.exit(0);
}

console.log("Live LLM smoke uses the normal product Agent Chat smoke path.");
await import("./product-agent-chat-smoke.mjs");
