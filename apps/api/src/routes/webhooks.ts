import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { Prisma } from "@prisma/client";
import { CreateWebhookSchema, UpdateWebhookSchema, generateWebhookSecret } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";
import { encrypt } from "@mandara/core";
import { requireEncryptionPassword } from "../config.js";

const ListWebhooksQuery = z.object({
  orgId: z.string().cuid2().optional(),
  limit: z.string().default("50").transform(Number),
});

function webhookEncryptionConfigError() {
  return errorResponse(
    "WEBHOOK_ENCRYPTION_NOT_CONFIGURED",
    "Webhook secret encryption is not configured. Set MANDARA_ENCRYPTION_PASSWORD."
  );
}

function getWebhookMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

function needsSecretRotation(webhook: {
  iv: string | null;
  tag: string | null;
  metadata?: unknown;
}): boolean {
  const metadata = getWebhookMetadata(webhook.metadata);
  return !webhook.iv || !webhook.tag || metadata.needsSecretRotation === true;
}

export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.get("/api/webhooks", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListWebhooksQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, limit } = query.data;
    const { organizationId } = await resolveOrganizationContext(request, orgId);

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        iv: true,
        tag: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(webhooks.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      needsSecretRotation: needsSecretRotation(webhook),
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    })));
  });

  fastify.post("/api/webhooks", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = CreateWebhookSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const { organizationId: explicitOrgId, url, events, secret, isActive } = parse.data;
    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    const rawSecret = secret ?? generateWebhookSecret();
    let encryptionPassword: string;
    try {
      encryptionPassword = requireEncryptionPassword();
    } catch {
      return reply.status(500).send(
        webhookEncryptionConfigError()
      );
    }
    const encrypted = encrypt(rawSecret, encryptionPassword);

    const webhook = await prisma.webhook.create({
      data: {
        organizationId,
        url,
        events,
        secret: encrypted.value,
        iv: encrypted.iv,
        tag: encrypted.tag,
        metadata: { encryptedAt: new Date().toISOString(), encryptionVersion: "aes-256-gcm-v1" },
        status: isActive ? "active" : "paused",
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "webhook_created",
      resourceType: "webhook",
      resourceId: webhook.id,
      summary: `Created webhook ${url}`,
      metadata: { events, url },
    });

    return reply.status(201).send(
      success({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        needsSecretRotation: false,
        secret: rawSecret,
        createdAt: webhook.createdAt.toISOString(),
      })
    );
  });

  fastify.get("/api/webhooks/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            eventType: true,
            status: true,
            responseStatus: true,
            attemptedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!webhook) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Webhook not found"));
    }

    await resolveOrganizationContext(request, webhook.organizationId);

    return success({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      needsSecretRotation: needsSecretRotation(webhook),
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
      deliveries: webhook.deliveries,
    });
  });

  fastify.patch("/api/webhooks/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Webhook not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, webhook.organizationId);

    const parse = UpdateWebhookSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const { url, events, secret, isActive } = parse.data;

    let newSecret: string | undefined;
    const updateData: Record<string, unknown> = {};
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.status = isActive ? "active" : "paused";
    if (secret !== undefined) {
      newSecret = secret;
      let encryptionPassword: string;
      try {
        encryptionPassword = requireEncryptionPassword();
      } catch {
        return reply.status(500).send(
          webhookEncryptionConfigError()
        );
      }
      const encrypted = encrypt(secret, encryptionPassword);
      const metadata = getWebhookMetadata(webhook.metadata);
      updateData.secret = encrypted.value;
      updateData.iv = encrypted.iv;
      updateData.tag = encrypted.tag;
      updateData.metadata = {
        ...metadata,
        needsSecretRotation: false,
        rotatedAt: new Date().toISOString(),
        encryptionVersion: "aes-256-gcm-v1",
      } satisfies Prisma.InputJsonValue;
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: updateData,
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "webhook_updated",
      resourceType: "webhook",
      resourceId: id,
      summary: `Updated webhook ${updated.url}`,
      metadata: { url: updated.url, events: updated.events },
    });

    return success({
      id: updated.id,
      url: updated.url,
      events: updated.events,
      status: updated.status,
      needsSecretRotation: needsSecretRotation(updated),
      secret: newSecret,
      updatedAt: updated.updatedAt.toISOString(),
    });
  });

  fastify.post("/api/webhooks/:id/rotate-secret", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Webhook not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, webhook.organizationId);

    let encryptionPassword: string;
    try {
      encryptionPassword = requireEncryptionPassword();
    } catch {
      return reply.status(500).send(webhookEncryptionConfigError());
    }

    const rawSecret = generateWebhookSecret();
    const encrypted = encrypt(rawSecret, encryptionPassword);
    const metadata = getWebhookMetadata(webhook.metadata);

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        secret: encrypted.value,
        iv: encrypted.iv,
        tag: encrypted.tag,
        metadata: {
          ...metadata,
          needsSecretRotation: false,
          rotatedAt: new Date().toISOString(),
          encryptionVersion: "aes-256-gcm-v1",
        } satisfies Prisma.InputJsonValue,
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "webhook_updated",
      resourceType: "webhook",
      resourceId: id,
      summary: `Rotated webhook secret for ${updated.url}`,
      metadata: { url: updated.url, rotation: true },
    });

    return success({
      id: updated.id,
      url: updated.url,
      events: updated.events,
      status: updated.status,
      needsSecretRotation: false,
      secret: rawSecret,
      updatedAt: updated.updatedAt.toISOString(),
    });
  });

  fastify.delete("/api/webhooks/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Webhook not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, webhook.organizationId);

    await prisma.webhook.update({
      where: { id },
      data: { status: "paused" },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "webhook_deleted",
      resourceType: "webhook",
      resourceId: id,
      summary: `Deleted (paused) webhook ${webhook.url}`,
      metadata: { url: webhook.url },
    });

    return success({ id, deleted: true });
  });
}
