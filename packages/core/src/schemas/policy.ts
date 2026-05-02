import { z } from "zod";

export const PolicyStatus = z.enum([
  "active",
  "frozen",
  "expired",
  "revoked",
]);
export type PolicyStatus = z.infer<typeof PolicyStatus>;

export const GuardedPolicySchema = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  agentId: z.string().cuid2(),
  ikaDwalletId: z.string().cuid2(),
  name: z.string().optional(),
  guardedDwalletPda: z.string().optional(),
  allowedChainId: z.number().int().positive(),
  allowedAsset: z.string().min(1).max(32),
  allowedRecipient: z.string().min(1).max(128),
  perTxLimit: z.string().regex(/^\d+$/),
  dailyLimit: z.string().regex(/^\d+$/),
  totalLimit: z.string().regex(/^\d+$/).optional().default("0"),
  dailySpent: z.string().regex(/^\d+$/).default("0"),
  totalSpent: z.string().regex(/^\d+$/).default("0"),
  expiresAt: z.string().datetime(),
  status: PolicyStatus.default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GuardedPolicy = z.infer<typeof GuardedPolicySchema>;

export const CreatePolicySchema = GuardedPolicySchema.pick({
  allowedChainId: true,
  allowedAsset: true,
  allowedRecipient: true,
  perTxLimit: true,
  dailyLimit: true,
  totalLimit: true,
  expiresAt: true,
}).extend({
  orgId: z.string().cuid2(),
  agentId: z.string().cuid2(),
  walletId: z.string().cuid2(),
  name: z.string().optional(),
});

export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;
