/**
 * Webhook event scheduler.
 *
 * Creates WebhookDelivery records for active webhooks matching the event type.
 * Called from API routes and worker job processors.
 */

import { prisma } from "@mandara/db";
import type { Prisma } from "@prisma/client";
import { recordAuditEvent } from "../lib/audit.js";
import { webhookQueue } from "../queues.js";

export interface ScheduleWebhookEventInput {
  organizationId: string;
  eventType: string;
  data: Record<string, unknown>;
  signingRequestId?: string;
}

export async function scheduleWebhookEvent(input: ScheduleWebhookEventInput): Promise<void> {
  const { organizationId, eventType, data, signingRequestId } = input;

  // Find active webhooks that subscribe to this event
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

  await recordAuditEvent({
    organizationId,
    actorType: "system",
    eventType: "webhook_delivery_scheduled",
    resourceType: "signing_request",
    resourceId: signingRequestId,
    summary: `Scheduled ${webhooks.length} webhook delivery(s) for ${eventType}`,
    metadata: { eventType, webhookCount: webhooks.length },
  });
}
