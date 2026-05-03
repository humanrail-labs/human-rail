import { z } from "zod";

export const CreateAgentApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

export type CreateAgentApiKeyInput = z.infer<typeof CreateAgentApiKeySchema>;

export const AgentApiKeyCreatedResponseSchema = z.object({
  id: z.string().cuid2(),
  name: z.string(),
  prefix: z.string(),
  keyPreview: z.string(),
  rawKey: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export type AgentApiKeyCreatedResponse = z.infer<
  typeof AgentApiKeyCreatedResponseSchema
>;

export const ExternalSignatureRequestInputSchema = z.object({
  destinationChainId: z.number().int().positive(),
  asset: z.string().min(1).max(32),
  recipient: z.string().min(1).max(128),
  amount: z.string().regex(/^\d+$/),
  message: z.string().min(1).max(4096),
  policyId: z.string().cuid2().optional(),
  enqueue: z.boolean().optional(),
  idempotencyKey: z.string().min(1).max(128).optional(),
});

export type ExternalSignatureRequestInput = z.infer<
  typeof ExternalSignatureRequestInputSchema
>;

export const ExternalSignatureRequestResponseSchema = z.object({
  id: z.string().cuid2(),
  status: z.string(),
  policyDecision: z.object({
    allowed: z.boolean(),
    reason: z.string(),
    rejectionCode: z.string().optional(),
    computed: z.object({
      assetHash: z.string(),
      recipientHash: z.string(),
      messageDigest: z.string(),
    }),
    limits: z.object({
      perTxLimit: z.string(),
      dailyLimit: z.string(),
      totalLimit: z.string(),
      requestedAmount: z.string(),
    }),
  }),
  execution: z
    .object({
      jobId: z.string().optional(),
      queue: z.string(),
      status: z.string(),
    })
    .optional(),
  messageDigest: z.string(),
  signingRequest: z.record(z.unknown()).optional(),
});

export type ExternalSignatureRequestResponse = z.infer<
  typeof ExternalSignatureRequestResponseSchema
>;
