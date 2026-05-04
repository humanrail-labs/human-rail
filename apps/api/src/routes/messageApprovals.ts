import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { success, errorResponse } from "../lib/response.js";

const ListMessageApprovalsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  status: z.enum(["pending", "signed"]).optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function messageApprovalRoutes(fastify: FastifyInstance) {
  fastify.get("/api/message-approvals", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListMessageApprovalsQuery.safeParse(request.query);
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

    const approvals = await prisma.messageApproval.findMany({
      where,
      include: {
        signingRequest: {
          select: {
            id: true,
            requestId: true,
            status: true,
            amount: true,
            asset: true,
            recipient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(approvals);
  });
}
