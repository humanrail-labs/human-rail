import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { CreateAgentSchema } from "@mandara/core";
import { success, errorResponse } from "../lib/response.js";
import { recordAuditEvent } from "../lib/audit.js";
import { resolveOrganizationContext } from "../lib/orgContext.js";

const ListAgentsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  status: z.enum(["active", "suspended", "revoked"]).optional(),
  limit: z.string().default("50").transform(Number),
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
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
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

    // Name uniqueness per organization
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
}
