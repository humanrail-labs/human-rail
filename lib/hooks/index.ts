// Re-export all hooks for clean imports
export { useHumanProfile } from "./use-human-profile";
export { useAgents } from "./use-agents";
export { useCapabilities } from "./use-capabilities";
export { useKyc } from "./use-kyc";

// Re-export types
export type { HumanProfile } from "./use-human-profile";
export type { AgentWithPda } from "./use-agents";
export type { Capability } from "./use-capabilities";
export type { KycState, KycStatus } from "./use-kyc";
