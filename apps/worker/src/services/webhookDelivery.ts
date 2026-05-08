/**
 * Webhook delivery processor.
 *
 * POSTs signed payloads to webhook URLs with retry logic.
 */

import { prisma } from "@mandara/db";
import { signWebhookPayload, decrypt } from "@mandara/core";
import { isDev, requireEncryptionPassword } from "../config.js";
import { logger } from "../lib/logger.js";
import { recordAuditEvent } from "../lib/audit.js";

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_PREVIEW = 1024;

export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  organizationId: string;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // AWS metadata
]);

function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:") {
      return isDev && url.protocol === "http:" && BLOCKED_HOSTS.has(hostname);
    }
    if (BLOCKED_HOSTS.has(hostname)) return false;
    if (hostname.endsWith(".local")) return false;
    if (hostname.endsWith(".internal")) return false;
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
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

  // Verify organization matches job data to prevent cross-org job injection
  if (delivery.webhook.organizationId !== organizationId) {
    logger.warn("Organization mismatch in webhook delivery job", {
      expected: organizationId,
      actual: delivery.webhook.organizationId,
      deliveryId,
    });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", error: "Organization mismatch" },
    });
    return;
  }

  // Validate URL to prevent SSRF
  if (!isUrlAllowed(delivery.webhook.url)) {
    logger.warn("Blocked webhook URL", { url: delivery.webhook.url });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", error: "URL not allowed" },
    });
    return;
  }

  // Decrypt webhook secret before signing
  if (!delivery.webhook.iv || !delivery.webhook.tag) {
    logger.warn("Webhook secret rotation required before delivery", { webhookId });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", error: "webhook_secret_rotation_required" },
    });
    return;
  }

  let webhookSecret: string;
  try {
    webhookSecret = decrypt(
      {
        value: delivery.webhook.secret,
        iv: delivery.webhook.iv,
        tag: delivery.webhook.tag,
      },
      requireEncryptionPassword()
    );
  } catch {
    logger.error("Failed to decrypt webhook secret", { webhookId });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "failed", error: "Webhook secret decryption failed" },
    });
    return;
  }

  const rawBody = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(webhookSecret, timestamp, rawBody);

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
