import { z } from "zod";

export const WebhookEventType = z.enum([
  "signature.requested",
  "signature.queued",
  "signature.policy_rejected",
  "signature.guard_approved",
  "signature.ika_pending",
  "signature.signed",
  "signature.failed",
  "agent.frozen",
  "policy.expired",
]);

export type WebhookEventType = z.infer<typeof WebhookEventType>;

export const CreateWebhookSchema = z.object({
  organizationId: z.string().cuid2().optional(),
  url: z.string().url().max(2048),
  events: z.array(WebhookEventType).min(1).max(50),
  secret: z.string().min(16).max(256).optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(WebhookEventType).min(1).max(50).optional(),
  secret: z.string().min(16).max(256).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

export const WebhookEventPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string().datetime(),
  organizationId: z.string(),
  data: z.record(z.unknown()),
});

export type WebhookEventPayload = z.infer<typeof WebhookEventPayloadSchema>;
