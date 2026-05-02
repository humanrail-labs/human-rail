import { z } from "zod";

export const AgentStatus = z.enum(["active", "suspended", "revoked"]);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const AgentSchema = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: AgentStatus.default("active"),
  onChainAgentPda: z.string().optional(),
  onChainProfilePda: z.string().optional(),
  onChainCapabilityPda: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Agent = z.infer<typeof AgentSchema>;

export const CreateAgentSchema = AgentSchema.pick({
  name: true,
  description: true,
}).extend({
  orgId: z.string().cuid2(),
  onChainAgentPda: z.string().optional(),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
