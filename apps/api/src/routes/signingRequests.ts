import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { success, errorResponse } from "../lib/response.js";

const ListSigningRequestsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  agentId: z.string().cuid2().optional(),
  policyId: z.string().cuid2().optional(),
  status: z.enum(["requested", "policy_rejected", "guard_approved", "ika_pending", "signed", "failed"]).optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function signingRequestRoutes(fastify: FastifyInstance) {
  fastify.get("/api/signing-requests", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListSigningRequestsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, agentId, policyId, status, limit } = query.data;
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (agentId) where.agentId = agentId;
    if (policyId) where.policyId = policyId;
    if (status) where.status = status;

    const requests = await prisma.signingRequest.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        policy: { select: { id: true, name: true, onChainPda: true } },
        messageApproval: {
          select: {
            id: true,
            onChainPda: true,
            status: true,
            signatureLength: true,
            signatureHex: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(requests);
  });

  fastify.get("/api/signing-requests/:id", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const { id } = request.params as { id: string };
    const signingRequest = await prisma.signingRequest.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true } },
        policy: { select: { id: true, name: true, onChainPda: true } },
        ikaDwallet: { select: { id: true, name: true, onChainPda: true } },
        messageApproval: true,
      },
    });

    if (!signingRequest) {
      return reply.status(404).send(errorResponse("NOT_FOUND", "Signing request not found"));
    }

    return success(signingRequest);
  });

  fastify.post("/api/signing-requests", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Signing request creation not implemented in P2"));
  });
}
