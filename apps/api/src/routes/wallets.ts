import type { FastifyInstance } from "fastify";
import { success, errorResponse } from "../lib/response.js";

export default async function walletRoutes(fastify: FastifyInstance) {
  fastify.get("/api/wallets", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Wallet list not implemented in P1"));
  });

  fastify.post("/api/wallets/ika", async (request, reply) => {
    return reply.status(501).send(errorResponse("NOT_IMPLEMENTED", "Wallet creation not implemented in P1"));
  });
}
