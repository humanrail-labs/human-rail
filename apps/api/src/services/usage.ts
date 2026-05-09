import { prisma } from "@mandara/db";
import type { Prisma } from "@prisma/client";
import { recordAuditEvent } from "../lib/audit.js";
import { currentMonthStart, ensureMandaraSubscription } from "./subscription.js";

export type MandaraUsageType =
  | "agent_chat_message"
  | "signature_request_created"
  | "webhook_delivery";

export async function recordUsage(input: {
  organizationId: string;
  type: MandaraUsageType;
  quantity?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  const subscription = await ensureMandaraSubscription(input.organizationId);
  const event = await prisma.mandaraUsageEvent.create({
    data: {
      organizationId: input.organizationId,
      subscriptionId: subscription.id,
      type: input.type,
      quantity: input.quantity ?? 1,
      source: input.source,
      metadata: input.metadata as Prisma.JsonObject,
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorType: "system",
    eventType: "usage_recorded",
    resourceType: "usage",
    resourceId: event.id,
    summary: `Recorded Mandara usage: ${input.type}`,
    metadata: { type: input.type, quantity: input.quantity ?? 1, source: input.source },
  });

  return event;
}

export async function checkUsageLimit(organizationId: string, type: MandaraUsageType) {
  const subscription = await ensureMandaraSubscription(organizationId);
  const used = await prisma.mandaraUsageEvent.aggregate({
    where: {
      organizationId,
      type,
      createdAt: { gte: currentMonthStart() },
    },
    _sum: { quantity: true },
  });
  const quantity = used._sum.quantity ?? 0;
  const limit =
    type === "agent_chat_message"
      ? subscription.monthlyChatLimit
      : type === "signature_request_created"
        ? subscription.monthlyRequestLimit
        : subscription.monthlyWebhookLimit;

  return {
    allowed: quantity < limit,
    used: quantity,
    limit,
    subscription,
  };
}
