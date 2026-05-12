import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { CreateAgentSchema, UpdateAgentSchema, UpdateAgentStatusSchema } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";
import { generateAgentApiKey } from "../lib/apiKeys.js";

const ListAgentsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  status: z.enum(["active", "suspended", "revoked"]).optional(),
  limit: z.string().default("50").transform(Number),
});

const CreateAgentApiKeyBody = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

export default async function agentRoutes(fastify: FastifyInstance) {
  fastify.get("/api/agents", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListAgentsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, status, limit } = query.data;
    const effectiveOrgId = orgId ?? user.organizationIds[0];
    if (!effectiveOrgId || !user.organizationIds.includes(effectiveOrgId)) {
      return reply.status(403).send(errorResponse("FORBIDDEN", "Not a member of this organization"));
    }

    const where: Record<string, unknown> = { organizationId: effectiveOrgId };
    if (status) where.status = status;

    const agents = await prisma.agent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(agents);
  });

  fastify.post("/api/agents", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const parse = CreateAgentSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const { organizationId: explicitOrgId, name, description } = parse.data;

    const { organizationId } = await resolveOrganizationContext(request, explicitOrgId);

    const existing = await prisma.agent.findFirst({
      where: { organizationId, name },
    });
    if (existing) {
      return reply.status(409).send(errorResponse("CONFLICT", `Agent "${name}" already exists in this organization`));
    }

    const agent = await prisma.agent.create({
      data: {
        organizationId,
        name,
        description,
        status: "active",
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "agent_created",
      resourceType: "agent",
      resourceId: agent.id,
      summary: `Created agent ${name}`,
    });

    return reply.status(201).send(success(agent));
  });

  fastify.patch("/api/agents/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const parse = UpdateAgentSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, agent.organizationId);

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        name: parse.data.name,
        description: parse.data.description,
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "agent_updated",
      resourceType: "agent",
      resourceId: id,
      summary: `Updated agent ${updated.name}`,
    });

    return success(updated);
  });

  fastify.patch("/api/agents/:id/status", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const parse = UpdateAgentStatusSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, agent.organizationId);

    const newStatus = parse.data.status;
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "suspended") {
      updateData.frozenAt = new Date();
    } else if (newStatus === "active") {
      updateData.frozenAt = null;
    } else if (newStatus === "revoked") {
      updateData.revokedAt = new Date();
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: updateData,
    });

    const eventType = newStatus === "suspended" ? "agent_frozen" : newStatus === "revoked" ? "agent_revoked" : "agent_updated";
    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType,
      resourceType: "agent",
      resourceId: id,
      summary: `${newStatus === "suspended" ? "Suspended" : newStatus === "revoked" ? "Revoked" : "Reactivated"} agent ${updated.name}`,
      metadata: { previousStatus: agent.status, newStatus },
    });

    return success(updated);
  });

  fastify.delete("/api/agents/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, agent.organizationId);

    await prisma.agent.delete({ where: { id } });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "agent_updated",
      resourceType: "agent",
      resourceId: id,
      summary: `Deleted agent ${agent.name}`,
    });

    return reply.status(204).send();
  });

  // ── Agent API Key Management ──

  fastify.post("/api/agents/:id/api-keys", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id: agentId } = request.params as { id: string };

    const parse = CreateAgentApiKeyBody.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        )
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { apiKeys: true },
    });

    if (!agent) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, agent.organizationId);

    const { name, expiresAt } = parse.data;
    const keyGen = generateAgentApiKey();

    const apiKey = await prisma.agentApiKey.create({
      data: {
        agentId,
        name,
        prefix: keyGen.prefix,
        hash: keyGen.hash,
        scopes: ["sign"],
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "api_key_created",
      resourceType: "api_key",
      resourceId: apiKey.id,
      summary: `Created API key "${name}" for agent ${agent.name}`,
      metadata: { prefix: keyGen.prefix, agentId },
    });

    return reply.status(201).send(
      success({
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        keyPreview: `${keyGen.prefix}…${keyGen.lastFour}`,
        rawKey: keyGen.rawKey,
        createdAt: apiKey.createdAt.toISOString(),
        expiresAt: apiKey.expiresAt?.toISOString(),
      })
    );
  });

  fastify.get("/api/agents/:id/api-keys", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id: agentId } = request.params as { id: string };

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Agent not found"));
    }

    await resolveOrganizationContext(request, agent.organizationId);

    const keys = await prisma.agentApiKey.findMany({
      where: { agentId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return success(keys);
  });

  fastify.delete("/api/agents/:id/api-keys/:keyId", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id: agentId, keyId } = request.params as { id: string; keyId: string };

    const apiKey = await prisma.agentApiKey.findFirst({
      where: { id: keyId, agentId },
      include: { agent: true },
    });

    if (!apiKey) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "API key not found"));
    }

    const { organizationId } = await resolveOrganizationContext(request, apiKey.agent.organizationId);

    const updated = await prisma.agentApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    await recordAuditEvent({
      organizationId,
      actorType: "user",
      actorId: user.id,
      eventType: "api_key_revoked",
      resourceType: "api_key",
      resourceId: keyId,
      summary: `Revoked API key "${apiKey.name}" for agent ${apiKey.agent.name}`,
      metadata: { prefix: apiKey.prefix, agentId },
    });

    return success(updated);
  });
}
