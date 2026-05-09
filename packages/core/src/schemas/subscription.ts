import { z } from "zod";

export const MandaraPlanCodeSchema = z.enum(["dev_free", "builder", "team", "enterprise"]);
export type MandaraPlanCode = z.infer<typeof MandaraPlanCodeSchema>;

export const SubscriptionStatusSchema = z.enum(["trial", "active", "past_due", "canceled", "expired"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const DevUpgradeSubscriptionInputSchema = z.object({
  organizationId: z.string().cuid2().optional(),
  planCode: MandaraPlanCodeSchema,
});
export type DevUpgradeSubscriptionInput = z.infer<typeof DevUpgradeSubscriptionInputSchema>;
