import { z } from "zod";

export const SigningRequestStatus = z.enum([
  "requested",
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

export const CreateSigningRequestSchema = SigningRequestSchema.pick({
  messageDigest: true,
  messageMetadataDigest: true,
  destinationChainId: true,
  asset: true,
  recipient: true,
  amount: true,
  signatureScheme: true,
}).extend({
  orgId: z.string().cuid2(),
  policyId: z.string().cuid2(),
});

export type CreateSigningRequestInput = z.infer<
  typeof CreateSigningRequestSchema
>;
