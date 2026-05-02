import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { success, errorResponse } from "../lib/response.js";

const ListAuditEventsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  limit: z.string().default("50").transform(Number),
  cursor: z.string().optional(),
});

export default async function auditEventRoutes(fastify: FastifyInstance) {
  fastify.get("/api/audit-events", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListAuditEventsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, limit } = query.data;

    const where = orgId ? { organizationId: orgId } : {};

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(events);
  });
}
