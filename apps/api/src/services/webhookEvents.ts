import { prisma } from "@mandara/db";
import type { Prisma } from "@prisma/client";
import { webhookQueue } from "./webhookQueue.js";

export interface ScheduleWebhookEventInput {
  organizationId: string;
  eventType: string;
  data: Record<string, unknown>;
  signingRequestId?: string;
}

export async function scheduleWebhookEvent(input: ScheduleWebhookEventInput): Promise<void> {
  const { organizationId, eventType, data } = input;

  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId,
      status: "active",
      events: { has: eventType },
    },
  });

  if (webhooks.length === 0) return;

  const payload = {
    id: crypto.randomUUID(),
    type: eventType,
    createdAt: new Date().toISOString(),
    organizationId,
    data,
  };

  for (const webhook of webhooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        organizationId,
        webhookId: webhook.id,
        eventType,
        payload: payload as unknown as Prisma.JsonObject,
        status: "pending",
      },
    });

    await webhookQueue.add("deliver-webhook", {
      deliveryId: delivery.id,
      webhookId: webhook.id,
      organizationId,
    });
  }
}
