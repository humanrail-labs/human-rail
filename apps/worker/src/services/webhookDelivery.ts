/**
 * Webhook delivery processor.
 *
 * POSTs signed payloads to webhook URLs with retry logic.
 */

import { prisma } from "@mandara/db";
import { signWebhookPayload } from "@mandara/core";
import { logger } from "../lib/logger.js";
import { recordAuditEvent } from "../lib/audit.js";

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_PREVIEW = 1024;

export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  organizationId: string;
}

export async function processWebhookDeliveryJob(data: WebhookDeliveryJobData): Promise<void> {
  const { deliveryId, webhookId, organizationId } = data;

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery) {
    logger.warn("Webhook delivery not found", { deliveryId });
    return;
  }

  if (!delivery.webhook || delivery.webhook.status !== "active") {
    logger.warn("Webhook inactive or missing", { deliveryId, webhookId });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", error: "Webhook is inactive or deleted" },
    });
    return;
  }

  const rawBody = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(delivery.webhook.secret, timestamp, rawBody);

  let responseStatus: number | undefined;
  let responseBodyPreview: string | undefined;
  let errorMessage: string | undefined;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mandara-Event": delivery.eventType,
        "X-Mandara-Delivery": deliveryId,
        "X-Mandara-Timestamp": String(timestamp),
        "X-Mandara-Signature": `sha256=${signature}`,
        "User-Agent": "Mandara-Webhook/1.0",
      },
      body: rawBody,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    responseStatus = response.status;
    const responseText = await response.text();
    responseBodyPreview = responseText.slice(0, MAX_RESPONSE_PREVIEW);

    if (response.ok) {
      success = true;
    } else {
      errorMessage = `HTTP ${response.status}: ${responseBodyPreview}`;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  if (success) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "delivered",
        responseStatus,
        responseBody: responseBodyPreview,
        deliveredAt: new Date(),
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "system",
      eventType: "webhook_delivery_succeeded",
      resourceType: "webhook",
      resourceId: webhookId,
      summary: `Webhook delivery ${deliveryId} succeeded`,
      metadata: { deliveryId, eventType: delivery.eventType, responseStatus },
    });
  } else {
    const retryCount = delivery.retryCount + 1;
    const status = retryCount >= 3 ? "failed" : "retrying";

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        responseStatus,
        responseBody: responseBodyPreview,
        error: errorMessage,
        retryCount,
        nextRetryAt: status === "retrying" ? new Date(Date.now() + retryCount * 5000) : undefined,
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "system",
      eventType: "webhook_delivery_failed",
      resourceType: "webhook",
      resourceId: webhookId,
      summary: `Webhook delivery ${deliveryId} failed (attempt ${retryCount})`,
      metadata: { deliveryId, eventType: delivery.eventType, error: errorMessage, responseStatus },
    });

    if (status === "retrying") {
      throw new Error(errorMessage ?? "Webhook delivery failed, will retry");
    }
  }
}
