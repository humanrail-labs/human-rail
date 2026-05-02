import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@mandara/db";
import { success, errorResponse } from "../lib/response.js";

const ListWalletsQuery = z.object({
  orgId: z.string().cuid2().optional(),
  state: z.string().optional(),
  limit: z.string().default("50").transform(Number),
});

export default async function walletRoutes(fastify: FastifyInstance) {
  fastify.get("/api/wallets", async (request, reply) => {
    const user = request.devUser;
    if (!user) {
      return reply.status(401).send(errorResponse("UNAUTHORIZED", "Missing dev auth"));
    }

    const query = ListWalletsQuery.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("VALIDATION_ERROR", "Invalid query parameters"));
    }

    const { orgId, state, limit } = query.data;
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (state) where.state = state;

    const wallets = await prisma.ikaDwallet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return success(wallets);
  });

  fastify.post("/api/wallets/ika", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Wallet creation not implemented in P2"));
  });
}
