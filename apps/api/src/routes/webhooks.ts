import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { CreateWebhookSchema, UpdateWebhookSchema, generateWebhookSecret } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";

const ListWebhooksQuery = z.object({
  orgId: z.string().cuid2().optional(),
  limit: z.string().default("50").transform(Number),
});

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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(webhooks);
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

    const webhook = await prisma.webhook.create({
      data: {
        organizationId,
        url,
        events,
        secret: rawSecret,
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
      updateData.secret = secret;
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
      secret: newSecret,
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
