import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { success, errorResponse } from "../lib/response.js";

const ListPoliciesQuery = z.object({
  orgId: z.string().cuid2().optional(),
  agentId: z.string().cuid2().optional(),
  status: z.enum(["active", "frozen", "expired", "revoked"]).optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function policyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/policies", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListPoliciesQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, agentId, status, limit } = query.data;
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const policies = await prisma.guardedPolicy.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        ikaDwallet: { select: { id: true, name: true, onChainPda: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(policies);
  });

  fastify.post("/api/policies", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Policy creation not implemented in P2"));
  });
}
