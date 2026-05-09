import { z } from "zod";

export const CreateAgentChatSessionInputSchema = z.object({
  organizationId: z.string().cuid2().optional(),
  agentId: z.string().cuid2().optional(),
  title: z.string().min(1).max(160).optional(),
});
export type CreateAgentChatSessionInput = z.infer<typeof CreateAgentChatSessionInputSchema>;

export const SendAgentChatMessageInputSchema = z.object({
  sessionId: z.string().cuid2().optional(),
  organizationId: z.string().cuid2().optional(),
  agentId: z.string().cuid2().optional(),
  message: z.string().min(1).max(4096),
  mode: z.enum(["assist", "prepare_signature_request"]).optional(),
});
export type SendAgentChatMessageInput = z.infer<typeof SendAgentChatMessageInputSchema>;

export const AgentIntentExtractionResultSchema = z.object({
  intentType: z.enum(["signature_request", "question", "unknown", "out_of_scope"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1),
  signatureRequest: z
    .object({
      destinationChainId: z.number().int().positive().nullable().optional(),
      asset: z.string().min(1).max(64).nullable().optional(),
      recipient: z.string().min(1).max(128).nullable().optional(),
      amount: z.string().regex(/^\d+$/).nullable().optional(),
      message: z.string().min(1).max(4096).nullable().optional(),
      policyId: z.string().cuid2().nullable().optional(),
    })
    .optional(),
  missingFields: z.array(z.string()).optional(),
});
export type AgentIntentExtractionResult = z.infer<typeof AgentIntentExtractionResultSchema>;

export const AgentActionProposalResponseSchema = z.object({
  proposalId: z.string().cuid2(),
  status: z.string(),
  naturalLanguageIntent: z.string(),
  structuredInput: z.record(z.string(), z.unknown()),
  policyDecision: z.record(z.string(), z.unknown()).optional(),
  nextAction: z.enum([
    "ask_user_for_missing_fields",
    "user_approve_or_reject",
    "informational",
  ]),
});
export type AgentActionProposalResponse = z.infer<typeof AgentActionProposalResponseSchema>;

export const ApproveAgentProposalInputSchema = z.object({
  proposalId: z.string().cuid2(),
  enqueue: z.boolean().optional(),
});
export type ApproveAgentProposalInput = z.infer<typeof ApproveAgentProposalInputSchema>;

export const RejectAgentProposalInputSchema = z.object({
  proposalId: z.string().cuid2(),
  reason: z.string().max(1000).optional(),
});
export type RejectAgentProposalInput = z.infer<typeof RejectAgentProposalInputSchema>;
