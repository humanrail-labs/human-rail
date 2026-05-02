import { z } from "zod";

export const SigningRequestStatus = z.enum([
  "requested",
  "queued",
  "worker_processing",
  "policy_rejected",
  "guard_approved",
  "ika_pending",
  "signed",
  "failed",
]);
export type SigningRequestStatus = z.infer<typeof SigningRequestStatus>;

export const SigningRequestSchema = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  agentId: z.string().cuid2(),
  policyId: z.string().cuid2(),
  requestId: z.string(),
  messageDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  messageMetadataDigest: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  destinationChainId: z.number().int().positive(),
  asset: z.string(),
  recipient: z.string(),
  amount: z.string().regex(/^\d+$/),
  signatureScheme: z.enum(["EcdsaKeccak256", "EcdsaDoubleSha256", "EddsaSha512"]),
  status: SigningRequestStatus.default("requested"),
  rejectionCode: z.number().int().optional(),
  rejectionReason: z.string().optional(),
  onChainRequestPda: z.string().optional(),
  onChainMessageApprovalPda: z.string().optional(),
  signatureHex: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SigningRequest = z.infer<typeof SigningRequestSchema>;

export const PreviewSigningRequestSchema = z.object({
  organizationId: z.string().cuid2().optional(),
  agentId: z.string().cuid2(),
  policyId: z.string().cuid2(),
  destinationChainId: z.number().int().positive(),
  asset: z.string().min(1).max(32),
  recipient: z.string().min(1).max(128),
  amount: z.string().regex(/^\d+$/),
  message: z.string().min(1).max(4096),
});

export type PreviewSigningRequestInput = z.infer<typeof PreviewSigningRequestSchema>;

export const CreateSigningRequestSchema = PreviewSigningRequestSchema.extend({
  persistIfRejected: z.boolean().optional(),
});

export type CreateSigningRequestInput = z.infer<typeof CreateSigningRequestSchema>;

